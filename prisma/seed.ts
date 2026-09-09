import { PrismaClient, type PackageKind } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

type RaceSeed = {
  slug: string;
  name: string;
  city: string;
  country: string;
  countryCode: string;
  circuit: string;
  start: string;
  end: string;
  currency: string;
  status: "ANNOUNCED" | "ON_SALE" | "WAITLIST";
  headline: string;
};

const RACES: RaceSeed[] = [
  {
    slug: "miami",
    name: "Miami Grand Prix",
    city: "Miami",
    country: "United States",
    countryCode: "US",
    circuit: "Miami International Autodrome",
    start: "2026-05-01",
    end: "2026-05-03",
    currency: "USD",
    status: "ON_SALE",
    headline: "Three days of trackside hospitality in the heart of Miami Gardens.",
  },
  {
    slug: "monaco",
    name: "Monaco Grand Prix",
    city: "Monaco",
    country: "Monaco",
    countryCode: "MC",
    circuit: "Circuit de Monaco",
    start: "2026-05-22",
    end: "2026-05-24",
    currency: "EUR",
    status: "WAITLIST",
    headline: "Harbourside terraces and private access on the most storied weekend of the year.",
  },
  {
    slug: "monza",
    name: "Italian Grand Prix",
    city: "Monza",
    country: "Italy",
    countryCode: "IT",
    circuit: "Autodromo Nazionale Monza",
    start: "2026-09-04",
    end: "2026-09-06",
    currency: "EUR",
    status: "ON_SALE",
    headline: "The temple of speed, approached with restraint and taste.",
  },
  {
    slug: "austin",
    name: "United States Grand Prix",
    city: "Austin",
    country: "United States",
    countryCode: "US",
    circuit: "Circuit of the Americas",
    start: "2026-10-23",
    end: "2026-10-25",
    currency: "USD",
    status: "ANNOUNCED",
    headline: "Texas hospitality, recomposed for the paddock.",
  },
  {
    slug: "las-vegas",
    name: "Las Vegas Grand Prix",
    city: "Las Vegas",
    country: "United States",
    countryCode: "US",
    circuit: "Las Vegas Strip Circuit",
    start: "2026-11-19",
    end: "2026-11-21",
    currency: "USD",
    status: "ANNOUNCED",
    headline: "A night race, seen from the right side of the barrier.",
  },
  {
    slug: "abu-dhabi",
    name: "Abu Dhabi Grand Prix",
    city: "Abu Dhabi",
    country: "United Arab Emirates",
    countryCode: "AE",
    circuit: "Yas Marina Circuit",
    start: "2026-12-04",
    end: "2026-12-06",
    currency: "AED",
    status: "ANNOUNCED",
    headline: "The season closes on the marina, at dusk.",
  },
];

const PACKAGES: Array<{
  suffix: string;
  name: string;
  kind: PackageKind;
  price: number;
  seats: number;
  units: number;
  inviteOnly: boolean;
  description: string;
}> = [
  {
    suffix: "TRACKSIDE",
    name: "Trackside Lounge",
    kind: "SEAT",
    price: 12_500,
    seats: 1,
    units: 40,
    inviteOnly: false,
    description:
      "Private lounge on the circuit with all-weekend access, chef-led dining and a dedicated host.",
  },
  {
    suffix: "TABLE",
    name: "Private Table of Ten",
    kind: "TABLE",
    price: 110_000,
    seats: 10,
    units: 6,
    inviteOnly: false,
    description:
      "A reserved table for your party across all three days, with paddock transfers and evening programming.",
  },
  {
    suffix: "PADDOCK",
    name: "Paddock Club Access",
    kind: "PADDOCK",
    price: 21_000,
    seats: 1,
    units: 20,
    inviteOnly: true,
    description: "Pit lane walk, garage visit and grid access alongside the Off Grid programme.",
  },
  {
    suffix: "SUITE",
    name: "Off Grid Suite",
    kind: "SUITE",
    price: 285_000,
    seats: 20,
    units: 2,
    inviteOnly: true,
    description:
      "The full suite, curated end to end: hospitality, culture, transport and residence for twenty guests.",
  },
];

async function upsertAccount(name: string, country: string) {
  const existing = await prisma.account.findFirst({ where: { name } });
  return (
    existing ??
    prisma.account.create({ data: { name, country, tier: "PARTNER" } })
  );
}

async function main() {
  for (const race of RACES) {
    const created = await prisma.race.upsert({
      where: { slug: race.slug },
      create: {
        slug: race.slug,
        name: race.name,
        city: race.city,
        country: race.country,
        countryCode: race.countryCode,
        circuit: race.circuit,
      },
      update: {},
    });

    const edition = await prisma.raceEdition.upsert({
      where: { raceId_season: { raceId: created.id, season: 2026 } },
      create: {
        raceId: created.id,
        season: 2026,
        slug: `${race.slug}-2026`,
        status: race.status,
        startsAt: new Date(`${race.start}T00:00:00Z`),
        endsAt: new Date(`${race.end}T23:59:59Z`),
        currency: race.currency,
        capacity: 120,
        headline: race.headline,
        body: "Access is reviewed individually and released in small allocations. Every element of the weekend — arrival, dining, programming and departure — is handled by the Off Grid team.",
      },
      update: { status: race.status, headline: race.headline },
    });

    for (const [index, pkg] of PACKAGES.entries()) {
      const sku = `${race.slug.toUpperCase()}-26-${pkg.suffix}`;
      await prisma.package.upsert({
        where: { sku },
        create: {
          sku,
          editionId: edition.id,
          name: pkg.name,
          kind: pkg.kind,
          description: pkg.description,
          priceMinor: pkg.price * 100,
          seatsPerUnit: pkg.seats,
          totalUnits: pkg.units,
          heldUnits: Math.max(1, Math.floor(pkg.units * 0.1)),
          inviteOnly: pkg.inviteOnly,
          sortOrder: index,
        },
        update: { priceMinor: pkg.price * 100, description: pkg.description },
      });
    }
  }

  const venue = await upsertAccount("Autodromo Hospitality SRL", "Italy");
  await prisma.partner.upsert({
    where: { accountId: venue.id },
    create: {
      accountId: venue.id,
      kind: "VENUE",
      payoutCurrency: "EUR",
      showcase: false,
    },
    update: {},
  });

  const brand = await upsertAccount("Maison Vert", "France");
  await prisma.partner.upsert({
    where: { accountId: brand.id },
    create: {
      accountId: brand.id,
      kind: "BRAND",
      payoutCurrency: "EUR",
      showcase: true,
    },
    update: { showcase: true },
  });

  await prisma.segment.upsert({
    where: { slug: "all-subscribed" },
    create: {
      slug: "all-subscribed",
      name: "All confirmed subscribers",
      description: "Everyone who completed double opt-in.",
      rules: { status: ["SUBSCRIBED"] },
    },
    update: {},
  });
  await prisma.segment.upsert({
    where: { slug: "past-guests" },
    create: {
      slug: "past-guests",
      name: "Past guests",
      description: "Subscribers who have completed at least one booking.",
      rules: { status: ["SUBSCRIBED"], hasPurchased: true },
    },
    update: {},
  });

  const email = process.env.SEED_ADMIN_EMAIL ?? "admin@offgridrace.com";
  const password = process.env.SEED_ADMIN_PASSWORD ?? "offgrid-dev-password";
  await prisma.adminUser.upsert({
    where: { email },
    create: {
      email,
      name: "Off Grid Admin",
      role: "ADMIN",
      passwordHash: await hash(password, 10),
    },
    update: {},
  });

  console.log(`Seeded ${RACES.length} races. Admin: ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
