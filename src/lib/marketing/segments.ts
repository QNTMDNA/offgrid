import { z } from "zod";
import type { Prisma } from "@prisma/client";

/**
 * Segment rules are stored as JSON so audiences can be edited from the admin
 * without a deploy. A rule set compiles to a Prisma `where` clause; the schema
 * below is the whole supported grammar — anything else is rejected at save time
 * rather than producing a silently wrong audience.
 */

export const segmentRulesSchema = z.object({
  /** Subscriber lifecycle states to include. Defaults to SUBSCRIBED only. */
  status: z
    .array(z.enum(["PENDING", "SUBSCRIBED", "UNSUBSCRIBED", "BOUNCED"]))
    .default(["SUBSCRIBED"]),
  /** Subscriber must carry every one of these tags. */
  allTags: z.array(z.string()).default([]),
  /** Subscriber must carry at least one of these tags. */
  anyTags: z.array(z.string()).default([]),
  /** Subscriber must carry none of these tags. */
  noneTags: z.array(z.string()).default([]),
  /** Only subscribers created on or after this ISO date. */
  createdAfter: z.string().datetime().optional(),
  /** Only subscribers linked to a contact that has bought at least once. */
  hasPurchased: z.boolean().optional(),
  /** Only subscribers whose contact has an order for this race edition. */
  editionId: z.string().optional(),
});

export type SegmentRules = z.infer<typeof segmentRulesSchema>;

export function parseRules(raw: unknown): SegmentRules {
  return segmentRulesSchema.parse(raw ?? {});
}

export function rulesToWhere(rules: SegmentRules): Prisma.SubscriberWhereInput {
  const where: Prisma.SubscriberWhereInput = { status: { in: rules.status } };

  if (rules.allTags.length > 0) where.tags = { hasEvery: rules.allTags };
  if (rules.anyTags.length > 0) {
    where.AND = [...toArray(where.AND), { tags: { hasSome: rules.anyTags } }];
  }
  if (rules.noneTags.length > 0) {
    where.NOT = { tags: { hasSome: rules.noneTags } };
  }
  if (rules.createdAfter) where.createdAt = { gte: new Date(rules.createdAfter) };

  const orderFilter: Prisma.OrderListRelationFilter | undefined = rules.editionId
    ? { some: { items: { some: { package: { editionId: rules.editionId } } } } }
    : rules.hasPurchased
      ? { some: { status: { in: ["PAID", "PARTIALLY_REFUNDED"] } } }
      : undefined;

  if (orderFilter) where.contact = { is: { orders: orderFilter } };

  return where;
}

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}
