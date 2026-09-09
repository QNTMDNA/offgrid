import type { Payout } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { fromMinor, toMinor } from "@/lib/money";
import { payoutReference } from "@/lib/commerce/numbering";
import { enqueue } from "@/lib/outbox";
import { WiseClient, type RecipientInput } from "@/lib/integrations/wise/client";

export async function draftPayout(input: {
  partnerId: string;
  sourceCurrency: string;
  targetCurrency: string;
  amountMinor: number;
}): Promise<Payout> {
  const payout = await prisma.payout.create({
    data: {
      partnerId: input.partnerId,
      reference: payoutReference(),
      sourceCurrency: input.sourceCurrency,
      targetCurrency: input.targetCurrency,
      amountMinor: input.amountMinor,
      status: "DRAFT",
    },
  });
  await enqueue("wise.payout.execute", { payoutId: payout.id });
  return payout;
}

export async function ensureRecipient(
  partnerId: string,
  details: RecipientInput,
): Promise<number> {
  const partner = await prisma.partner.findUniqueOrThrow({
    where: { id: partnerId },
    include: { account: true },
  });
  if (partner.wiseRecipientId) return Number(partner.wiseRecipientId);

  const client = WiseClient.fromEnv();
  const recipient = await client.createRecipient(details);
  await prisma.partner.update({
    where: { id: partnerId },
    data: { wiseRecipientId: String(recipient.id) },
  });
  await prisma.integrationLink.upsert({
    where: {
      system_entity_localId: {
        system: "WISE",
        entity: "recipient",
        localId: partnerId,
      },
    },
    create: {
      system: "WISE",
      entity: "recipient",
      localId: partnerId,
      externalId: String(recipient.id),
    },
    update: { externalId: String(recipient.id), syncedAt: new Date() },
  });
  return recipient.id;
}

/**
 * Quote, create and fund a Wise transfer for a payout.
 *
 * Each stage persists before the next runs, so a retry resumes rather than
 * duplicating: a payout that already holds a wiseTransferId is only funded.
 * `reference` doubles as the Wise customerTransactionId idempotency key.
 */
export async function executePayout(payoutId: string): Promise<Payout> {
  const payout = await prisma.payout.findUniqueOrThrow({
    where: { id: payoutId },
    include: { partner: true },
  });

  if (payout.status === "COMPLETED" || payout.status === "SENT") return payout;
  if (!env().WISE_ENABLED) {
    throw new Error("Wise integration is disabled; cannot execute payout");
  }
  if (!payout.partner.wiseRecipientId) {
    throw new Error(
      `Partner ${payout.partnerId} has no Wise recipient; call ensureRecipient first`,
    );
  }

  const client = WiseClient.fromEnv();
  let current = payout;

  if (!current.wiseTransferId) {
    const quote = await client.createQuote({
      sourceCurrency: current.sourceCurrency,
      targetCurrency: current.targetCurrency,
      targetAmount: fromMinor(current.amountMinor, current.targetCurrency),
    });
    const option = quote.paymentOptions?.find(
      (o) => o.payIn === "BALANCE" && o.payOut === "BALANCE",
    );

    current = await prisma.payout.update({
      where: { id: current.id },
      data: {
        status: "QUOTED",
        wiseQuoteId: quote.id,
        rate: quote.rate,
        sourceAmountMinor: toMinor(
          option?.sourceAmount ?? quote.sourceAmount,
          current.sourceCurrency,
        ),
        feeMinor: option ? toMinor(option.fee.total, current.sourceCurrency) : null,
        quotedAt: new Date(),
      },
      include: { partner: true },
    });

    const transfer = await client.createTransfer({
      targetAccount: Number(current.partner.wiseRecipientId),
      quoteUuid: quote.id,
      customerTransactionId: current.reference,
      reference: current.reference,
    });

    current = await prisma.payout.update({
      where: { id: current.id },
      data: { wiseTransferId: String(transfer.id) },
      include: { partner: true },
    });
  }

  const funding = await client.fundTransfer(Number(current.wiseTransferId));

  return prisma.payout.update({
    where: { id: current.id },
    data: {
      status: funding.status === "COMPLETED" ? "SENT" : "FUNDED",
      fundedAt: new Date(),
    },
  });
}

/** Wise transfer states that mean the money reached the partner. */
const TERMINAL_OK = new Set(["outgoing_payment_sent", "funds_converted"]);
const TERMINAL_FAIL = new Set(["cancelled", "funds_refunded", "bounced_back"]);

export async function applyTransferState(
  wiseTransferId: string,
  state: string,
): Promise<Payout | null> {
  const payout = await prisma.payout.findFirst({ where: { wiseTransferId } });
  if (!payout) return null;

  if (TERMINAL_OK.has(state)) {
    return prisma.payout.update({
      where: { id: payout.id },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }
  if (TERMINAL_FAIL.has(state)) {
    return prisma.payout.update({
      where: { id: payout.id },
      data: { status: "FAILED", failureReason: state },
    });
  }
  return payout;
}
