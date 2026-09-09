import { createHash, randomUUID } from "node:crypto";
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
 * In-memory Speakeasy stand-in used in development, tests, and any environment
 * without partner credentials. Ticket codes are deterministic per guest so the
 * same guest always renders the same code across restarts.
 */
export class SpeakeasyMockProvider implements SpeakeasyProvider {
  readonly name = "speakeasy-mock";

  private readonly events = new Map<string, SpeakeasyEvent>();
  private readonly tickets = new Map<string, SpeakeasyTicket[]>();
  private readonly checkIns = new Map<string, SpeakeasyCheckIn[]>();

  async upsertEvent(input: SpeakeasyEventInput): Promise<SpeakeasyEvent> {
    const existing = this.events.get(input.externalId);
    const event: SpeakeasyEvent = existing ?? {
      id: `mock-evt-${input.externalId}`,
      externalId: input.externalId,
      status: "published",
    };
    this.events.set(input.externalId, event);
    this.events.set(event.id, event);
    return event;
  }

  async issueTickets(
    eventId: string,
    tickets: SpeakeasyTicketInput[],
  ): Promise<SpeakeasyTicket[]> {
    const issued = tickets.map<SpeakeasyTicket>((t) => ({
      id: `mock-tkt-${randomUUID()}`,
      guestExternalId: t.guestExternalId,
      code: ticketCode(t.guestExternalId),
      status: "issued",
    }));
    this.tickets.set(eventId, [...(this.tickets.get(eventId) ?? []), ...issued]);
    return issued;
  }

  async voidTicket(ticketId: string): Promise<void> {
    for (const list of this.tickets.values()) {
      const found = list.find((t) => t.id === ticketId);
      if (found) found.status = "void";
    }
  }

  async listCheckIns(eventId: string, since?: Date): Promise<SpeakeasyCheckIn[]> {
    const all = this.checkIns.get(eventId) ?? [];
    return since ? all.filter((c) => c.checkedInAt > since) : all;
  }

  async listSpend(): Promise<SpeakeasySpend[]> {
    return [];
  }

  /** Test hook: simulate a guest scanning in at the door. */
  recordCheckIn(eventId: string, guestExternalId: string, at = new Date()): void {
    const ticket = (this.tickets.get(eventId) ?? []).find(
      (t) => t.guestExternalId === guestExternalId,
    );
    if (!ticket) throw new Error(`No ticket issued for guest ${guestExternalId}`);
    ticket.status = "checked_in";
    this.checkIns.set(eventId, [
      ...(this.checkIns.get(eventId) ?? []),
      { ticketId: ticket.id, guestExternalId, checkedInAt: at },
    ]);
  }
}

function ticketCode(guestExternalId: string): string {
  return createHash("sha256")
    .update(guestExternalId)
    .digest("hex")
    .slice(0, 8)
    .toUpperCase();
}
