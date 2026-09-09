import type { Order, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { confirmForOrder } from "@/lib/inventory";
import { enqueue } from "@/lib/outbox";
import {
  invoiceNumber,
  orderNumber,
  paymentReference,
} from "@/lib/commerce/numbering";
import { bankDetailsForCurrency } from "@/lib/integrations/wise/receiving";

/** Days a bank-transfer invoice stays open before operations chase it. */
export const INVOICE_TERMS_DAYS = 14;

export type BuyerInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  company?: string;
  country?: string;
  optedIn?: boolean;
};

export type GuestInput = {
  firstName: string;
  lastName: string;
  email: string;
  dietary?: string;
};

export type CheckoutResult = {
  order: Order;
  invoiceNumber: string;
  reference: string;
};

/**
 * Turn an open cart into an order plus a bank-transfer invoice.
 *
 * The whole thing is one transaction: contact/account upsert, order, items,
 * allocation confirmation, invoice, and the CRM outbox events. Either the
 * customer has an order and Salesforce will hear about it, or nothing happened.
 */
export async function checkout(
  cartToken: string,
  buyer: BuyerInput,
  guests: GuestInput[] = [],
  now = new Date(),
): Promise<CheckoutResult> {
  const cart = await prisma.cart.findUnique({
    where: { token: cartToken },
    include: { items: { include: { package: true } } },
  });
  if (!cart || cart.status !== "OPEN") throw new Error("Cart is not open");
  if (cart.items.length === 0) throw new Error("Cart is empty");

  const editionIds = new Set(cart.items.map((i) => i.package.editionId));
  if (editionIds.size !== 1) {
    throw new Error("A cart may only contain packages from a single race edition");
  }
  const editionId = [...editionIds][0];

  const subtotalMinor = cart.items.reduce((s, i) => s + i.priceMinor * i.units, 0);
  const reference = paymentReference(now);

  return prisma.$transaction(async (tx) => {
    const account = buyer.company
      ? await upsertAccount(tx, buyer.company, buyer.country)
      : null;

    const contact = await tx.contact.upsert({
      where: { email: buyer.email.toLowerCase() },
      create: {
        email: buyer.email.toLowerCase(),
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        phone: buyer.phone,
        country: buyer.country,
        optedIn: buyer.optedIn ?? false,
        accountId: account?.id,
      },
      update: {
        firstName: buyer.firstName,
        lastName: buyer.lastName,
        phone: buyer.phone ?? undefined,
        country: buyer.country ?? undefined,
        accountId: account?.id ?? undefined,
        ...(buyer.optedIn ? { optedIn: true } : {}),
      },
    });

    const order = await tx.order.create({
      data: {
        number: orderNumber(now),
        cartId: cart.id,
        contactId: contact.id,
        accountId: account?.id,
        status: "AWAITING_PAYMENT",
        currency: cart.currency,
        subtotalMinor,
        totalMinor: subtotalMinor,
        method: "WISE_BANK_TRANSFER",
        items: {
          create: cart.items.map((item) => ({
            packageId: item.packageId,
            packageName: item.package.name,
            units: item.units,
            priceMinor: item.priceMinor,
            totalMinor: item.priceMinor * item.units,
          })),
        },
      },
    });

    await confirmForOrder(cart.id, order.id, tx);
    await tx.cart.update({ where: { id: cart.id }, data: { status: "CONVERTED" } });

    if (guests.length > 0) {
      await tx.guest.createMany({
        data: guests.map((g) => ({
          orderId: order.id,
          editionId,
          firstName: g.firstName,
          lastName: g.lastName,
          email: g.email.toLowerCase(),
          dietary: g.dietary,
        })),
      });
    }

    const invoice = await tx.invoice.create({
      data: {
        orderId: order.id,
        number: invoiceNumber(now),
        status: "ISSUED",
        currency: cart.currency,
        amountMinor: subtotalMinor,
        dueAt: new Date(now.getTime() + INVOICE_TERMS_DAYS * 86_400_000),
        reference,
        bankDetails: bankDetailsForCurrency(cart.currency) as Prisma.InputJsonValue,
        issuedAt: now,
      },
    });

    const opportunity = await tx.opportunity.create({
      data: {
        name: `${order.number} — ${contact.firstName} ${contact.lastName}`,
        accountId: account?.id,
        contactId: contact.id,
        editionId,
        orderId: order.id,
        stage: "NEGOTIATION",
        amountMinor: subtotalMinor,
        currency: cart.currency,
        closeDate: invoice.dueAt,
      },
    });

    await enqueue("salesforce.contact.upsert", { contactId: contact.id }, tx);
    await enqueue("salesforce.opportunity.upsert", { opportunityId: opportunity.id }, tx);

    return { order, invoiceNumber: invoice.number, reference };
  });
}

async function upsertAccount(
  tx: Prisma.TransactionClient,
  name: string,
  country?: string,
) {
  const existing = await tx.account.findFirst({ where: { name } });
  if (existing) return existing;
  return tx.account.create({ data: { name, country, tier: "PROSPECT" } });
}

/**
 * Record a settled payment against an order. Idempotent on
 * (method, externalId) so a redelivered Wise webhook is a no-op.
 */
export async function recordPayment(input: {
  orderId: string;
  method: "WISE_BANK_TRANSFER" | "CARD" | "MANUAL";
  amountMinor: number;
  currency: string;
  externalId?: string;
  raw?: Prisma.InputJsonValue;
  now?: Date;
}): Promise<{ order: Order; alreadyRecorded: boolean }> {
  const now = input.now ?? new Date();

  if (input.externalId) {
    const seen = await prisma.payment.findUnique({
      where: {
        method_externalId: { method: input.method, externalId: input.externalId },
      },
    });
    if (seen) {
      const order = await prisma.order.findUniqueOrThrow({ where: { id: input.orderId } });
      return { order, alreadyRecorded: true };
    }
  }

  return prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: {
        orderId: input.orderId,
        method: input.method,
        status: "SETTLED",
        currency: input.currency,
        amountMinor: input.amountMinor,
        externalId: input.externalId,
        receivedAt: now,
        raw: input.raw,
      },
    });

    const current = await tx.order.findUniqueOrThrow({ where: { id: input.orderId } });
    const paidMinor = current.paidMinor + input.amountMinor;
    const settled = paidMinor >= current.totalMinor;

    const order = await tx.order.update({
      where: { id: current.id },
      data: { paidMinor, status: settled ? "PAID" : current.status },
    });

    if (settled) {
      await tx.invoice.updateMany({
        where: { orderId: order.id },
        data: { status: "PAID", paidAt: now },
      });
      await tx.opportunity.updateMany({
        where: { orderId: order.id },
        data: { stage: "CLOSED_WON" },
      });
      await enqueue("speakeasy.tickets.issue", { orderId: order.id }, tx);
      const opp = await tx.opportunity.findFirst({ where: { orderId: order.id } });
      if (opp) {
        await enqueue("salesforce.opportunity.upsert", { opportunityId: opp.id }, tx);
      }
    }

    return { order, alreadyRecorded: false };
  });
}
