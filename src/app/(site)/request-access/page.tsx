import type { Metadata } from "next";
import { RequestAccessForm } from "@/components/site/lead-form";
import { Eyebrow, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Request Access",
  description: "Access to Off Grid hospitality is reviewed individually.",
};

export default function RequestAccessPage() {
  return (
    <Section>
      <div className="grid gap-16 md:grid-cols-[1fr_1.4fr]">
        <div>
          <Eyebrow>By invite only</Eyebrow>
          <h1 className="display mt-6 text-4xl">Request access</h1>
          <p className="mt-6 text-sm text-paper/60">
            Every round is intentionally limited. Share a few details and our team will
            respond with availability, pricing and the programme for your preferred races.
          </p>
          <p className="mt-6 text-sm text-paper/40">info@offgridrace.com</p>
        </div>
        <RequestAccessForm />
      </div>
    </Section>
  );
}
