import type {
  Account,
  Contact,
  Lead,
  LeadSource,
  Opportunity,
  OpportunityStage,
  RaceEdition,
  Race,
  Touch,
} from "@prisma/client";
import { fromMinor } from "@/lib/money";

/**
 * Off Grid → Salesforce field mapping.
 *
 * Custom fields (`*__c`) are listed in docs/salesforce.md and must exist in the
 * org before sync is enabled. Standard picklists are mapped explicitly so a
 * rename on either side is a one-line change here.
 */

const LEAD_SOURCE: Record<LeadSource, string> = {
  REQUEST_ACCESS: "Web — Request Access",
  SPONSOR_INQUIRY: "Web — Sponsor Inquiry",
  NEWSLETTER: "Web — Newsletter",
  REFERRAL: "Referral",
  IMPORT: "Import",
};

const OPPORTUNITY_STAGE: Record<OpportunityStage, string> = {
  QUALIFICATION: "Qualification",
  PROPOSAL: "Proposal/Price Quote",
  NEGOTIATION: "Negotiation/Review",
  CLOSED_WON: "Closed Won",
  CLOSED_LOST: "Closed Lost",
};

export function accountFields(account: Account): Record<string, unknown> {
  return {
    Name: account.name,
    Website: account.website ?? undefined,
    BillingCountry: account.country ?? undefined,
    Description: account.notes ?? undefined,
    OffGrid_Tier__c: account.tier,
  };
}

export function contactFields(
  contact: Contact,
  salesforceAccountId?: string,
): Record<string, unknown> {
  return {
    FirstName: contact.firstName,
    LastName: contact.lastName,
    Email: contact.email,
    Phone: contact.phone ?? undefined,
    Title: contact.title ?? undefined,
    MailingCountry: contact.country ?? undefined,
    HasOptedOutOfEmail: !contact.optedIn,
    AccountId: salesforceAccountId,
  };
}

export function leadFields(
  lead: Lead & { contact: Contact; touch?: Touch | null },
): Record<string, unknown> {
  return {
    FirstName: lead.contact.firstName,
    LastName: lead.contact.lastName,
    Email: lead.contact.email,
    Phone: lead.contact.phone ?? undefined,
    // Salesforce requires Company on Lead; fall back to the person's name for
    // individual enquiries so the insert never fails validation.
    Company: lead.company ?? `${lead.contact.firstName} ${lead.contact.lastName}`,
    Country: lead.contact.country ?? undefined,
    LeadSource: LEAD_SOURCE[lead.source],
    Description: lead.message ?? undefined,
    OffGrid_Interests__c: lead.interests.join(";"),
    OffGrid_Party_Size__c: lead.partySize ?? undefined,
    OffGrid_Budget__c:
      lead.budgetMinor != null && lead.currency
        ? fromMinor(lead.budgetMinor, lead.currency)
        : undefined,
    OffGrid_UTM_Source__c: lead.touch?.source ?? undefined,
    OffGrid_UTM_Medium__c: lead.touch?.medium ?? undefined,
    OffGrid_UTM_Campaign__c: lead.touch?.campaign ?? undefined,
  };
}

export function opportunityFields(
  opportunity: Opportunity & { edition?: (RaceEdition & { race: Race }) | null },
  ids: { accountId?: string; contactId?: string },
): Record<string, unknown> {
  return {
    Name: opportunity.name,
    StageName: OPPORTUNITY_STAGE[opportunity.stage],
    CloseDate: opportunity.closeDate.toISOString().slice(0, 10),
    Amount: fromMinor(opportunity.amountMinor, opportunity.currency),
    CurrencyIsoCode: opportunity.currency,
    AccountId: ids.accountId,
    OffGrid_Primary_Contact__c: ids.contactId,
    OffGrid_Race_Edition__c: opportunity.edition
      ? `${opportunity.edition.race.name} '${String(opportunity.edition.season).slice(-2)}`
      : undefined,
  };
}

export { LEAD_SOURCE, OPPORTUNITY_STAGE };
