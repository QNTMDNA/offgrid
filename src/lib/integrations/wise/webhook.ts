import { createVerify } from "node:crypto";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { toMinor } from "@/lib/money";
import { recordPayment } from "@/lib/commerce/orders";
import { applyTransferState } from "@/lib/integrations/wise/payouts";

/**
 * Wise signs every webhook delivery with its own key and puts the base64
 * signature in `X-Signature-SHA256`. The signature covers the raw body, so the
 * route must hand us the unparsed text.
 */
export function verifySignature(rawBody: string, signature: string): boolean {
  const publicKey = env().WISE_WEBHOOK_PUBLIC_KEY;
  if (!publicKey) return false;
  try {
    return createVerify("RSA-SHA256")
      .update(rawBody)
      .verify(publicKey, signature, "base64");
  } catch {
    return false;
  }
}

type TransferStateChange = {
  event_type: "transfers#state-change";
  data: { resource: { id: number }; current_state: string };
};

type BalanceCredit = {
  event_type: "balances#credit";
  data: {
    resource: { id: number };
    amount: number;
    currency: string;
    transaction_type: string;
    post_transaction_balance_amount?: number;
    occurred_at?: string;
  };
};

export type WiseWebhookEvent = TransferStateChange | BalanceCredit;

export type WebhookOutcome =
  | { handled: true; kind: "payout"; payoutId: string | null }
  | { handled: true; kind: "payment"; orderId: string | null }
  | { handled: false; reason: string };

/**
 * Process one delivery. `deliveryId` (Wise's `X-Delivery-Id`) is persisted
 * first, so a redelivery short-circuits before touching any domain state.
 */
export async function handleWebhook(
  deliveryId: string,
  event: WiseWebhookEvent,
  reference?: string,
): Promise<WebhookOutcome> {
  const existing = await prisma.webhookDelivery.findUnique({
    where: { system_externalId: { system: "WISE", externalId: deliveryId } },
  });
  if (existing?.processedAt) return { handled: false, reason: "duplicate delivery" };

  await prisma.webhookDelivery.upsert({
    where: { system_externalId: { system: "WISE", externalId: deliveryId } },
    create: {
      system: "WISE",
      externalId: deliveryId,
      eventType: event.event_type,
      payload: event as unknown as object,
    },
    update: {},
  });

  const outcome = await dispatch(event, reference);

  await prisma.webhookDelivery.update({
    where: { system_externalId: { system: "WISE", externalId: deliveryId } },
    data: { processedAt: new Date() },
  });

  return outcome;
}

async function dispatch(
  event: WiseWebhookEvent,
  reference?: string,
): Promise<WebhookOutcome> {
  if (event.event_type === "transfers#state-change") {
    const payout = await applyTransferState(
      String(event.data.resource.id),
      event.data.current_state,
    );
    return { handled: true, kind: "payout", payoutId: payout?.id ?? null };
  }

  if (event.event_type === "balances#credit") {
    const orderId = await reconcileCredit(event, reference);
    return { handled: true, kind: "payment", orderId };
  }

  return { handled: false, reason: "unsupported event type" };
}

/**
 * Match an incoming deposit to an open invoice by payment reference.
 *
 * Wise's balance-credit payload does not carry the payer's reference in a
 * dependable field, so the route passes whatever reference-like string it could
 * find. Anything unmatched is deliberately left for manual reconciliation
 * rather than guessed at by amount.
 */
async function reconcileCredit(
  event: BalanceCredit,
  reference?: string,
): Promise<string | null> {
  if (!reference) return null;

  const invoice = await prisma.invoice.findFirst({
    where: { reference: reference.trim().toUpperCase(), status: "ISSUED" },
  });
  if (!invoice) return null;

  const { order } = await recordPayment({
    orderId: invoice.orderId,
    method: "WISE_BANK_TRANSFER",
    amountMinor: toMinor(event.data.amount, event.data.currency),
    currency: event.data.currency,
    externalId: `wise-credit-${event.data.resource.id}-${event.data.occurred_at ?? ""}`,
    raw: event as unknown as object,
  });

  return order.id;
}
