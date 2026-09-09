"use client";

import { useActionState } from "react";
import { setCartLineAction } from "@/app/actions/commerce";
import type { FormState } from "@/app/actions/marketing";
import { Button } from "@/components/ui";

const initial: FormState = { status: "idle" };

export function RemoveFromCart({ packageId }: { packageId: string }) {
  const [, action, pending] = useActionState(setCartLineAction, initial);

  return (
    <form action={action}>
      <input type="hidden" name="packageId" value={packageId} />
      <input type="hidden" name="units" value={0} />
      <Button type="submit" variant="ghost" disabled={pending}>
        {pending ? "Releasing…" : "Remove"}
      </Button>
    </form>
  );
}
