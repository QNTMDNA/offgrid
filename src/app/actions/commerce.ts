"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CART_COOKIE, getOrCreateCart, setCartLine } from "@/lib/commerce/cart";
import { checkout } from "@/lib/commerce/orders";
import { parseGuestList } from "@/lib/commerce/guest-list";
import { InsufficientInventoryError } from "@/lib/inventory";
import type { FormState } from "@/app/actions/marketing";

const CART_COOKIE_MAX_AGE = 60 * 60 * 24;

async function currentCartToken(): Promise<string> {
  const jar = await cookies();
  const cart = await getOrCreateCart(jar.get(CART_COOKIE)?.value);
  jar.set(CART_COOKIE, cart.token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
  });
  return cart.token;
}

const lineSchema = z.object({
  packageId: z.string().min(1),
  units: z.coerce.number().int().min(0).max(50),
});

export async function setCartLineAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = lineSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Invalid request" };

  try {
    await setCartLine(
      await currentCartToken(),
      parsed.data.packageId,
      parsed.data.units,
    );
  } catch (error) {
    if (error instanceof InsufficientInventoryError) {
      return {
        status: "error",
        message: `Only ${error.available} remaining for this package.`,
      };
    }
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not update cart",
    };
  }

  revalidatePath("/cart");
  return { status: "ok", message: "Cart updated." };
}

const checkoutSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Enter a valid email address"),
  phone: z.string().optional(),
  company: z.string().optional(),
  country: z.string().optional(),
  optIn: z.union([z.literal("on"), z.literal("")]).optional(),
  guests: z.string().optional(),
});

export async function checkoutAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0].message };
  }

  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  if (!token) return { status: "error", message: "Your cart has expired." };

  let orderNumber: string;
  try {
    const result = await checkout(
      token,
      {
        firstName: parsed.data.firstName,
        lastName: parsed.data.lastName,
        email: parsed.data.email,
        phone: parsed.data.phone,
        company: parsed.data.company,
        country: parsed.data.country,
        optedIn: parsed.data.optIn === "on",
      },
      parseGuestList(parsed.data.guests ?? ""),
    );
    orderNumber = result.order.number;
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Checkout failed",
    };
  }

  jar.delete(CART_COOKIE);
  redirect(`/orders/${orderNumber}`);
}
