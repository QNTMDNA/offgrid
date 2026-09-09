import Link from "next/link";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { Eyebrow, Section } from "@/components/ui";

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
      <Eyebrow>Race calendar</Eyebrow>
      <h1 className="mt-6 text-4xl font-light">Where we will be</h1>

      {seasons.map((season) => (
        <div key={season} className="mt-16">
          <p className="eyebrow text-accent">{season} season</p>
          <ul className="mt-6 divide-y divide-paper/10 border-y border-paper/10">
            {editions
              .filter((e) => e.season === season)
              .map((edition) => (
                <li key={edition.id}>
                  <Link
                    href={`/races/${edition.slug}`}
                    className="flex flex-wrap items-baseline justify-between gap-4 py-6 transition hover:text-accent"
                  >
                    <span className="text-2xl font-light">{edition.race.name}</span>
                    <span className="text-sm text-paper/50">
                      {edition.race.city}, {edition.race.country}
                    </span>
                    <span className="text-sm text-paper/50">
                      {DATE_FORMAT.format(edition.startsAt)}
                    </span>
                    <span className="eyebrow text-paper/40">
                      {edition.packages.length} package
                      {edition.packages.length === 1 ? "" : "s"}
                    </span>
                    <span className="eyebrow text-accent">
                      {edition.status.replace("_", " ")}
                    </span>
                  </Link>
                </li>
              ))}
          </ul>
        </div>
      ))}

      {editions.length === 0 ? (
        <p className="mt-16 text-paper/50">The calendar has not been announced yet.</p>
      ) : null}
    </Section>
  );
}
