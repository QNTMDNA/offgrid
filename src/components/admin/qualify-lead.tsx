"use client";

import { useActionState, useState } from "react";
import { qualifyLeadAction } from "@/app/actions/admin";
import type { FormState } from "@/app/actions/marketing";
import { Button, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

export type EditionOption = { id: string; label: string; currency: string };

export function QualifyLead({
  leadId,
  editions,
}: {
  leadId: string;
  editions: EditionOption[];
}) {
  const [state, action, pending] = useActionState(qualifyLeadAction, initial);
  const [editionId, setEditionId] = useState(editions[0]?.id ?? "");
  const currency = editions.find((e) => e.id === editionId)?.currency ?? "USD";

  if (editions.length === 0) {
    return <span className="text-xs text-paper/40">No open editions</span>;
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input type="hidden" name="leadId" value={leadId} />
      <input type="hidden" name="currency" value={currency} />
      <select
        className={`${inputClass} w-40 py-2`}
        name="editionId"
        value={editionId}
        onChange={(event) => setEditionId(event.target.value)}
        aria-label="Race edition"
      >
        {editions.map((edition) => (
          <option key={edition.id} value={edition.id} className="bg-ink">
            {edition.label}
          </option>
        ))}
      </select>
      <input
        className={`${inputClass} w-28 py-2`}
        type="number"
        name="amount"
        min={0}
        step={500}
        placeholder={currency}
        aria-label="Amount"
        required
      />
      <input
        className={`${inputClass} w-40 py-2`}
        type="date"
        name="closeDate"
        aria-label="Close date"
        required
      />
      <Button type="submit" variant="outline" className="px-4 py-2" disabled={pending}>
        {pending ? "…" : "Convert"}
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
