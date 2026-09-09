"use client";

import { useActionState } from "react";
import { inviteMemberAction } from "@/app/actions/lounge";
import type { FormState } from "@/app/actions/marketing";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

export function InviteMember() {
  const [state, action, pending] = useActionState(inviteMemberAction, initial);

  return (
    <form action={action} className="space-y-6 border border-paper/15 p-6">
      <p className="eyebrow text-paper/40">Grant access</p>
      <div className="grid gap-6 md:grid-cols-3">
        <Field label="Name">
          <input className={inputClass} name="name" required />
        </Field>
        <Field label="Email">
          <input className={inputClass} type="email" name="email" required />
        </Field>
        <Field label="Organisation">
          <input className={inputClass} name="organization" />
        </Field>
      </div>
      <Button type="submit" disabled={pending}>
        {pending ? "Issuing…" : "Issue passcode"}
      </Button>
      {state.message ? (
        <Notice tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}
