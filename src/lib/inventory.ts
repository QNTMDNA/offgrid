import { Prisma, type PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

export const HOLD_MINUTES = 30;

type Client = PrismaClient | Prisma.TransactionClient;

export class InsufficientInventoryError extends Error {
  constructor(
    readonly packageId: string,
    readonly requested: number,
    readonly available: number,
  ) {
    super(
      `Package ${packageId}: requested ${requested} unit(s) but only ${available} available`,
    );
    this.name = "InsufficientInventoryError";
  }
}

/**
 * Units still sellable. Expired holds are ignored rather than deleted so the
 * sweeper can run lazily without blocking a purchase.
 */
export async function availableUnits(
  packageId: string,
  client: Client = prisma,
  now = new Date(),
): Promise<number> {
  const pkg = await client.package.findUnique({
    where: { id: packageId },
    select: { totalUnits: true, heldUnits: true },
  });
  if (!pkg) return 0;

  const claimed = await client.allocation.aggregate({
    where: {
      packageId,
      OR: [
        { status: "CONFIRMED" },
        { status: "HELD", expiresAt: { gt: now } },
      ],
    },
    _sum: { units: true },
  });

  return Math.max(0, pkg.totalUnits - pkg.heldUnits - (claimed._sum.units ?? 0));
}

/**
 * Place a hold for a cart. Serializable isolation is what actually prevents
 * two carts overselling the last table; the read-then-write below is only safe
 * under it.
 */
export async function holdForCart(
  cartId: string,
  packageId: string,
  units: number,
  now = new Date(),
): Promise<{ allocationId: string; expiresAt: Date }> {
  if (units <= 0) throw new Error("units must be positive");
  const expiresAt = new Date(now.getTime() + HOLD_MINUTES * 60_000);

  return prisma.$transaction(
    async (tx) => {
      const existing = await tx.allocation.findFirst({
        where: { cartId, packageId, status: "HELD" },
      });
      const delta = units - (existing?.units ?? 0);
      if (delta > 0) {
        const available = await availableUnits(packageId, tx, now);
        if (available < delta) {
          throw new InsufficientInventoryError(packageId, delta, available);
        }
      }

      const allocation = existing
        ? await tx.allocation.update({
            where: { id: existing.id },
            data: { units, expiresAt },
          })
        : await tx.allocation.create({
            data: { cartId, packageId, units, status: "HELD", expiresAt },
          });

      return { allocationId: allocation.id, expiresAt };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function releaseCartHolds(
  cartId: string,
  client: Client = prisma,
): Promise<number> {
  const { count } = await client.allocation.updateMany({
    where: { cartId, status: "HELD" },
    data: { status: "RELEASED" },
  });
  return count;
}

/** Convert a cart's holds into confirmed allocations owned by the order. */
export async function confirmForOrder(
  cartId: string,
  orderId: string,
  client: Client = prisma,
): Promise<number> {
  const { count } = await client.allocation.updateMany({
    where: { cartId, status: "HELD" },
    data: { status: "CONFIRMED", orderId, expiresAt: null },
  });
  return count;
}

/** Release holds that have lapsed. Run from the job endpoint. */
export async function sweepExpiredHolds(now = new Date()): Promise<number> {
  const { count } = await prisma.allocation.updateMany({
    where: { status: "HELD", expiresAt: { lte: now } },
    data: { status: "RELEASED" },
  });
  return count;
}
