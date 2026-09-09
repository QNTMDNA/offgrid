import { describe, expect, it } from "vitest";
import type { Contact, Lead, Opportunity, Race, RaceEdition } from "@prisma/client";
import { contactFields, leadFields, opportunityFields } from "@/lib/integrations/salesforce/mappers";

const contact = {
  id: "c1",
  accountId: null,
  email: "ada@example.com",
  firstName: "Ada",
  lastName: "Lovelace",
  phone: null,
  title: null,
  country: "United Kingdom",
  optedIn: false,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies Contact;

const lead = {
  id: "l1",
  contactId: "c1",
  accountId: null,
  source: "SPONSOR_INQUIRY",
  status: "NEW",
  company: null,
  message: null,
  interests: ["monaco", "suites"],
  partySize: 4,
  budgetMinor: 250_000_00,
  currency: "USD",
  editionId: null,
  touchId: null,
  ownerId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as Lead;

describe("salesforce mappers", () => {
  it("maps opt-out from marketing consent rather than contactability", () => {
    expect(contactFields(contact).HasOptedOutOfEmail).toBe(true);
    expect(contactFields({ ...contact, optedIn: true }).HasOptedOutOfEmail).toBe(false);
  });

  it("falls back to the person's name for the required Company field", () => {
    expect(leadFields({ ...lead, contact }).Company).toBe("Ada Lovelace");
    expect(leadFields({ ...lead, contact, company: "Maison Vert" }).Company).toBe("Maison Vert");
  });

  it("sends money to Salesforce in major units", () => {
    expect(leadFields({ ...lead, contact }).OffGrid_Budget__c).toBe(250_000);
  });

  it("formats opportunity close dates as Salesforce dates", () => {
    const edition = {
      season: 2026,
      race: { name: "Monaco Grand Prix" } as Race,
    } as RaceEdition & { race: Race };
    const opportunity = {
      name: "Monaco 2026 — Maison Vert",
      stage: "PROPOSAL",
      closeDate: new Date("2026-03-04T17:30:00Z"),
      amountMinor: 110_000_00,
      currency: "EUR",
      edition,
    } as unknown as Opportunity & { edition: RaceEdition & { race: Race } };

    const fields = opportunityFields(opportunity, { accountId: "001", contactId: "003" });
    expect(fields.CloseDate).toBe("2026-03-04");
    expect(fields.StageName).toBe("Proposal/Price Quote");
    expect(fields.Amount).toBe(110_000);
    expect(fields.OffGrid_Race_Edition__c).toBe("Monaco Grand Prix '26");
  });
});
