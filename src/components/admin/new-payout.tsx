"use client";

import { useActionState, useState } from "react";
import { createPayoutAction } from "@/app/actions/admin";
import type { FormState } from "@/app/actions/marketing";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

const SOURCE_CURRENCIES = ["USD", "EUR", "GBP", "AED"];

export type PartnerOption = { id: string; label: string; currency: string };

export function NewPayout({ partners }: { partners: PartnerOption[] }) {
  const [state, action, pending] = useActionState(createPayoutAction, initial);
  const [partnerId, setPartnerId] = useState(partners[0]?.id ?? "");
  const targetCurrency = partners.find((p) => p.id === partnerId)?.currency ?? "EUR";

  if (partners.length === 0) return null;

  return (
    <form action={action} className="space-y-6 border border-paper/15 p-6">
      <p className="eyebrow text-paper/40">New payout</p>
      <input type="hidden" name="targetCurrency" value={targetCurrency} />
      <div className="grid gap-6 md:grid-cols-3">
        <Field label="Partner">
          <select
            className={inputClass}
            name="partnerId"
            value={partnerId}
            onChange={(event) => setPartnerId(event.target.value)}
          >
            {partners.map((partner) => (
              <option key={partner.id} value={partner.id} className="bg-ink">
                {partner.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label={`Amount (${targetCurrency})`} hint="Amount the partner receives.">
          <input
            className={inputClass}
            type="number"
            name="amount"
            min={1}
            step={100}
            required
          />
        </Field>
        <Field label="Pay from">
          <select className={inputClass} name="sourceCurrency" defaultValue="USD">
            {SOURCE_CURRENCIES.map((code) => (
              <option key={code} value={code} className="bg-ink">
                {code} balance
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Queuing…" : "Queue payout"}
      </Button>
      {state.message ? (
        <Notice tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}
