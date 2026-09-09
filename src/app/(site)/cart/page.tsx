import Link from "next/link";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { CART_COOKIE, getCart } from "@/lib/commerce/cart";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/db";
import { AddToCart } from "@/components/site/add-to-cart";
import { RemoveFromCart } from "@/components/site/remove-from-cart";
import { ButtonLink, Eyebrow, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Your reservation" };

export default async function CartPage() {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  const cart = token ? await getCart(token) : null;

  if (!cart || cart.items.length === 0) {
    return (
      <Section>
        <Eyebrow>Your reservation</Eyebrow>
        <h1 className="display mt-6 text-4xl">Nothing held yet</h1>
        <p className="mt-6 text-paper/60">
          Reserved packages are held for 30 minutes while you complete your details.
        </p>
        <div className="mt-8">
          <ButtonLink href="/races">Browse the calendar</ButtonLink>
        </div>
      </Section>
    );
  }

  const editions = await prisma.raceEdition.findMany({
    where: { id: { in: cart.items.map((i) => i.package.editionId) } },
    include: { race: true },
  });
  const editionById = new Map(editions.map((e) => [e.id, e]));

  return (
    <Section>
      <Eyebrow>Your reservation</Eyebrow>
      <h1 className="display mt-6 text-4xl">Held for 30 minutes</h1>

      <ul className="mt-12 divide-y divide-paper/10 border-y border-paper/10">
        {cart.items.map((item) => {
          const edition = editionById.get(item.package.editionId);
          return (
            <li key={item.id} className="grid gap-6 py-8 md:grid-cols-[2fr_1fr_auto]">
              <div>
                <p className="text-xl font-light">{item.package.name}</p>
                {edition ? (
                  <Link
                    href={`/races/${edition.slug}`}
                    className="eyebrow mt-2 block text-paper/40 hover:text-accent"
                  >
                    {edition.race.name} — {edition.season}
                  </Link>
                ) : null}
                <p className="mt-2 text-xs text-paper/40">
                  {item.package.seatsPerUnit * item.units} guests
                </p>
              </div>
              <p className="text-sm text-paper/60">
                {item.units} × {formatMoney(item.priceMinor, cart.currency)}
              </p>
              <div className="flex items-start gap-3 md:justify-self-end">
                <AddToCart packageId={item.packageId} maxUnits={item.units + 20} />
                <RemoveFromCart packageId={item.packageId} />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-6">
        <div>
          <p className="eyebrow text-paper/50">Subtotal</p>
          <p className="mt-2 text-3xl font-light">
            {formatMoney(cart.subtotalMinor, cart.currency)}
          </p>
          <p className="mt-2 text-xs text-paper/40">{cart.seatCount} guests total</p>
        </div>
        <ButtonLink href="/checkout">Continue to details</ButtonLink>
      </div>
    </Section>
  );
}
