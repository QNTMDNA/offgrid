import type { IntegrationSystem } from "@prisma/client";
import { prisma } from "@/lib/db";
import { SalesforceClient } from "@/lib/integrations/salesforce/client";
import {
  accountFields,
  contactFields,
  leadFields,
  opportunityFields,
} from "@/lib/integrations/salesforce/mappers";

const SYSTEM: IntegrationSystem = "SALESFORCE";

async function rememberLink(
  entity: string,
  localId: string,
  externalId: string,
): Promise<void> {
  await prisma.integrationLink.upsert({
    where: { system_entity_localId: { system: SYSTEM, entity, localId } },
    create: { system: SYSTEM, entity, localId, externalId },
    update: { externalId, syncedAt: new Date() },
  });
}

async function linkedId(entity: string, localId: string): Promise<string | undefined> {
  const link = await prisma.integrationLink.findUnique({
    where: { system_entity_localId: { system: SYSTEM, entity, localId } },
  });
  return link?.externalId;
}

export async function syncAccount(
  accountId: string,
  client = SalesforceClient.fromEnv(),
): Promise<string> {
  const account = await prisma.account.findUniqueOrThrow({ where: { id: accountId } });
  const { id } = await client.upsert("Account", account.id, accountFields(account));
  await rememberLink("Account", account.id, id);
  return id;
}

/** Contacts drag their account along so the Salesforce record is never orphaned. */
export async function syncContact(
  contactId: string,
  client = SalesforceClient.fromEnv(),
): Promise<string> {
  const contact = await prisma.contact.findUniqueOrThrow({ where: { id: contactId } });
  const sfAccountId = contact.accountId
    ? await syncAccount(contact.accountId, client)
    : undefined;

  const { id } = await client.upsert(
    "Contact",
    contact.id,
    contactFields(contact, sfAccountId),
  );
  await rememberLink("Contact", contact.id, id);
  return id;
}

export async function syncLead(
  leadId: string,
  client = SalesforceClient.fromEnv(),
): Promise<string> {
  const lead = await prisma.lead.findUniqueOrThrow({
    where: { id: leadId },
    include: { contact: true, touch: true },
  });
  const { id } = await client.upsert("Lead", lead.id, leadFields(lead));
  await rememberLink("Lead", lead.id, id);
  return id;
}

export async function syncOpportunity(
  opportunityId: string,
  client = SalesforceClient.fromEnv(),
): Promise<string> {
  const opportunity = await prisma.opportunity.findUniqueOrThrow({
    where: { id: opportunityId },
    include: { edition: { include: { race: true } } },
  });

  const accountId = opportunity.accountId
    ? ((await linkedId("Account", opportunity.accountId)) ??
      (await syncAccount(opportunity.accountId, client)))
    : undefined;
  const contactId = opportunity.contactId
    ? ((await linkedId("Contact", opportunity.contactId)) ??
      (await syncContact(opportunity.contactId, client)))
    : undefined;

  const { id } = await client.upsert(
    "Opportunity",
    opportunity.id,
    opportunityFields(opportunity, { accountId, contactId }),
  );
  await rememberLink("Opportunity", opportunity.id, id);
  return id;
}

/**
 * Pull owner and stage back from Salesforce for opportunities a rep has since
 * touched. Sales Cloud is the system of record for pipeline once a deal exists,
 * so local stage is overwritten rather than merged.
 */
export async function pullOpportunityUpdates(
  client = SalesforceClient.fromEnv(),
): Promise<number> {
  const links = await prisma.integrationLink.findMany({
    where: { system: SYSTEM, entity: "Opportunity" },
    select: { localId: true, externalId: true },
  });
  if (links.length === 0) return 0;

  const byExternal = new Map(links.map((l) => [l.externalId, l.localId]));
  const ids = [...byExternal.keys()].map((id) => `'${id}'`).join(",");
  const records = await client.query<{
    Id: string;
    StageName: string;
    Owner: { Email: string } | null;
  }>(`SELECT Id, StageName, Owner.Email FROM Opportunity WHERE Id IN (${ids})`);

  const STAGE_BACK: Record<string, string> = {
    Qualification: "QUALIFICATION",
    "Proposal/Price Quote": "PROPOSAL",
    "Negotiation/Review": "NEGOTIATION",
    "Closed Won": "CLOSED_WON",
    "Closed Lost": "CLOSED_LOST",
  };

  let updated = 0;
  for (const record of records) {
    const localId = byExternal.get(record.Id);
    const stage = STAGE_BACK[record.StageName];
    if (!localId || !stage) continue;
    await prisma.opportunity.update({
      where: { id: localId },
      data: {
        stage: stage as never,
        ownerEmail: record.Owner?.Email ?? undefined,
      },
    });
    updated += 1;
  }
  return updated;
}
