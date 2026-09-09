import type { IntegrationSystem, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "@/lib/db";

export type Topic =
  | "salesforce.lead.upsert"
  | "salesforce.contact.upsert"
  | "salesforce.account.upsert"
  | "salesforce.opportunity.upsert"
  | "wise.payout.execute"
  | "speakeasy.tickets.issue"
  | "marketing.campaign.send";

const SYSTEM_BY_PREFIX: Record<string, IntegrationSystem> = {
  salesforce: "SALESFORCE",
  wise: "WISE",
  speakeasy: "SPEAKEASY",
  marketing: "SALESFORCE",
};

type Client = PrismaClient | Prisma.TransactionClient;

/**
 * Enqueue an integration event. Call inside the same transaction as the domain
 * write so an event is never published for a write that rolled back.
 */
export async function enqueue(
  topic: Topic,
  payload: Prisma.InputJsonValue,
  client: Client = prisma,
): Promise<void> {
  const system = SYSTEM_BY_PREFIX[topic.split(".")[0]];
  await client.outboxEvent.create({ data: { system, topic, payload } });
}

const BACKOFF_SECONDS = [30, 120, 600, 3600];
export const MAX_ATTEMPTS = BACKOFF_SECONDS.length + 1;

export function backoffUntil(attempts: number, now = new Date()): Date {
  const seconds = BACKOFF_SECONDS[Math.min(attempts, BACKOFF_SECONDS.length) - 1] ?? 30;
  return new Date(now.getTime() + seconds * 1000);
}
