"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { captureLead } from "@/lib/crm/leads";
import { toMinor } from "@/lib/money";
import { TOUCH_COOKIE } from "@/lib/marketing/attribution";
import type { FormState } from "@/app/actions/marketing";

const base = {
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional(),
  country: z.string().optional(),
  message: z.string().max(4000).optional(),
  optIn: z.union([z.literal("on"), z.literal("")]).optional(),
};

const requestAccessSchema = z.object({
  ...base,
  interests: z.array(z.string()).default([]),
  partySize: z.coerce.number().int().min(1).max(200).optional(),
});

const sponsorInquirySchema = z.object({
  ...base,
  company: z.string().min(1, "Company is required"),
  title: z.string().optional(),
  budget: z.coerce.number().min(0).optional(),
  currency: z.string().default("USD"),
  interests: z.array(z.string()).default([]),
});

export async function requestAccessAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = requestAccessSchema.safeParse({
    ...Object.fromEntries(formData),
    interests: formData.getAll("interests").map(String),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const jar = await cookies();
  await captureLead({
    ...parsed.data,
    source: "REQUEST_ACCESS",
    optIn: parsed.data.optIn === "on",
    touchId: jar.get(TOUCH_COOKIE)?.value,
  });

  return {
    status: "ok",
    message:
      "Request received. Our team reviews every application and will be in touch.",
  };
}

export async function sponsorInquiryAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = sponsorInquirySchema.safeParse({
    ...Object.fromEntries(formData),
    interests: formData.getAll("interests").map(String),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const jar = await cookies();
  const { budget, currency, ...rest } = parsed.data;
  await captureLead({
    ...rest,
    currency,
    budgetMinor: budget != null ? toMinor(budget, currency) : undefined,
    source: "SPONSOR_INQUIRY",
    optIn: parsed.data.optIn === "on",
    touchId: jar.get(TOUCH_COOKIE)?.value,
  });

  return {
    status: "ok",
    message: "Thank you. Our partnerships team will follow up shortly.",
  };
}
