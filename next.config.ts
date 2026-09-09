import type { NextConfig } from "next";
import { legacyRedirects } from "./src/lib/legacy-redirects";

/**
 * Server Actions are rejected when the forwarded host differs from the origin,
 * which is the case behind any proxy or preview domain.
 */
function actionOrigins(): string[] {
  const configured = (process.env.SERVER_ACTION_ORIGINS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  const appUrl = process.env.APP_URL;
  if (appUrl) {
    try {
      configured.push(new URL(appUrl).host);
    } catch {
      // APP_URL is validated at runtime; ignore it here when malformed.
    }
  }

  return Array.from(new Set(configured));
}

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      allowedOrigins: actionOrigins(),
      // Deck and race-artwork uploads go through Server Actions; the 1 MB
      // default rejects them before the size checks in the storage layer.
      bodySizeLimit: "64mb",
    },
  },
  async redirects() {
    return legacyRedirects;
  },
};

export default nextConfig;
