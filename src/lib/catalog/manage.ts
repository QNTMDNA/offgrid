import type { EditionStatus, PackageKind, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";

export class SlugTakenError extends Error {}
export class InventoryBelowCommittedError extends Error {
  constructor(readonly committed: number) {
    super(`Inventory cannot drop below the ${committed} unit(s) already committed`);
    this.name = "InventoryBelowCommittedError";
  }
}

export function slugify(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function editionSlug(raceSlug: string, season: number): string {
  return `${raceSlug}-${season}`;
}

/** Deterministic so operators can predict it, and unique per edition because
 * the edition slug is folded in: MIAMI-2026-TRACKSIDE-LOUNGE. */
export function packageSku(edition: { slug: string }, name: string): string {
  return `${edition.slug}-${slugify(name)}`.toUpperCase();
}

/**
 * Units an operator may no longer take away: everything sold or on hold right
 * now. Expired holds do not count, matching `availableUnits`.
 */
export async function committedUnits(
  packageId: string,
  client: Prisma.TransactionClient | typeof prisma = prisma,
  now = new Date(),
): Promise<number> {
  const claimed = await client.allocation.aggregate({
    where: {
      packageId,
      OR: [{ status: "CONFIRMED" }, { status: "HELD", expiresAt: { gt: now } }],
    },
    _sum: { units: true },
  });
  return claimed._sum.units ?? 0;
}

export function assertInventoryFits(
  totalUnits: number,
  heldUnits: number,
  committed: number,
): void {
  if (totalUnits - heldUnits < committed) {
    throw new InventoryBelowCommittedError(committed);
  }
}

export type RaceInput = {
  name: string;
  city: string;
  country: string;
  countryCode: string;
  circuit?: string | null;
  timezone?: string;
  summary?: string | null;
  slug?: string | null;
};

export async function createRace(input: RaceInput) {
  const slug = slugify(input.slug || input.name);
  if (await prisma.race.findUnique({ where: { slug }, select: { id: true } })) {
    throw new SlugTakenError(`A race with the slug "${slug}" already exists`);
  }
  return prisma.race.create({
    data: {
      slug,
      name: input.name,
      city: input.city,
      country: input.country,
      countryCode: input.countryCode.toUpperCase().slice(0, 3),
      circuit: input.circuit || null,
      timezone: input.timezone || "UTC",
      summary: input.summary || null,
    },
  });
}

export async function updateRace(raceId: string, input: Partial<RaceInput>) {
  return prisma.race.update({
    where: { id: raceId },
    data: {
      name: input.name,
      city: input.city,
      country: input.country,
      countryCode: input.countryCode?.toUpperCase().slice(0, 3),
      circuit: input.circuit ?? undefined,
      timezone: input.timezone,
      summary: input.summary ?? undefined,
    },
  });
}

export type EditionInput = {
  raceId: string;
  season: number;
  startsAt: Date;
  endsAt: Date;
  status: EditionStatus;
  currency: string;
  headline?: string | null;
  body?: string | null;
  capacity?: number;
};

export async function createEdition(input: EditionInput) {
  const race = await prisma.race.findUniqueOrThrow({ where: { id: input.raceId } });
  const slug = editionSlug(race.slug, input.season);
  if (await prisma.raceEdition.findUnique({ where: { slug }, select: { id: true } })) {
    throw new SlugTakenError(`${race.name} ${input.season} already exists`);
  }
  if (input.endsAt < input.startsAt) {
    throw new Error("The edition cannot end before it starts");
  }

  return prisma.raceEdition.create({
    data: {
      raceId: race.id,
      season: input.season,
      slug,
      status: input.status,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      currency: input.currency.toUpperCase(),
      headline: input.headline || null,
      body: input.body || null,
      capacity: input.capacity ?? 0,
    },
  });
}

export async function updateEdition(
  editionId: string,
  input: Omit<EditionInput, "raceId" | "season">,
) {
  if (input.endsAt < input.startsAt) {
    throw new Error("The edition cannot end before it starts");
  }
  return prisma.raceEdition.update({
    where: { id: editionId },
    data: {
      status: input.status,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      currency: input.currency.toUpperCase(),
      headline: input.headline || null,
      body: input.body || null,
      capacity: input.capacity ?? 0,
    },
  });
}

export type PackageInput = {
  name: string;
  kind: PackageKind;
  description?: string | null;
  priceMinor: number;
  seatsPerUnit: number;
  totalUnits: number;
  heldUnits: number;
  inviteOnly: boolean;
  sortOrder: number;
  active: boolean;
  sku?: string | null;
};

export async function createPackage(editionId: string, input: PackageInput) {
  const edition = await prisma.raceEdition.findUniqueOrThrow({
    where: { id: editionId },
    select: { id: true, slug: true },
  });
  const sku = (input.sku?.trim() || packageSku(edition, input.name)).toUpperCase();
  if (await prisma.package.findUnique({ where: { sku }, select: { id: true } })) {
    throw new SlugTakenError(`A package with the SKU "${sku}" already exists`);
  }
  assertInventoryFits(input.totalUnits, input.heldUnits, 0);

  return prisma.package.create({
    data: {
      editionId: edition.id,
      sku,
      name: input.name,
      kind: input.kind,
      description: input.description || null,
      priceMinor: input.priceMinor,
      seatsPerUnit: input.seatsPerUnit,
      totalUnits: input.totalUnits,
      heldUnits: input.heldUnits,
      inviteOnly: input.inviteOnly,
      sortOrder: input.sortOrder,
      active: input.active,
    },
  });
}

/**
 * Package edits go through a transaction that re-reads live allocations, so an
 * operator cannot shrink inventory underneath a cart that is mid-checkout.
 */
export async function updatePackage(packageId: string, input: PackageInput) {
  return prisma.$transaction(async (tx) => {
    assertInventoryFits(
      input.totalUnits,
      input.heldUnits,
      await committedUnits(packageId, tx),
    );
    return tx.package.update({
      where: { id: packageId },
      data: {
        name: input.name,
        kind: input.kind,
        description: input.description || null,
        priceMinor: input.priceMinor,
        seatsPerUnit: input.seatsPerUnit,
        totalUnits: input.totalUnits,
        heldUnits: input.heldUnits,
        inviteOnly: input.inviteOnly,
        sortOrder: input.sortOrder,
        active: input.active,
      },
    });
  });
}

/** Packages are never deleted once inventory has moved; they are archived so
 * historic orders keep resolving. */
export async function archivePackage(packageId: string) {
  return prisma.package.update({ where: { id: packageId }, data: { active: false } });
}
