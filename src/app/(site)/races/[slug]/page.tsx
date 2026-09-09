import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { availableUnits } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { raceImage } from "@/lib/brand";
import { Hero } from "@/components/site/hero";
import { AddToCart } from "@/components/site/add-to-cart";
import { SubscribeForm } from "@/components/site/subscribe-form";
import { ButtonLink, Eyebrow, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

const DATE_RANGE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const edition = await prisma.raceEdition.findUnique({
    where: { slug },
    include: { race: true },
  });
  if (!edition) return { title: "Race" };
  return {
    title: `${edition.race.name} ${edition.season}`,
    description: edition.headline ?? undefined,
  };
}

export default async function RaceEditionPage({ params }: Params) {
  const { slug } = await params;
  const edition = await prisma.raceEdition.findUnique({
    where: { slug },
    include: {
      race: true,
      packages: { where: { active: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  if (!edition || edition.status === "DRAFT") notFound();

  const availability = await Promise.all(
    edition.packages.map(async (pkg) => ({
      pkg,
      available: await availableUnits(pkg.id),
    })),
  );

  const onSale = edition.status === "ON_SALE";

  return (
    <>
      <Hero
        image={raceImage(edition.slug)}
        priority
        height="short"
        eyebrow={`${edition.race.city}, ${edition.race.country} — ${edition.season}`}
        title={edition.race.name}
      >
        <p className="eyebrow text-paper/60">
          {DATE_RANGE.format(edition.startsAt)} — {DATE_RANGE.format(edition.endsAt)}
          {edition.race.circuit ? ` · ${edition.race.circuit}` : ""}
        </p>
      </Hero>

      {edition.headline || edition.body ? (
        <Section>
          {edition.headline ? (
            <p className="display max-w-4xl text-3xl md:text-4xl">{edition.headline}</p>
          ) : null}
          {edition.body ? (
            <p className="mt-6 max-w-2xl text-paper/60">{edition.body}</p>
          ) : null}
        </Section>
      ) : null}

      <Section>
        <div className="flex items-baseline justify-between">
          <Eyebrow>Hospitality</Eyebrow>
          <p className="eyebrow text-accent">{edition.status.replace("_", " ")}</p>
        </div>

        <div className="mt-10 grid gap-px bg-paper/10 md:grid-cols-2">
          {availability.map(({ pkg, available }) => (
            <div key={pkg.id} className="flex flex-col justify-between gap-6 bg-ink p-8">
              <div>
                <p className="eyebrow text-paper/40">{pkg.kind.replace("_", " ")}</p>
                <h2 className="display mt-3 text-2xl">{pkg.name}</h2>
                {pkg.description ? (
                  <p className="mt-3 text-sm text-paper/60">{pkg.description}</p>
                ) : null}
                <p className="mt-6 text-lg">
                  {formatMoney(pkg.priceMinor, edition.currency)}
                  <span className="text-sm text-paper/40">
                    {" "}
                    / {pkg.seatsPerUnit === 1 ? "guest" : `${pkg.seatsPerUnit} guests`}
                  </span>
                </p>
                <p className="mt-2 text-xs text-paper/40">
                  {available > 0 ? `${available} remaining` : "Fully allocated"}
                </p>
              </div>
              <AddToCart
                packageId={pkg.id}
                maxUnits={available}
                disabled={!onSale || pkg.inviteOnly}
              />
              {pkg.inviteOnly && onSale ? (
                <p className="text-xs text-paper/40">
                  Released to approved members only — request access to unlock.
                </p>
              ) : null}
            </div>
          ))}
        </div>

        {availability.length === 0 ? (
          <p className="mt-10 text-paper/50">Packages for this round are not yet open.</p>
        ) : null}

        <div className="mt-16 grid gap-10 md:grid-cols-2">
          <div>
            <h3 className="display text-2xl">Not on the list yet?</h3>
            <p className="mt-3 text-sm text-paper/60">
              Access is reviewed individually. Submit a request and our team will respond
              with availability for this round.
            </p>
            <div className="mt-6">
              <ButtonLink href="/request-access" variant="outline">
                Request access
              </ButtonLink>
            </div>
          </div>
          <div>
            <h3 className="display text-2xl">Get notified for {edition.race.city}</h3>
            <div className="mt-6">
              <SubscribeForm tags={[edition.slug]} />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
