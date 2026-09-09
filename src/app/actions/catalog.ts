"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/auth/session";
import { can, type Capability } from "@/lib/auth/rbac";
import {
  InventoryBelowCommittedError,
  SlugTakenError,
  archivePackage,
  createEdition,
  createPackage,
  createRace,
  updateEdition,
  updatePackage,
  updateRace,
} from "@/lib/catalog/manage";
import { UnsupportedImageError, putImage } from "@/lib/catalog/media";
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

function failure(error: unknown): FormState {
  if (
    error instanceof SlugTakenError ||
    error instanceof InventoryBelowCommittedError ||
    error instanceof UnsupportedImageError
  ) {
    return { status: "error", message: error.message };
  }
  throw error;
}

function refresh(editionId?: string) {
  // Catalog data feeds every public page, so the whole tree is revalidated.
  revalidatePath("/", "layout");
  revalidatePath("/admin/catalog");
  if (editionId) revalidatePath(`/admin/catalog/editions/${editionId}`);
}

const EDITION_STATUSES = [
  "DRAFT",
  "ANNOUNCED",
  "ON_SALE",
  "WAITLIST",
  "SOLD_OUT",
  "COMPLETED",
  "CANCELLED",
] as const;

const PACKAGE_KINDS = [
  "TABLE",
  "SEAT",
  "SUITE",
  "PADDOCK",
  "ADD_ON",
  "TRANSFER",
  "ACCOMMODATION",
] as const;

const checkbox = z
  .union([z.literal("on"), z.literal("")])
  .optional()
  .transform((value) => value === "on");

const raceSchema = z.object({
  name: z.string().min(1),
  city: z.string().min(1),
  country: z.string().min(1),
  countryCode: z.string().min(2).max(3),
  circuit: z.string().optional(),
  timezone: z.string().optional(),
  summary: z.string().optional(),
});

export async function createRaceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("catalog:write");
  const parsed = raceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid race details" };

  try {
    const race = await createRace(parsed.data);
    refresh();
    return { status: "ok", message: `${race.name} created.` };
  } catch (error) {
    return failure(error);
  }
}

export async function updateRaceAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("catalog:write");
  const parsed = raceSchema
    .extend({ raceId: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid race details" };

  const { raceId, ...input } = parsed.data;
  try {
    await updateRace(raceId, input);
    refresh();
    return { status: "ok", message: "Race updated." };
  } catch (error) {
    return failure(error);
  }
}

const editionSchema = z.object({
  raceId: z.string().min(1),
  season: z.coerce.number().int().min(2000).max(2100),
  startsAt: z.coerce.date(),
  endsAt: z.coerce.date(),
  status: z.enum(EDITION_STATUSES),
  currency: z.string().length(3),
  headline: z.string().optional(),
  body: z.string().optional(),
  capacity: z.coerce.number().int().min(0).default(0),
});

export async function createEditionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("catalog:write");
  const parsed = editionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  let editionId: string;
  try {
    editionId = (await createEdition(parsed.data)).id;
  } catch (error) {
    if (error instanceof SlugTakenError) {
      return { status: "error", message: error.message };
    }
    if (error instanceof Error && error.message.includes("cannot end before")) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  refresh(editionId);
  redirect(`/admin/catalog/editions/${editionId}`);
}

export async function updateEditionAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("catalog:write");
  const parsed = editionSchema
    .omit({ raceId: true, season: true })
    .extend({ editionId: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { editionId, ...input } = parsed.data;
  try {
    await updateEdition(editionId, input);
  } catch (error) {
    if (error instanceof Error && error.message.includes("cannot end before")) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  refresh(editionId);
  return { status: "ok", message: "Edition updated." };
}

const packageSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(PACKAGE_KINDS),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  seatsPerUnit: z.coerce.number().int().min(1).max(500),
  totalUnits: z.coerce.number().int().min(0).max(100_000),
  heldUnits: z.coerce.number().int().min(0).max(100_000),
  inviteOnly: checkbox,
  active: checkbox,
  sortOrder: z.coerce.number().int().min(0).default(0),
  sku: z.string().optional(),
});

export async function createPackageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("catalog:write");
  const parsed = packageSchema
    .extend({ editionId: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { editionId, price, ...input } = parsed.data;
  const edition = await prisma.raceEdition.findUnique({
    where: { id: editionId },
    select: { currency: true },
  });
  if (!edition) return { status: "error", message: "Unknown edition" };

  try {
    await createPackage(editionId, {
      ...input,
      priceMinor: toMinor(price, edition.currency),
    });
  } catch (error) {
    return failure(error);
  }

  refresh(editionId);
  return { status: "ok", message: `${input.name} added.` };
}

export async function updatePackageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("catalog:write");
  const parsed = packageSchema
    .extend({ packageId: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { packageId, price, ...input } = parsed.data;
  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    select: { editionId: true, edition: { select: { currency: true } } },
  });
  if (!pkg) return { status: "error", message: "Unknown package" };

  try {
    await updatePackage(packageId, {
      ...input,
      priceMinor: toMinor(price, pkg.edition.currency),
    });
  } catch (error) {
    return failure(error);
  }

  refresh(pkg.editionId);
  return { status: "ok", message: "Package saved." };
}

export async function archivePackageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("catalog:write");
  const packageId = String(formData.get("packageId") ?? "");
  if (!packageId) return { status: "error", message: "Unknown package" };

  const pkg = await archivePackage(packageId);
  refresh(pkg.editionId);
  return { status: "ok", message: `${pkg.name} archived.` };
}

export async function uploadRaceImageAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await guard("catalog:write");
  const raceId = String(formData.get("raceId") ?? "");
  const file = formData.get("file");
  if (!raceId || !(file instanceof File)) {
    return { status: "error", message: "Choose an image to upload" };
  }

  try {
    const { url } = await putImage(file);
    await prisma.race.update({ where: { id: raceId }, data: { heroImage: url } });
  } catch (error) {
    return failure(error);
  }

  refresh();
  return { status: "ok", message: "Race image updated." };
}
