import { randomBytes } from "node:crypto";
import type { Subscriber } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Double opt-in. A new address lands as PENDING with a confirm token; only a
 * confirmed address is ever eligible for a campaign, which keeps the sending
 * domain clean and satisfies GDPR consent records.
 */
export async function subscribe(input: {
  email: string;
  tags?: string[];
  touchId?: string;
}): Promise<{ subscriber: Subscriber; confirmToken: string | null }> {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.subscriber.findUnique({ where: { email } });

  if (existing?.status === "SUBSCRIBED") {
    return { subscriber: existing, confirmToken: null };
  }

  const confirmToken = randomBytes(24).toString("base64url");
  const subscriber = await prisma.subscriber.upsert({
    where: { email },
    create: {
      email,
      status: "PENDING",
      confirmToken,
      tags: input.tags ?? [],
      touchId: input.touchId,
    },
    update: {
      status: "PENDING",
      confirmToken,
      unsubscribedAt: null,
      tags: input.tags?.length ? { set: input.tags } : undefined,
    },
  });

  return { subscriber, confirmToken };
}

export async function confirm(token: string): Promise<Subscriber | null> {
  const subscriber = await prisma.subscriber.findUnique({
    where: { confirmToken: token },
  });
  if (!subscriber) return null;

  const contact = await prisma.contact.findUnique({
    where: { email: subscriber.email },
  });

  return prisma.subscriber.update({
    where: { id: subscriber.id },
    data: {
      status: "SUBSCRIBED",
      confirmedAt: new Date(),
      confirmToken: null,
      contactId: subscriber.contactId ?? contact?.id,
    },
  });
}

export async function unsubscribe(email: string): Promise<void> {
  const normalised = email.trim().toLowerCase();
  await prisma.subscriber.updateMany({
    where: { email: normalised },
    data: { status: "UNSUBSCRIBED", unsubscribedAt: new Date() },
  });
  await prisma.contact.updateMany({
    where: { email: normalised },
    data: { optedIn: false },
  });
}
