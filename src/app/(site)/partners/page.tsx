import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { ButtonLink, Eyebrow, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Partners",
  description: "Brand, venue and hospitality partners across the Off Grid season.",
};

const PROPOSITION = [
  {
    title: "Integrated activation",
    body: "Your brand lives inside the guest experience — arrival, lounge, dining, and the cultural programme — never as signage on a wall.",
  },
  {
    title: "An audience you cannot buy",
    body: "A small, highly curated room of collectors, founders, and cultural figures at every round of the calendar.",
  },
  {
    title: "Measured outcomes",
    body: "Guest-level attendance, spend and engagement data captured across the weekend and reported back after each round.",
  },
];

export default async function PartnersPage() {
  const partners = await prisma.partner.findMany({
    where: { active: true, showcase: true },
    include: { account: true },
    orderBy: { account: { name: "asc" } },
  });

  return (
    <>
      <Section>
        <Eyebrow>Our partners</Eyebrow>
        <h1 className="display mt-6 max-w-3xl text-4xl md:text-5xl">
          Immersive experiences that extend far beyond traditional sponsorship.
        </h1>
        <div className="mt-16 grid gap-px bg-paper/10 md:grid-cols-3">
          {PROPOSITION.map((item) => (
            <div key={item.title} className="bg-ink p-8">
              <h2 className="text-xl font-light">{item.title}</h2>
              <p className="mt-3 text-sm text-paper/60">{item.body}</p>
            </div>
          ))}
        </div>
      </Section>

      {partners.length > 0 ? (
        <>
          <div className="rule" />
          <Section>
            <Eyebrow>Selected partners</Eyebrow>
            <div className="mt-10 grid gap-px bg-paper/10 md:grid-cols-4">
              {partners.map((partner) => (
                <div key={partner.id} className="bg-ink p-8">
                  <p className="text-lg font-light">{partner.account.name}</p>
                  <p className="eyebrow mt-2 text-paper/40">
                    {partner.kind.replace("_", " ")}
                  </p>
                </div>
              ))}
            </div>
          </Section>
        </>
      ) : null}

      <div className="rule" />

      <Section>
        <h2 className="text-2xl font-light">Build a programme with us.</h2>
        <div className="mt-8">
          <ButtonLink href="/sponsor-inquiry">Sponsor inquiries</ButtonLink>
        </div>
      </Section>
    </>
  );
}
