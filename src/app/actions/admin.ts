"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { compare } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentSession, endSession, startSession } from "@/lib/auth/session";
import { can, type Capability } from "@/lib/auth/rbac";
import { qualifyLead } from "@/lib/crm/leads";
import { draftPayout } from "@/lib/integrations/wise/payouts";
import { queueCampaign } from "@/lib/marketing/campaigns";
import { toMinor } from "@/lib/money";
import type { FormState } from "@/app/actions/marketing";

async function guard(capability: Capability) {
  const session = await currentSession();
  if (!session) redirect("/admin/login");
  if (!can(session.role, capability)) {
    throw new Error("You do not have permission to perform this action");
  }
  return session;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function loginAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid credentials" };

  const user = await prisma.adminUser.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  if (!user || !user.active || !(await compare(parsed.data.password, user.passwordHash))) {
    return { status: "error", message: "Invalid credentials" };
  }

  await prisma.adminUser.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });
  await startSession({
    userId: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  await endSession();
  redirect("/admin/login");
}

const qualifySchema = z.object({
  leadId: z.string().min(1),
  editionId: z.string().min(1),
  amount: z.coerce.number().min(0),
  currency: z.string().default("USD"),
  closeDate: z.coerce.date(),
});

export async function qualifyLeadAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("crm:write");
  const parsed = qualifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid input" };

  await qualifyLead(parsed.data.leadId, {
    editionId: parsed.data.editionId,
    amountMinor: toMinor(parsed.data.amount, parsed.data.currency),
    currency: parsed.data.currency,
    closeDate: parsed.data.closeDate,
  });

  revalidatePath("/admin/crm/leads");
  return { status: "ok", message: "Lead converted to an opportunity." };
}

const payoutSchema = z.object({
  partnerId: z.string().min(1),
  amount: z.coerce.number().positive(),
  sourceCurrency: z.string().min(3),
  targetCurrency: z.string().min(3),
});

export async function createPayoutAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("payouts:write");
  const parsed = payoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid input" };

  const payout = await draftPayout({
    partnerId: parsed.data.partnerId,
    amountMinor: toMinor(parsed.data.amount, parsed.data.targetCurrency),
    sourceCurrency: parsed.data.sourceCurrency,
    targetCurrency: parsed.data.targetCurrency,
  });

  revalidatePath("/admin/payouts");
  return { status: "ok", message: `Payout ${payout.reference} queued for execution.` };
}

export async function queueCampaignAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("marketing:write");
  const campaignId = String(formData.get("campaignId") ?? "");
  if (!campaignId) return { status: "error", message: "Invalid campaign" };

  const queued = await queueCampaign(campaignId);
  revalidatePath("/admin/marketing");
  return { status: "ok", message: `${queued} recipients queued.` };
}

const editionStatusSchema = z.object({
  editionId: z.string().min(1),
  status: z.enum([
    "DRAFT",
    "ANNOUNCED",
    "ON_SALE",
    "WAITLIST",
    "SOLD_OUT",
    "COMPLETED",
    "CANCELLED",
  ]),
});

export async function setEditionStatusAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("catalog:write");
  const parsed = editionStatusSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid input" };

  await prisma.raceEdition.update({
    where: { id: parsed.data.editionId },
    data: { status: parsed.data.status },
  });

  revalidatePath("/admin/catalog");
  return { status: "ok", message: "Status updated." };
}
