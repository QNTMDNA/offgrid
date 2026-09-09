import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { SpeakeasyHttpProvider } from "@/lib/integrations/speakeasy/http";
import { SpeakeasyMockProvider } from "@/lib/integrations/speakeasy/mock";
import type { SpeakeasyProvider } from "@/lib/integrations/speakeasy/types";

let provider: SpeakeasyProvider | null = null;

export function speakeasy(): SpeakeasyProvider {
  if (!provider) {
    provider = env().SPEAKEASY_ENABLED
      ? SpeakeasyHttpProvider.fromEnv()
      : new SpeakeasyMockProvider();
  }
  return provider;
}

/** Test seam: swap the provider (and reset with `null`). */
export function setSpeakeasyProvider(next: SpeakeasyProvider | null): void {
  provider = next;
}

/**
 * Push an order's guests to Speakeasy as tickets and store the returned refs.
 *
 * Guests already holding a ticketRef are skipped, so replaying the outbox event
 * after a partial failure only issues what is missing.
 */
export async function issueTicketsForOrder(orderId: string): Promise<number> {
  const order = await prisma.order.findUniqueOrThrow({
    where: { id: orderId },
    include: {
      guests: true,
      items: true,
      contact: true,
    },
  });
  const pending = order.guests.filter((g) => !g.ticketRef);
  if (pending.length === 0) return 0;

  const edition = await prisma.raceEdition.findUniqueOrThrow({
    where: { id: pending[0].editionId },
    include: { race: true },
  });

  const client = speakeasy();
  const event = await client.upsertEvent({
    externalId: edition.id,
    name: `Off Grid — ${edition.race.name} '${String(edition.season).slice(-2)}`,
    venue: edition.race.circuit ?? edition.race.city,
    startsAt: edition.startsAt,
    endsAt: edition.endsAt,
    capacity: edition.capacity,
    timezone: edition.race.timezone,
  });

  const tier = order.items[0]?.packageName ?? "Off Grid";
  const tickets = await client.issueTickets(
    event.id,
    pending.map((g) => ({
      guestExternalId: g.id,
      firstName: g.firstName,
      lastName: g.lastName,
      email: g.email,
      tier,
      notes: g.dietary ?? undefined,
    })),
  );

  await prisma.$transaction([
    ...tickets.map((t) =>
      prisma.guest.update({
        where: { id: t.guestExternalId },
        data: { ticketRef: t.code, status: "TICKETED" },
      }),
    ),
    prisma.ticketBatch.create({
      data: {
        editionId: edition.id,
        orderId: order.id,
        externalId: event.id,
        guestCount: tickets.length,
        syncedAt: new Date(),
      },
    }),
  ]);

  return tickets.length;
}

/** Pull door scans back into guest records. Run from the job endpoint. */
export async function syncCheckIns(editionId: string, since?: Date): Promise<number> {
  const batch = await prisma.ticketBatch.findFirst({
    where: { editionId, externalId: { not: null } },
    orderBy: { createdAt: "desc" },
  });
  if (!batch?.externalId) return 0;

  const client = speakeasy();
  const checkIns = await client.listCheckIns(batch.externalId, since);
  let applied = 0;
  for (const checkIn of checkIns) {
    const { count } = await prisma.guest.updateMany({
      where: { id: checkIn.guestExternalId, checkedInAt: null },
      data: { status: "CHECKED_IN", checkedInAt: checkIn.checkedInAt },
    });
    applied += count;
  }
  return applied;
}

export type { SpeakeasyProvider } from "@/lib/integrations/speakeasy/types";
