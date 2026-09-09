"use client";

import { useActionState } from "react";
import { loungeSignInAction } from "@/app/actions/lounge";
import type { FormState } from "@/app/actions/marketing";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

export function LoungeSignInForm() {
  const [state, action, pending] = useActionState(loungeSignInAction, initial);

  return (
    <form action={action} className="space-y-6">
      <Field label="Email">
        <input className={inputClass} type="email" name="email" required autoFocus />
      </Field>
      <Field label="Passcode">
        <input
          className={`${inputClass} font-mono tracking-[0.2em]`}
          type="password"
          name="passcode"
          autoComplete="one-time-code"
          placeholder="XXXX-XXXX-XXXX"
          required
        />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Checking…" : "Enter"}
      </Button>
      {state.message ? <Notice tone="error">{state.message}</Notice> : null}
    </form>
  );
}
