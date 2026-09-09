"use client";

import { useEffect } from "react";

const UTM_KEYS = ["utm_source", "utm_medium", "utm_campaign"];

/**
 * Records a first-touch only when the landing actually carries campaign
 * parameters or an external referrer, so ordinary navigation costs no request.
 */
export function Attribution() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasCampaign = UTM_KEYS.some((key) => params.has(key));
    const referrer = document.referrer;
    const external =
      referrer && new URL(referrer, window.location.href).host !== window.location.host;
    if (!hasCampaign && !external) return;

    void fetch("/api/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        path: window.location.pathname,
        search: window.location.search,
        referrer: external ? referrer : undefined,
      }),
      keepalive: true,
    }).catch(() => undefined);
  }, []);

  return null;
}
