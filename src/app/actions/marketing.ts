"use server";

import { cookies } from "next/headers";
import { z } from "zod";
import { env } from "@/lib/env";
import { sendEmail } from "@/lib/email";
import { subscribe, unsubscribe } from "@/lib/marketing/subscribers";
import { TOUCH_COOKIE } from "@/lib/marketing/attribution";

export type FormState = { status: "idle" | "ok" | "error"; message?: string };

const subscribeSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  tags: z.string().optional(),
});

export async function subscribeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = subscribeSchema.safeParse({
    email: formData.get("email"),
    tags: formData.get("tags"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const jar = await cookies();
  const { confirmToken } = await subscribe({
    email: parsed.data.email,
    tags: parsed.data.tags ? parsed.data.tags.split(",").filter(Boolean) : [],
    touchId: jar.get(TOUCH_COOKIE)?.value,
  });

  if (confirmToken) {
    const url = `${env().APP_URL}/subscribe/confirm?token=${confirmToken}`;
    await sendEmail({
      to: parsed.data.email,
      subject: "Confirm your Off Grid access list subscription",
      html: `<p>Confirm your subscription to the Off Grid access list.</p><p><a href="${url}">Confirm subscription</a></p>`,
      text: `Confirm your subscription: ${url}`,
    });
  }

  return {
    status: "ok",
    message: confirmToken
      ? "Check your inbox to confirm your subscription."
      : "You are already on the list.",
  };
}

export async function unsubscribeAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const email = z.string().email().safeParse(formData.get("email"));
  if (!email.success) return { status: "error", message: "Enter a valid email address" };
  await unsubscribe(email.data);
  return { status: "ok", message: "You have been removed from the list." };
}
