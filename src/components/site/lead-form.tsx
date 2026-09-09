"use client";

import { useActionState } from "react";
import { requestAccessAction, sponsorInquiryAction } from "@/app/actions/leads";
import type { FormState } from "@/app/actions/marketing";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

const ACCESS_INTERESTS = [
  "Trackside hospitality",
  "Paddock access",
  "Private dining",
  "Music & culture",
  "Fashion & design",
  "Wellness",
];

const SPONSOR_INTERESTS = [
  "Brand activation",
  "Product showcase",
  "Content & media",
  "Hospitality co-host",
  "Title partnership",
];

function Interests({ options }: { options: string[] }) {
  return (
    <fieldset>
      <legend className="eyebrow text-paper/50">Interests</legend>
      <div className="mt-3 flex flex-wrap gap-3">
        {options.map((option) => (
          <label
            key={option}
            className="flex cursor-pointer items-center gap-2 border border-paper/20 px-3 py-2 text-xs text-paper/70 hover:border-accent"
          >
            <input type="checkbox" name="interests" value={option} className="accent-accent" />
            {option}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function NameEmailRows() {
  return (
    <>
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
    </>
  );
}

function OptIn() {
  return (
    <label className="flex items-start gap-3 text-xs text-paper/60">
      <input type="checkbox" name="optIn" className="mt-0.5 accent-accent" />
      Keep me informed about Off Grid experiences, allocations and events.
    </label>
  );
}

export function RequestAccessForm() {
  const [state, action, pending] = useActionState(requestAccessAction, initial);

  return (
    <form action={action} className="space-y-8">
      <NameEmailRows />
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Country">
          <input className={inputClass} name="country" />
        </Field>
        <Field label="Party size">
          <input className={inputClass} type="number" name="partySize" min={1} max={200} />
        </Field>
      </div>
      <Interests options={ACCESS_INTERESTS} />
      <Field label="Which rounds are you interested in?">
        <textarea className={inputClass} name="message" rows={4} />
      </Field>
      <OptIn />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Submit request"}
      </Button>
      {state.message ? (
        <Notice tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}

export function SponsorInquiryForm() {
  const [state, action, pending] = useActionState(sponsorInquiryAction, initial);

  return (
    <form action={action} className="space-y-8">
      <NameEmailRows />
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Company">
          <input className={inputClass} name="company" required />
        </Field>
        <Field label="Title">
          <input className={inputClass} name="title" />
        </Field>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <Field label="Indicative budget" hint="Whole units, no separators.">
          <input className={inputClass} type="number" name="budget" min={0} step={1000} />
        </Field>
        <Field label="Currency">
          <select className={inputClass} name="currency" defaultValue="USD">
            {["USD", "EUR", "GBP", "AED"].map((code) => (
              <option key={code} value={code} className="bg-ink">
                {code}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Interests options={SPONSOR_INTERESTS} />
      <Field label="Tell us about your brand and objectives">
        <textarea className={inputClass} name="message" rows={5} />
      </Field>
      <OptIn />
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Submit inquiry"}
      </Button>
      {state.message ? (
        <Notice tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}
