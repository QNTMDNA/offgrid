import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { EDITORIAL_IMAGES, HERO_IMAGE, raceImage } from "@/lib/brand";
import { Hero } from "@/components/site/hero";
import { SponsorMarquee } from "@/components/site/sponsor-marquee";
import { ButtonLink, Eyebrow, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

const PILLARS = [
  {
    eyebrow: "We are refining race experiences",
    title: ["Experience race day", "like an insider"],
    body: "An exclusive hospitality environment designed for a smaller group, seamlessly integrated into the energy and cadence of race weekends around the world. From arrival to departure, we curate elevated food, beverage, entertainment and atmosphere.",
    points: ["Private trackside experience", "By invite only", "Extremely limited access"],
    image: EDITORIAL_IMAGES[1],
  },
  {
    eyebrow: "Experience a different pace",
    title: ["We are industry leaders", "in race day hospitality"],
    body: "With decades of experience across luxury hospitality and motorsport culture, our team brings an unprecedented experience to race day.",
    points: ["Private trackside settings", "Arrival destined for ease", "Luxury programming"],
    image: EDITORIAL_IMAGES[4],
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
      <Hero
        image={HERO_IMAGE}
        priority
        title={
          <>
            Trackside
            <br />
            Hospitality,
            <br />
            Redefined
          </>
        }
      >
        <p>
          Off Grid is a global hospitality and cultural platform built around the
          world&apos;s most iconic races, bringing together luxury hospitality, private
          access, fashion, music, design, and brand experiences.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-4">
          <ButtonLink href="/request-access">Request access</ButtonLink>
          <ButtonLink href="/races" variant="outline">
            Race calendar
          </ButtonLink>
        </div>
      </Hero>

      {PILLARS.map((pillar, index) => (
        <Section key={pillar.title.join(" ")}>
          <div className="grid items-center gap-12 md:grid-cols-2">
            <div className={index % 2 === 1 ? "md:order-2" : undefined}>
              <Eyebrow>{pillar.eyebrow}</Eyebrow>
              <h2 className="display mt-6 text-4xl md:text-5xl">
                {pillar.title[0]}
                <br />
                <span className="text-accent">{pillar.title[1]}</span>
              </h2>
              <p className="mt-8 text-paper/60">{pillar.body}</p>
              <ul className="mt-8 space-y-2">
                {pillar.points.map((point) => (
                  <li key={point} className="eyebrow text-paper/50">
                    — {point}
                  </li>
                ))}
              </ul>
            </div>
            <div className="relative aspect-4/3 w-full overflow-hidden">
              <Image
                src={pillar.image}
                alt=""
                fill
                sizes="(min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
            </div>
          </div>
        </Section>
      ))}

      <Section>
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="display text-4xl md:text-5xl">2026 — 2027 race calendar</h2>
          <Link href="/races" className="eyebrow text-accent hover:text-paper">
            View all
          </Link>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {editions.map((edition, index) => (
            <Link
              key={edition.id}
              href={`/races/${edition.slug}`}
              className="group relative block aspect-4/5 overflow-hidden"
            >
              <Image
                src={raceImage(edition.slug, index, edition.race.heroImage)}
                alt=""
                fill
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6">
                <p className="display text-3xl">
                  {edition.race.city} &apos;{String(edition.season).slice(-2)}
                </p>
                <p className="eyebrow mt-2 text-accent">
                  {edition.status.replace("_", " ")}
                </p>
              </div>
            </Link>
          ))}
          {editions.length === 0 ? (
            <p className="text-sm text-paper/50">Calendar announcement coming soon.</p>
          ) : null}
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 md:grid-cols-2">
          <div>
            <h2 className="display text-4xl md:text-5xl">Our partners</h2>
          </div>
          <div>
            <p className="text-paper/60">
              Off Grid partners with world-class brands to create immersive experiences
              that extend far beyond traditional sponsorship. From luxury hospitality and
              fashion to automotive, spirits, wellness and lifestyle, our partnerships are
              thoughtfully integrated into the atmosphere of each race weekend in a way
              that feels authentic, elevated and memorable.
            </p>
            <div className="mt-8">
              <ButtonLink href="/sponsor-inquiry">Partner with us</ButtonLink>
            </div>
          </div>
        </div>
        <SponsorMarquee />
      </Section>
    </>
  );
}
