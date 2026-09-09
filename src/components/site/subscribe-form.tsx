"use client";

import { useActionState } from "react";
import { subscribeAction, type FormState } from "@/app/actions/marketing";
import { Button, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

export function SubscribeForm({ tags }: { tags?: string[] }) {
  const [state, action, pending] = useActionState(subscribeAction, initial);

  return (
    <form action={action} className="space-y-3">
      {tags?.length ? <input type="hidden" name="tags" value={tags.join(",")} /> : null}
      <div className="flex gap-2">
        <input
          className={inputClass}
          type="email"
          name="email"
          placeholder="Email"
          aria-label="Email"
          required
        />
        <Button type="submit" disabled={pending}>
          {pending ? "…" : "Join"}
        </Button>
      </div>
      {state.message ? (
        <Notice tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}
