import type { Lead, LeadSource } from "@prisma/client";
import { prisma } from "@/lib/db";
import { enqueue } from "@/lib/outbox";

export type LeadInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  country?: string;
  company?: string;
  title?: string;
  message?: string;
  interests?: string[];
  partySize?: number;
  budgetMinor?: number;
  currency?: string;
  source: LeadSource;
  optIn?: boolean;
  touchId?: string;
};

/**
 * Capture an inbound enquiry.
 *
 * The contact is upserted by email so repeat enquiries build one profile, and
 * the Salesforce push goes through the outbox — a Salesforce outage must never
 * make the site drop a lead.
 */
export async function captureLead(input: LeadInput): Promise<Lead> {
  const email = input.email.trim().toLowerCase();

  return prisma.$transaction(async (tx) => {
    const account = input.company
      ? ((await tx.account.findFirst({ where: { name: input.company } })) ??
        (await tx.account.create({
          data: {
            name: input.company,
            country: input.country,
            tier: input.source === "SPONSOR_INQUIRY" ? "PROSPECT" : "PROSPECT",
          },
        })))
      : null;

    const contact = await tx.contact.upsert({
      where: { email },
      create: {
        email,
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone,
        title: input.title,
        country: input.country,
        optedIn: input.optIn ?? false,
        accountId: account?.id,
      },
      update: {
        firstName: input.firstName,
        lastName: input.lastName,
        phone: input.phone ?? undefined,
        title: input.title ?? undefined,
        country: input.country ?? undefined,
        accountId: account?.id ?? undefined,
        ...(input.optIn ? { optedIn: true } : {}),
      },
    });

    const lead = await tx.lead.create({
      data: {
        contactId: contact.id,
        source: input.source,
        company: input.company,
        message: input.message,
        interests: input.interests ?? [],
        partySize: input.partySize,
        budgetMinor: input.budgetMinor,
        currency: input.currency,
        touchId: input.touchId,
      },
    });

    await tx.activity.create({
      data: {
        contactId: contact.id,
        kind: "SYSTEM",
        subject: `Lead captured — ${input.source}`,
        body: input.message ?? undefined,
        actor: "website",
      },
    });

    if (input.optIn) {
      await tx.subscriber.upsert({
        where: { email },
        create: {
          email,
          contactId: contact.id,
          status: "SUBSCRIBED",
          confirmedAt: new Date(),
          tags: input.interests ?? [],
          touchId: input.touchId,
        },
        update: { status: "SUBSCRIBED", contactId: contact.id },
      });
    }

    await enqueue("salesforce.lead.upsert", { leadId: lead.id }, tx);

    return lead;
  });
}

/**
 * Promote a qualified lead into an opportunity. Off Grid works deals by race
 * edition, so the edition is required rather than inferred.
 */
export async function qualifyLead(
  leadId: string,
  input: { editionId: string; amountMinor: number; currency: string; closeDate: Date },
): Promise<string> {
  return prisma.$transaction(async (tx) => {
    const lead = await tx.lead.findUniqueOrThrow({
      where: { id: leadId },
      include: { contact: true },
    });

    const opportunity = await tx.opportunity.create({
      data: {
        name: `${lead.company ?? `${lead.contact.firstName} ${lead.contact.lastName}`} — ${input.currency} ${input.amountMinor / 100}`,
        accountId: lead.contact.accountId,
        contactId: lead.contactId,
        editionId: input.editionId,
        amountMinor: input.amountMinor,
        currency: input.currency,
        closeDate: input.closeDate,
        stage: "QUALIFICATION",
      },
    });

    await tx.lead.update({ where: { id: leadId }, data: { status: "CONVERTED" } });
    await enqueue("salesforce.opportunity.upsert", { opportunityId: opportunity.id }, tx);

    return opportunity.id;
  });
}
