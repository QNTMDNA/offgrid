"use client";

import { useActionState } from "react";
import { uploadInvestorDocumentAction } from "@/app/actions/investors";
import type { FormState } from "@/app/actions/marketing";
import { Button, Field, Notice, inputClass } from "@/components/ui";

const initial: FormState = { status: "idle" };

export function UploadDeck() {
  const [state, action, pending] = useActionState(uploadInvestorDocumentAction, initial);

  return (
    <form action={action} className="space-y-6 border border-paper/15 p-6">
      <p className="eyebrow text-paper/40">Upload document</p>
      <div className="grid gap-6 md:grid-cols-3">
        <Field label="Title">
          <input className={inputClass} name="title" required />
        </Field>
        <Field label="Period" hint="e.g. Q3 2026, Series A.">
          <input className={inputClass} name="period" />
        </Field>
        <Field label="File" hint="PDF, PowerPoint or Excel, up to 64 MB.">
          <input
            className={inputClass}
            type="file"
            name="file"
            accept=".pdf,.ppt,.pptx,.xlsx"
            required
          />
        </Field>
      </div>
      <Field label="Summary">
        <input className={inputClass} name="summary" />
      </Field>
      <label className="flex items-center gap-3 text-sm text-paper/60">
        <input type="checkbox" name="publish" defaultChecked />
        Publish to the investor room immediately
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload"}
      </Button>
      {state.message ? (
        <Notice tone={state.status === "error" ? "error" : "success"}>
          {state.message}
        </Notice>
      ) : null}
    </form>
  );
}
