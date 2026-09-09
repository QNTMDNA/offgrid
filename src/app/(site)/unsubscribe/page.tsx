import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/site/unsubscribe-form";
import { Eyebrow, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Unsubscribe" };

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <Section>
      <Eyebrow>Email preferences</Eyebrow>
      <h1 className="mt-6 text-4xl font-light">Unsubscribe</h1>
      <p className="mt-6 max-w-xl text-paper/60">
        Confirm the address you would like removed from the Off Grid access list.
        Transactional messages about existing reservations will still be sent.
      </p>
      <div className="mt-10 max-w-sm">
        <UnsubscribeForm email={email} />
      </div>
    </Section>
  );
}
