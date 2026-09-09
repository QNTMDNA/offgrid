"use client";

import { useActionState } from "react";
import { checkoutAction } from "@/app/actions/commerce";
import type { FormState } from "@/app/actions/marketing";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

export function CheckoutForm({ seatCount }: { seatCount: number }) {
  const [state, action, pending] = useActionState(checkoutAction, initial);

  return (
    <form action={action} className="space-y-8">
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="First name">
          <input className={inputClass} name="firstName" required />
        </Field>
        <Field label="Last name">
          <input className={inputClass} name="lastName" required />
        </Field>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Email">
          <input className={inputClass} type="email" name="email" required />
        </Field>
        <Field label="Phone">
          <input className={inputClass} name="phone" />
        </Field>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Company" hint="Invoices are issued to the company when provided.">
          <input className={inputClass} name="company" />
        </Field>
        <Field label="Country">
          <input className={inputClass} name="country" />
        </Field>
      </div>
      <Field
        label={`Guest list (${seatCount} places)`}
        hint="One per line: First Last <email>. You can complete this later."
      >
        <textarea className={inputClass} name="guests" rows={6} />
      </Field>
      <label className="flex items-start gap-3 text-xs text-paper/60">
        <input type="checkbox" name="optIn" className="mt-0.5 accent-accent" />
        Keep me informed about Off Grid experiences, allocations and events.
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Placing…" : "Place reservation"}
      </Button>
      {state.message ? (
        <Notice tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}
