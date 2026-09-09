"use client";

import { useActionState } from "react";
import { addCanvaDeckAction } from "@/app/actions/lounge";
import type { FormState } from "@/app/actions/marketing";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

export function AddCanvaDeck() {
  const [state, action, pending] = useActionState(addCanvaDeckAction, initial);

  return (
    <form action={action} className="space-y-6 border border-paper/15 p-6">
      <p className="eyebrow text-paper/40">Embed a Canva deck</p>
      <div className="grid gap-6 md:grid-cols-3">
        <Field label="Title">
          <input className={inputClass} name="title" required />
        </Field>
        <Field label="Period" hint="e.g. Q3 2026, Series A.">
          <input className={inputClass} name="period" />
        </Field>
        <Field
          label="Canva link"
          hint="Share the design with anyone holding the link, then paste it here."
        >
          <input
            className={inputClass}
            name="url"
            type="url"
            placeholder="https://www.canva.com/design/…/view"
            required
          />
        </Field>
      </div>
      <Field label="Summary">
        <input className={inputClass} name="summary" />
      </Field>
      <label className="flex items-center gap-3 text-sm text-paper/60">
        <input type="checkbox" name="publish" defaultChecked />
        Publish to the Sponsor Lounge immediately
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Adding…" : "Add deck"}
      </Button>
      {state.message ? (
        <Notice tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}
