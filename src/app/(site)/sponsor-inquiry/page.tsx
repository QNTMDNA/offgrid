import type { Metadata } from "next";
import { SponsorInquiryForm } from "@/components/site/lead-form";
import { Eyebrow, Section } from "@/components/ui";

export const metadata: Metadata = {
  title: "Sponsor Inquiries",
  description: "Partner with Off Grid across the grand prix season.",
};

export default function SponsorInquiryPage() {
  return (
    <Section>
      <div className="grid gap-16 md:grid-cols-[1fr_1.4fr]">
        <div>
          <Eyebrow>Partnerships</Eyebrow>
          <h1 className="mt-6 text-4xl font-light">Sponsor inquiries</h1>
          <p className="mt-6 text-sm text-paper/60">
            Our partnerships are integrated into the atmosphere of the weekend rather than
            layered on top of it. Tell us about your brand and we will build a programme
            around it.
          </p>
          <p className="mt-6 text-sm text-paper/40">info@offgridrace.com</p>
        </div>
        <SponsorInquiryForm />
      </div>
    </Section>
  );
}
