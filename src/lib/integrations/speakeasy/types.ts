/**
 * Speakeasy (speakeasygo.com) provider contract.
 *
 * Speakeasy does not publish an open API reference; integrations are provisioned
 * per partner and their team scopes the endpoints during onboarding. This
 * interface is the contract Off Grid depends on — the HTTP adapter in
 * `http.ts` is the only place that needs to change once partner credentials and
 * the final endpoint shapes are supplied, and `mock.ts` keeps the platform fully
 * functional until then.
 */

export type SpeakeasyEventInput = {
  /** Local race-edition id, sent as the partner's external reference. */
  externalId: string;
  name: string;
  venue: string;
  startsAt: Date;
  endsAt: Date;
  capacity: number;
  timezone: string;
};

export type SpeakeasyEvent = {
  id: string;
  externalId: string;
  status: "draft" | "published" | "closed";
};

export type SpeakeasyTicketInput = {
  guestExternalId: string;
  firstName: string;
  lastName: string;
  email: string;
  /** Package name, surfaced to door staff on scan. */
  tier: string;
  notes?: string;
};

export type SpeakeasyTicket = {
  id: string;
  guestExternalId: string;
  code: string;
  status: "issued" | "checked_in" | "void";
};

export type SpeakeasyCheckIn = {
  ticketId: string;
  guestExternalId: string;
  checkedInAt: Date;
};

/** POS spend attributed to a guest, used to enrich CRM profiles. */
export type SpeakeasySpend = {
  guestExternalId: string;
  amountMinor: number;
  currency: string;
  occurredAt: Date;
};

export interface SpeakeasyProvider {
  readonly name: string;
  upsertEvent(input: SpeakeasyEventInput): Promise<SpeakeasyEvent>;
  issueTickets(
    eventId: string,
    tickets: SpeakeasyTicketInput[],
  ): Promise<SpeakeasyTicket[]>;
  voidTicket(ticketId: string): Promise<void>;
  listCheckIns(eventId: string, since?: Date): Promise<SpeakeasyCheckIn[]>;
  listSpend(eventId: string, since?: Date): Promise<SpeakeasySpend[]>;
}
