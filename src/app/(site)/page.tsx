import Link from "next/link";
import { prisma } from "@/lib/db";
import { ButtonLink, Eyebrow, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

const PILLARS = [
  {
    title: "Experience race day like an insider",
    body: "An exclusive hospitality environment designed for a smaller group, seamlessly integrated into the energy and cadence of race weekends around the world.",
    points: ["Private trackside experience", "By invite only", "Extremely limited access"],
  },
  {
    title: "We are industry leaders in race day hospitality",
    body: "Decades of experience across luxury hospitality and motorsport culture, brought to bear on every arrival, every service, every departure.",
    points: ["Private trackside settings", "Arrival destined for ease", "Luxury programming"],
  },
];

export default async function HomePage() {
  const editions = await prisma.raceEdition.findMany({
    where: { status: { in: ["ANNOUNCED", "ON_SALE", "WAITLIST", "SOLD_OUT"] } },
    include: { race: true },
    orderBy: { startsAt: "asc" },
    take: 9,
  });

  return (
    <>
      <Section className="!py-32">
        <Eyebrow>Trackside hospitality, redefined</Eyebrow>
        <h1 className="mt-6 max-w-4xl text-4xl font-light leading-tight md:text-6xl">
          A global hospitality and cultural platform built around the world&apos;s most
          iconic races.
        </h1>
        <p className="mt-8 max-w-2xl text-paper/60">
          Luxury hospitality, private access, fashion, music, design and brand
          experiences — brought together for a small number of guests at each round.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <ButtonLink href="/request-access">Request access</ButtonLink>
          <ButtonLink href="/races" variant="outline">
            View race calendar
          </ButtonLink>
        </div>
      </Section>

      <div className="rule" />

      {PILLARS.map((pillar) => (
        <Section key={pillar.title}>
          <div className="grid gap-10 md:grid-cols-2">
            <h2 className="text-2xl font-light md:text-3xl">{pillar.title}</h2>
            <div>
              <p className="text-paper/60">{pillar.body}</p>
              <ul className="mt-8 space-y-2">
                {pillar.points.map((point) => (
                  <li key={point} className="eyebrow text-paper/50">
                    — {point}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Section>
      ))}

      <div className="rule" />

      <Section>
        <Eyebrow>2026 — 2027 race calendar</Eyebrow>
        <div className="mt-10 grid gap-px bg-paper/10 md:grid-cols-3">
          {editions.map((edition) => (
            <Link
              key={edition.id}
              href={`/races/${edition.slug}`}
              className="group bg-ink p-8 transition hover:bg-paper/5"
            >
              <p className="text-2xl font-light">
                {edition.race.city} &apos;{String(edition.season).slice(-2)}
              </p>
              <p className="mt-2 text-sm text-paper/50">{edition.race.country}</p>
              <p className="eyebrow mt-6 text-accent">{edition.status.replace("_", " ")}</p>
            </Link>
          ))}
          {editions.length === 0 ? (
            <p className="bg-ink p-8 text-sm text-paper/50">
              Calendar announcement coming soon.
            </p>
          ) : null}
        </div>
      </Section>

      <div className="rule" />

      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <Eyebrow>Our partners</Eyebrow>
            <h2 className="mt-6 text-2xl font-light md:text-3xl">
              Immersive experiences that extend far beyond traditional sponsorship.
            </h2>
          </div>
          <div>
            <p className="text-paper/60">
              From luxury hospitality and fashion to automotive, spirits, wellness and
              lifestyle, our partnerships are thoughtfully integrated into the atmosphere
              of each race weekend in a way that feels authentic, elevated and memorable.
            </p>
            <div className="mt-8">
              <ButtonLink href="/sponsor-inquiry" variant="outline">
                Partner with us
              </ButtonLink>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
