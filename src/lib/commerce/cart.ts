import type { Cart, CartItem, Package } from "@prisma/client";
import { prisma } from "@/lib/db";
import { cartToken } from "@/lib/commerce/numbering";
import { holdForCart, releaseCartHolds } from "@/lib/inventory";

export const CART_COOKIE = "ogr_cart";
const CART_TTL_MINUTES = 60 * 24;

export type CartLine = CartItem & { package: Package };

/**
 * An order is placed against a single race edition, so a cart may only hold one
 * edition's packages. Raised at add-to-cart time rather than at checkout, where
 * the guest would have nothing left to do but abandon the cart.
 */
export class CartEditionConflictError extends Error {
  constructor(readonly heldEdition: string) {
    super(`Cart already holds places for ${heldEdition}`);
    this.name = "CartEditionConflictError";
  }
}

export type CartView = Cart & {
  items: CartLine[];
  subtotalMinor: number;
  seatCount: number;
};

export async function createCart(currency = "USD", touchId?: string): Promise<Cart> {
  return prisma.cart.create({
    data: {
      token: cartToken(),
      currency,
      touchId,
      expiresAt: new Date(Date.now() + CART_TTL_MINUTES * 60_000),
    },
  });
}

export async function getCart(token: string): Promise<CartView | null> {
  const cart = await prisma.cart.findUnique({
    where: { token },
    include: { items: { include: { package: true }, orderBy: { createdAt: "asc" } } },
  });
  return cart ? withTotals(cart) : null;
}

export async function getOrCreateCart(token: string | undefined): Promise<CartView> {
  if (token) {
    const existing = await getCart(token);
    if (existing && existing.status === "OPEN") return existing;
  }
  const cart = await createCart();
  return withTotals({ ...cart, items: [] });
}

function withTotals(cart: Cart & { items: CartLine[] }): CartView {
  return {
    ...cart,
    subtotalMinor: cart.items.reduce((sum, i) => sum + i.priceMinor * i.units, 0),
    seatCount: cart.items.reduce((sum, i) => sum + i.package.seatsPerUnit * i.units, 0),
  };
}

/**
 * Add or replace a line. Inventory is held for HOLD_MINUTES; the hold
 * is taken before the line is written so a failed hold leaves no phantom item.
 */
export async function setCartLine(
  token: string,
  packageId: string,
  units: number,
): Promise<CartView> {
  const cart = await prisma.cart.findUnique({ where: { token } });
  if (!cart || cart.status !== "OPEN") throw new Error("Cart is not open");

  const pkg = await prisma.package.findUnique({
    where: { id: packageId },
    include: { edition: { include: { race: true } } },
  });
  if (!pkg || !pkg.active) throw new Error("Package is not available");

  if (units > 0) {
    const other = await prisma.cartItem.findFirst({
      where: { cartId: cart.id, package: { editionId: { not: pkg.editionId } } },
      include: { package: { include: { edition: { include: { race: true } } } } },
    });
    if (other) {
      throw new CartEditionConflictError(
        `${other.package.edition.race.name} ${other.package.edition.season}`,
      );
    }
    // Safe now that the cart is known to hold this edition only: line prices and
    // the subtotal are all denominated in the cart currency.
    if (pkg.edition.currency !== cart.currency) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { currency: pkg.edition.currency },
      });
    }
  }

  if (units <= 0) {
    await prisma.$transaction([
      prisma.cartItem.deleteMany({ where: { cartId: cart.id, packageId } }),
      prisma.allocation.updateMany({
        where: { cartId: cart.id, packageId, status: "HELD" },
        data: { status: "RELEASED" },
      }),
    ]);
  } else {
    await holdForCart(cart.id, packageId, units);
    await prisma.cartItem.upsert({
      where: { cartId_packageId: { cartId: cart.id, packageId } },
      create: { cartId: cart.id, packageId, units, priceMinor: pkg.priceMinor },
      update: { units, priceMinor: pkg.priceMinor },
    });
  }

  const updated = await getCart(token);
  if (!updated) throw new Error("Cart disappeared");
  return updated;
}

export async function abandonCart(token: string): Promise<void> {
  const cart = await prisma.cart.findUnique({ where: { token } });
  if (!cart) return;
  await releaseCartHolds(cart.id);
  await prisma.cart.update({ where: { id: cart.id }, data: { status: "ABANDONED" } });
}
