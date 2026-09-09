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
  endLoungeSession,
  startLoungeSession,
} from "@/lib/lounge/session";
import { generatePasscode, normalisePasscode } from "@/lib/lounge/passcode";
import { InvalidCanvaUrlError, canvaEmbedUrl } from "@/lib/lounge/canva";
import {
  UnsupportedDocumentError,
  deleteDocument,
  putDocument,
} from "@/lib/lounge/storage";
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

export async function loungeSignInAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid credentials" };

  const member = await prisma.loungeMember.findUnique({
    where: { email: parsed.data.email.toLowerCase() },
  });
  const passcode = normalisePasscode(parsed.data.passcode);
  if (
    !member ||
    !member.active ||
    !(await compare(passcode, member.passcodeHash))
  ) {
    return { status: "error", message: "Invalid credentials" };
  }

  const context = await requestContext();
  await prisma.$transaction([
    prisma.loungeMember.update({
      where: { id: member.id },
      data: { lastLoginAt: new Date() },
    }),
    prisma.loungeAccess.create({
      data: { memberId: member.id, kind: "SIGN_IN", ...context },
    }),
  ]);

  await startLoungeSession({
    memberId: member.id,
    email: member.email,
    name: member.name,
  });
  redirect("/sponsor-lounge");
}

export async function loungeSignOutAction(): Promise<void> {
  await endLoungeSession();
  redirect("/sponsor-lounge/login");
}

const inviteSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  organization: z.string().optional(),
});

export async function inviteMemberAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await guard("lounge:write");
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid input" };

  const email = parsed.data.email.toLowerCase();
  const passcode = generatePasscode();
  const passcodeHash = await hash(normalisePasscode(passcode), BCRYPT_ROUNDS);

  await prisma.loungeMember.upsert({
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

  revalidatePath("/admin/sponsor-lounge");
  return {
    status: "ok",
    // Shown once: only the hash is stored, so a lost passcode has to be reissued.
    message: `Passcode for ${email}: ${passcode} — copy it now, it is not stored.`,
  };
}

export async function setMemberActiveAction(formData: FormData): Promise<void> {
  await guard("lounge:write");
  const id = String(formData.get("memberId") ?? "");
  const active = String(formData.get("active") ?? "") === "true";
  await prisma.loungeMember.update({ where: { id }, data: { active } });
  revalidatePath("/admin/sponsor-lounge");
}

const documentSchema = z.object({
  title: z.string().min(1),
  summary: z.string().optional(),
  period: z.string().optional(),
  publish: z.string().nullish(),
});

export async function uploadLoungeDocumentAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("lounge:write");
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
  await prisma.loungeDocument.create({
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

  revalidatePath("/admin/sponsor-lounge");
  revalidatePath("/sponsor-lounge");
  return { status: "ok", message: `${parsed.data.title} uploaded.` };
}

export async function addCanvaDeckAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("lounge:write");
  const parsed = documentSchema
    .extend({ url: z.string().min(1) })
    .safeParse({
      title: formData.get("title"),
      summary: formData.get("summary"),
      period: formData.get("period"),
      publish: formData.get("publish"),
      url: formData.get("url"),
    });
  if (!parsed.success) return { status: "error", message: "Invalid input" };

  let embedUrl: string;
  try {
    embedUrl = canvaEmbedUrl(parsed.data.url);
  } catch (error) {
    if (error instanceof InvalidCanvaUrlError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  const published = parsed.data.publish === "on";
  await prisma.loungeDocument.create({
    data: {
      title: parsed.data.title,
      summary: parsed.data.summary || null,
      period: parsed.data.period || null,
      embedUrl,
      published,
      publishedAt: published ? new Date() : null,
    },
  });

  revalidatePath("/admin/sponsor-lounge");
  revalidatePath("/sponsor-lounge");
  return { status: "ok", message: `${parsed.data.title} added.` };
}

export async function setDocumentPublishedAction(formData: FormData): Promise<void> {
  await guard("lounge:write");
  const id = String(formData.get("documentId") ?? "");
  const published = String(formData.get("published") ?? "") === "true";
  await prisma.loungeDocument.update({
    where: { id },
    data: { published, publishedAt: published ? new Date() : null },
  });
  revalidatePath("/admin/sponsor-lounge");
  revalidatePath("/sponsor-lounge");
}

export async function deleteLoungeDocumentAction(formData: FormData): Promise<void> {
  await guard("lounge:write");
  const id = String(formData.get("documentId") ?? "");
  const document = await prisma.loungeDocument.delete({ where: { id } });
  if (document.storageKey) await deleteDocument(document.storageKey);
  revalidatePath("/admin/sponsor-lounge");
  revalidatePath("/sponsor-lounge");
}
