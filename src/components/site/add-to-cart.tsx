"use client";

import { useActionState } from "react";
import { setCartLineAction } from "@/app/actions/commerce";
import type { FormState } from "@/app/actions/marketing";
import { Button, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

export function AddToCart({
  packageId,
  maxUnits,
  disabled,
}: {
  packageId: string;
  maxUnits: number;
  disabled?: boolean;
}) {
  const [state, action, pending] = useActionState(setCartLineAction, initial);

  if (disabled || maxUnits <= 0) {
    return <p className="eyebrow text-paper/40">Waitlist only</p>;
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="packageId" value={packageId} />
      <div className="flex items-center gap-3">
        <input
          className={`${inputClass} w-20`}
          type="number"
          name="units"
          min={1}
          max={maxUnits}
          defaultValue={1}
          aria-label="Units"
        />
        <Button type="submit" disabled={pending}>
          {pending ? "Reserving…" : "Reserve"}
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
