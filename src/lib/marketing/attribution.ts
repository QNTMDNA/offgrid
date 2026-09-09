import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";

export const ANON_COOKIE = "ogr_aid";
export const TOUCH_COOKIE = "ogr_touch";

export function newAnonymousId(): string {
  return randomBytes(16).toString("base64url");
}

export type TouchInput = {
  anonymousId: string;
  landingPath: string;
  referrer?: string;
  params: URLSearchParams;
};

/**
 * Record a first-touch attribution row.
 *
 * Only landings that actually carry campaign parameters (or an external
 * referrer) are stored — otherwise every internal navigation would create a
 * touch and dilute the attribution table.
 */
export async function recordTouch(input: TouchInput): Promise<string | null> {
  const source = input.params.get("utm_source") ?? undefined;
  const medium = input.params.get("utm_medium") ?? undefined;
  const campaign = input.params.get("utm_campaign") ?? undefined;

  if (!source && !medium && !campaign && !input.referrer) return null;

  const touch = await prisma.touch.create({
    data: {
      anonymousId: input.anonymousId,
      source,
      medium,
      campaign,
      content: input.params.get("utm_content") ?? undefined,
      term: input.params.get("utm_term") ?? undefined,
      referrer: input.referrer,
      landingPath: input.landingPath,
    },
  });
  return touch.id;
}

export type ChannelReport = Array<{
  source: string;
  medium: string;
  touches: number;
  leads: number;
}>;

/** Leads grouped by first-touch channel, for the marketing dashboard. */
export async function channelReport(since: Date): Promise<ChannelReport> {
  const touches = await prisma.touch.findMany({
    where: { createdAt: { gte: since } },
    select: { source: true, medium: true, leads: { select: { id: true } } },
  });

  const rows = new Map<string, { source: string; medium: string; touches: number; leads: number }>();
  for (const touch of touches) {
    const source = touch.source ?? "direct";
    const medium = touch.medium ?? "none";
    const key = `${source}|${medium}`;
    const row = rows.get(key) ?? { source, medium, touches: 0, leads: 0 };
    row.touches += 1;
    row.leads += touch.leads.length;
    rows.set(key, row);
  }

  return [...rows.values()].sort((a, b) => b.leads - a.leads || b.touches - a.touches);
}
