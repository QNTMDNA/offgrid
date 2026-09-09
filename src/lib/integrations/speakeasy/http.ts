import { env } from "@/lib/env";
import type {
  SpeakeasyCheckIn,
  SpeakeasyEvent,
  SpeakeasyEventInput,
  SpeakeasyProvider,
  SpeakeasySpend,
  SpeakeasyTicket,
  SpeakeasyTicketInput,
} from "@/lib/integrations/speakeasy/types";

/**
 * HTTP adapter for the Speakeasy partner API.
 *
 * Paths and payload shapes follow the partner integration brief and are kept in
 * one place; confirm them against the credentials pack before enabling
 * SPEAKEASY_ENABLED in production.
 */
export class SpeakeasyHttpProvider implements SpeakeasyProvider {
  readonly name = "speakeasy-http";

  constructor(
    private readonly baseUrl: string,
    private readonly apiKey: string,
    private readonly venueId: string,
  ) {}

  static fromEnv(): SpeakeasyHttpProvider {
    const e = env();
    if (!e.SPEAKEASY_API_KEY || !e.SPEAKEASY_VENUE_ID) {
      throw new Error("SPEAKEASY_API_KEY and SPEAKEASY_VENUE_ID are required");
    }
    return new SpeakeasyHttpProvider(
      e.SPEAKEASY_API_URL,
      e.SPEAKEASY_API_KEY,
      e.SPEAKEASY_VENUE_ID,
    );
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "X-Venue-Id": this.venueId,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(
        `Speakeasy ${method} ${path} failed with ${response.status}: ${text.slice(0, 500)}`,
      );
    }
    return (text ? JSON.parse(text) : null) as T;
  }

  async upsertEvent(input: SpeakeasyEventInput): Promise<SpeakeasyEvent> {
    return this.request<SpeakeasyEvent>("PUT", `/v1/events/${input.externalId}`, {
      name: input.name,
      venue: input.venue,
      starts_at: input.startsAt.toISOString(),
      ends_at: input.endsAt.toISOString(),
      capacity: input.capacity,
      timezone: input.timezone,
    });
  }

  async issueTickets(
    eventId: string,
    tickets: SpeakeasyTicketInput[],
  ): Promise<SpeakeasyTicket[]> {
    const { tickets: issued } = await this.request<{ tickets: SpeakeasyTicket[] }>(
      "POST",
      `/v1/events/${eventId}/tickets`,
      {
        tickets: tickets.map((t) => ({
          external_id: t.guestExternalId,
          first_name: t.firstName,
          last_name: t.lastName,
          email: t.email,
          tier: t.tier,
          notes: t.notes,
        })),
      },
    );
    return issued;
  }

  async voidTicket(ticketId: string): Promise<void> {
    await this.request<null>("DELETE", `/v1/tickets/${ticketId}`);
  }

  async listCheckIns(eventId: string, since?: Date): Promise<SpeakeasyCheckIn[]> {
    const query = since ? `?since=${encodeURIComponent(since.toISOString())}` : "";
    const { check_ins } = await this.request<{
      check_ins: Array<{ ticket_id: string; external_id: string; checked_in_at: string }>;
    }>("GET", `/v1/events/${eventId}/check-ins${query}`);
    return check_ins.map((c) => ({
      ticketId: c.ticket_id,
      guestExternalId: c.external_id,
      checkedInAt: new Date(c.checked_in_at),
    }));
  }

  async listSpend(eventId: string, since?: Date): Promise<SpeakeasySpend[]> {
    const query = since ? `?since=${encodeURIComponent(since.toISOString())}` : "";
    const { spend } = await this.request<{
      spend: Array<{
        external_id: string;
        amount_minor: number;
        currency: string;
        occurred_at: string;
      }>;
    }>("GET", `/v1/events/${eventId}/spend${query}`);
    return spend.map((s) => ({
      guestExternalId: s.external_id,
      amountMinor: s.amount_minor,
      currency: s.currency,
      occurredAt: new Date(s.occurred_at),
    }));
  }
}
