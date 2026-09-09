"use client";

import { useActionState } from "react";
import type { EditionStatus } from "@prisma/client";
import { setEditionStatusAction } from "@/app/actions/admin";
import type { FormState } from "@/app/actions/marketing";
import { Button, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

const STATUSES: EditionStatus[] = [
  "DRAFT",
  "ANNOUNCED",
  "ON_SALE",
  "WAITLIST",
  "SOLD_OUT",
  "COMPLETED",
  "CANCELLED",
];

export function EditionStatusControl({
  editionId,
  status,
}: {
  editionId: string;
  status: EditionStatus;
}) {
  const [state, action, pending] = useActionState(setEditionStatusAction, initial);

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="editionId" value={editionId} />
      <select
        className={`${inputClass} w-40 py-2`}
        name="status"
        defaultValue={status}
        aria-label="Edition status"
      >
        {STATUSES.map((option) => (
          <option key={option} value={option} className="bg-ink">
            {option.replace("_", " ")}
          </option>
        ))}
      </select>
      <Button type="submit" variant="outline" className="px-4 py-2" disabled={pending}>
        {pending ? "…" : "Save"}
      </Button>
      {state.message ? (
        <span
          className={`text-xs ${state.status === "error" ? "text-red-300" : "text-accent"}`}
        >
          {state.message}
        </span>
      ) : null}
    </form>
  );
}
