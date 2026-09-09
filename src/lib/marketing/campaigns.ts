import type { Campaign, Subscriber } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { renderMarkdown, toPlainText } from "@/lib/marketing/markdown";
import { parseRules, rulesToWhere } from "@/lib/marketing/segments";

export async function audienceFor(segmentId: string): Promise<Subscriber[]> {
  const segment = await prisma.segment.findUniqueOrThrow({ where: { id: segmentId } });
  return prisma.subscriber.findMany({ where: rulesToWhere(parseRules(segment.rules)) });
}

/**
 * Materialise the audience as QUEUED sends. Doing this before delivery means
 * the recipient list is frozen at launch and a crashed send resumes exactly
 * where it stopped instead of re-mailing everyone.
 */
export async function queueCampaign(campaignId: string): Promise<number> {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
  });
  if (campaign.status !== "DRAFT" && campaign.status !== "SCHEDULED") {
    throw new Error(`Campaign ${campaign.name} is ${campaign.status}; cannot queue`);
  }

  const audience = await audienceFor(campaign.segmentId);
  await prisma.$transaction([
    prisma.campaignSend.createMany({
      data: audience.map((s) => ({ campaignId, subscriberId: s.id })),
      skipDuplicates: true,
    }),
    prisma.campaign.update({ where: { id: campaignId }, data: { status: "SENDING" } }),
  ]);

  return audience.length;
}

/** Deliver a slice of queued sends. Returns how many were attempted. */
export async function deliverCampaign(
  campaignId: string,
  batchSize = 50,
): Promise<{ sent: number; failed: number; remaining: number }> {
  const campaign = await prisma.campaign.findUniqueOrThrow({
    where: { id: campaignId },
  });

  const batch = await prisma.campaignSend.findMany({
    where: { campaignId, status: "QUEUED" },
    include: { subscriber: true },
    take: batchSize,
  });

  let sent = 0;
  let failed = 0;

  for (const item of batch) {
    const result = await sendEmail({
      to: item.subscriber.email,
      subject: campaign.subject,
      html: campaignHtml(campaign, item.subscriber.email),
      text: toPlainText(campaign.bodyMarkdown),
    });

    if (result.error) {
      failed += 1;
      await prisma.campaignSend.update({
        where: { id: item.id },
        data: { status: "FAILED", error: result.error },
      });
    } else {
      sent += 1;
      await prisma.campaignSend.update({
        where: { id: item.id },
        data: { status: "SENT", sentAt: new Date() },
      });
    }
  }

  const remaining = await prisma.campaignSend.count({
    where: { campaignId, status: "QUEUED" },
  });
  if (remaining === 0) {
    await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: "SENT", sentAt: new Date() },
    });
  }

  return { sent, failed, remaining };
}

function campaignHtml(campaign: Campaign, email: string): string {
  const unsubscribe = `${env().APP_URL}/unsubscribe?email=${encodeURIComponent(email)}`;
  return [
    '<div style="font-family:Helvetica,Arial,sans-serif;max-width:600px;margin:0 auto;color:#111">',
    campaign.preheader
      ? `<span style="display:none">${campaign.preheader}</span>`
      : "",
    renderMarkdown(campaign.bodyMarkdown),
    `<hr style="margin:32px 0;border:none;border-top:1px solid #ddd" />`,
    `<p style="font-size:12px;color:#666">Off Grid — trackside hospitality. <a href="${unsubscribe}">Unsubscribe</a></p>`,
    "</div>",
  ].join("\n");
}
