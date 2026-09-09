"use client";

import { useActionState } from "react";
import { unsubscribeAction, type FormState } from "@/app/actions/marketing";
import { Button, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

export function UnsubscribeForm({ email }: { email?: string }) {
  const [state, action, pending] = useActionState(unsubscribeAction, initial);

  return (
    <form action={action} className="space-y-3">
      <input
        className={inputClass}
        type="email"
        name="email"
        defaultValue={email}
        placeholder="Email"
        aria-label="Email"
        required
      />
      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "…" : "Unsubscribe"}
      </Button>
      {state.message ? (
        <Notice tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}
