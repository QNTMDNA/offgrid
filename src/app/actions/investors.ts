"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { compare, hash } from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/auth/session";
import { can, type Capability } from "@/lib/auth/rbac";
import {
  endInvestorSession,
  startInvestorSession,
} from "@/lib/investors/session";
import { generatePasscode, normalisePasscode } from "@/lib/investors/passcode";
import {
  UnsupportedDocumentError,
  deleteDocument,
  putDocument,
} from "@/lib/investors/storage";
import type { FormState } from "@/app/actions/marketing";

const BCRYPT_ROUNDS = 12;

async function guard(capability: Capability) {
  const session = await currentSession();
  if (!session) redirect("/admin/login");
  if (!can(session.role, capability)) {
    throw new Error("You do not have permission to perform this action");
  }
  return session;
}

async function requestContext() {
  const list = await headers();
  return {
    ip: list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    userAgent: list.get("user-agent"),
  };
}

const signInSchema = z.object({
  email: z.string().email(),
  passcode: z.string().min(1),
});

export async function investorSignInAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid credentials" };

  const investor = await prisma.investorUser.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  const passcode = normalisePasscode(parsed.data.passcode);
  if (
    !investor ||
    !investor.active ||
    !(await compare(passcode, investor.passcodeHash))
  ) {
    return { status: "error", message: "Invalid credentials" };
  }

  const context = await requestContext();
  await prisma.$transaction([
    prisma.investorUser.update({
      where: { id: investor.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.investorAccess.create({
      data: { investorId: investor.id, kind: "SIGN_IN", ...context },
    }),
  ]);

  await startInvestorSession({
    investorId: investor.id,
    email: investor.email,
    name: investor.name,
  });
  redirect("/investors");
}

export async function investorSignOutAction(): Promise<void> {
  await endInvestorSession();
  redirect("/investors/login");
}

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  organization: z.string().optional(),
});

export async function inviteInvestorAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await guard("investors:write");
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid input" };

  const email = parsed.data.email.toLowerCase();
  const passcode = generatePasscode();
  const passcodeHash = await hash(normalisePasscode(passcode), BCRYPT_ROUNDS);

  await prisma.investorUser.upsert({
    where: { email },
    create: {
      email,
      name: parsed.data.name,
      organization: parsed.data.organization || null,
      passcodeHash,
      invitedById: admin.userId,
    },
    update: {
      name: parsed.data.name,
      organization: parsed.data.organization || null,
      passcodeHash,
      active: true,
    },
  });

  revalidatePath("/admin/investors");
  return {
    status: "ok",
    // Shown once: only the hash is stored, so a lost passcode has to be reissued.
    message: `Passcode for ${email}: ${passcode} — copy it now, it is not stored.`,
  };
}

export async function setInvestorActiveAction(formData: FormData): Promise<void> {
  await guard("investors:write");
  const id = String(formData.get("investorId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  await prisma.investorUser.update({ where: { id }, data: { active } });
  revalidatePath("/admin/investors");
}

const documentSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  period: z.string().optional(),
  publish: z.string().nullish(),
});

export async function uploadInvestorDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("investors:write");
  const parsed = documentSchema.safeParse({
    title: formData.get("title"),
    summary: formData.get("summary"),
    period: formData.get("period"),
    publish: formData.get("publish"),
  });
  if (!parsed.success) return { status: "error", message: "Invalid input" };

  const file = formData.get("file");
  if (!(file instanceof File)) return { status: "error", message: "Choose a file" };

  let stored;
  try {
    stored = await putDocument(file);
  } catch (error) {
    if (error instanceof UnsupportedDocumentError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  const published = parsed.data.publish === "on";
  await prisma.investorDocument.create({
    data: {
      title: parsed.data.title,
      summary: parsed.data.summary || null,
      period: parsed.data.period || null,
      storageKey: stored.key,
      filename: stored.filename,
      contentType: stored.contentType,
      sizeBytes: stored.sizeBytes,
      published,
      publishedAt: published ? new Date() : null,
    },
  });

  revalidatePath("/admin/investors");
  revalidatePath("/investors");
  return { status: "ok", message: `${parsed.data.title} uploaded.` };
}

export async function setDocumentPublishedAction(formData: FormData): Promise<void> {
  await guard("investors:write");
  const id = String(formData.get("documentId") ?? "");
  const published = String(formData.get("published") ?? "") === "true";
  await prisma.investorDocument.update({
    where: { id },
    data: { published, publishedAt: published ? new Date() : null },
  });
  revalidatePath("/admin/investors");
  revalidatePath("/investors");
}

export async function deleteInvestorDocumentAction(formData: FormData): Promise<void> {
  await guard("investors:write");
  const id = String(formData.get("documentId") ?? "");
  const document = await prisma.investorDocument.delete({ where: { id } });
  await deleteDocument(document.storageKey);
  revalidatePath("/admin/investors");
  revalidatePath("/investors");
}
