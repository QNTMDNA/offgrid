import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { raceImage } from "@/lib/brand";
import { Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Race Calendar",
  description: "Off Grid hospitality at the world's most iconic grand prix weekends.",
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

export default async function RacesPage() {
  const editions = await prisma.raceEdition.findMany({
    where: { status: { not: "DRAFT" } },
    include: { race: true, packages: { where: { active: true } } },
    orderBy: { startsAt: "asc" },
  });

  const seasons = [...new Set(editions.map((e) => e.season))].sort();

  return (
    <Section>
      <h1 className="display text-5xl md:text-6xl">2026 — 2027 race calendar</h1>

      {seasons.map((season) => (
        <div key={season} className="mt-16">
          <p className="eyebrow text-accent">{season} season</p>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {editions
              .filter((e) => e.season === season)
              .map((edition, index) => (
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
                  <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/25 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-6">
                    <p className="display text-3xl">{edition.race.city}</p>
                    <p className="mt-2 text-sm text-paper/60">
                      {DATE_FORMAT.format(edition.startsAt)} · {edition.race.country}
                    </p>
                    <p className="eyebrow mt-3 text-accent">
                      {edition.status.replace("_", " ")} · {edition.packages.length}{" "}
                      package{edition.packages.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </Link>
              ))}
          </div>
        </div>
      ))}

      {editions.length === 0 ? (
        <p className="mt-16 text-paper/50">The calendar has not been announced yet.</p>
      ) : null}
    </Section>
  );
}
