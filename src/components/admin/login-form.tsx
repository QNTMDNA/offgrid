"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/actions/admin";
import type { FormState } from "@/app/actions/marketing";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, initial);

  return (
    <form action={action} className="space-y-6">
      <Field label="Email">
        <input className={inputClass} type="email" name="email" required autoFocus />
      </Field>
      <Field label="Password">
        <input className={inputClass} type="password" name="password" required />
      </Field>
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
      {state.message ? <Notice tone="error">{state.message}</Notice> : null}
    </form>
  );
}
