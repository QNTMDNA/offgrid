import type { Metadata } from "next";
import { confirm } from "@/lib/marketing/subscribers";
import { ButtonLink, Eyebrow, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Confirm subscription" };

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const subscriber = token ? await confirm(token) : null;

  return (
    <Section>
      <Eyebrow>Access list</Eyebrow>
      <h1 className="display mt-6 text-4xl">
        {subscriber ? "You're on the list" : "Link no longer valid"}
      </h1>
      <p className="mt-6 max-w-xl text-paper/60">
        {subscriber
          ? "You'll be first to receive allocations, private events and special offers."
          : "This confirmation link has already been used or has expired. Subscribe again from any page."}
      </p>
      <div className="mt-8">
        <ButtonLink href="/">Return home</ButtonLink>
      </div>
    </Section>
  );
}
