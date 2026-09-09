"use client";

import { useActionState } from "react";
import { queueCampaignAction } from "@/app/actions/admin";
import type { FormState } from "@/app/actions/marketing";
import { Button } from "@/components/ui";

const initial: FormState = { status: "idle" };

export function QueueCampaign({ campaignId }: { campaignId: string }) {
  const [state, action, pending] = useActionState(queueCampaignAction, initial);

  return (
    <form action={action} className="flex items-center gap-3">
      <input type="hidden" name="campaignId" value={campaignId} />
      <Button type="submit" variant="outline" className="px-4 py-2" disabled={pending}>
        {pending ? "…" : "Queue"}
      </Button>
      {state.message ? (
        <span
          className={`text-xs ${state.status === "error" ? "text-red-300" : "text-accent"}`}
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
