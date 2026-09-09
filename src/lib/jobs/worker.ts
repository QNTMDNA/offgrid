import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { MAX_ATTEMPTS, backoffUntil } from "@/lib/outbox";
import {
  syncContact,
  syncLead,
  syncOpportunity,
} from "@/lib/integrations/salesforce/sync";
import { executePayout } from "@/lib/integrations/wise/payouts";
import { issueTicketsForOrder } from "@/lib/integrations/speakeasy";
import { deliverCampaign } from "@/lib/marketing/campaigns";

export type DrainResult = { processed: number; failed: number; skipped: number };

/**
 * Drain the integration outbox.
 *
 * Events for a disabled integration are marked DONE rather than retried — a
 * deployment that has not been given Salesforce credentials should not build up
 * an unbounded backlog of doomed retries.
 */
export async function drainOutbox(limit = 25): Promise<DrainResult> {
  const now = new Date();
  const batch = await prisma.outboxEvent.findMany({
    where: { status: "PENDING", availableAt: { lte: now } },
    orderBy: { createdAt: "asc" },
    take: limit,
  });

  let processed = 0;
  let failed = 0;
  let skipped = 0;

  for (const event of batch) {
    const claimed = await prisma.outboxEvent.updateMany({
      where: { id: event.id, status: "PENDING" },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });
    if (claimed.count === 0) continue;

    if (!integrationEnabled(event.topic)) {
      skipped += 1;
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: {
          status: "DONE",
          processedAt: new Date(),
          lastError: "integration disabled",
        },
      });
      continue;
    }

    try {
      await handle(event.topic, event.payload as Record<string, string>);
      processed += 1;
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data: { status: "DONE", processedAt: new Date(), lastError: null },
      });
    } catch (error) {
      failed += 1;
      const attempts = event.attempts + 1;
      const message = error instanceof Error ? error.message : String(error);
      await prisma.outboxEvent.update({
        where: { id: event.id },
        data:
          attempts >= MAX_ATTEMPTS
            ? { status: "FAILED", lastError: message }
            : {
                status: "PENDING",
                lastError: message,
                availableAt: backoffUntil(attempts),
              },
      });
    }
  }

  return { processed, failed, skipped };
}

function integrationEnabled(topic: string): boolean {
  const e = env();
  if (topic.startsWith("salesforce.")) return e.SALESFORCE_ENABLED;
  if (topic.startsWith("wise.")) return e.WISE_ENABLED;
  // Speakeasy always has a working provider: the mock stands in when disabled.
  return true;
}

async function handle(topic: string, payload: Record<string, string>): Promise<void> {
  switch (topic) {
    case "salesforce.lead.upsert":
      await syncLead(payload.leadId);
      return;
    case "salesforce.contact.upsert":
      await syncContact(payload.contactId);
      return;
    case "salesforce.opportunity.upsert":
      await syncOpportunity(payload.opportunityId);
      return;
    case "wise.payout.execute":
      await executePayout(payload.payoutId);
      return;
    case "speakeasy.tickets.issue":
      await issueTicketsForOrder(payload.orderId);
      return;
    case "marketing.campaign.send":
      await deliverCampaign(payload.campaignId);
      return;
    default:
      throw new Error(`No handler registered for outbox topic ${topic}`);
  }
}
