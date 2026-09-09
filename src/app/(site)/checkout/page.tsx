import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CART_COOKIE, getCart } from "@/lib/commerce/cart";
import { formatMoney } from "@/lib/money";
import { CheckoutForm } from "@/components/site/checkout-form";
import { Eyebrow, Section } from "@/components/ui";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Checkout" };

export default async function CheckoutPage() {
  const token = (await cookies()).get(CART_COOKIE)?.value;
  const cart = token ? await getCart(token) : null;
  if (!cart || cart.items.length === 0) redirect("/cart");

  return (
    <Section>
      <div className="grid gap-16 md:grid-cols-[1.4fr_1fr]">
        <div>
          <Eyebrow>Checkout</Eyebrow>
          <h1 className="display mt-6 text-4xl">Your details</h1>
          <p className="mt-6 max-w-lg text-sm text-paper/60">
            Reservations are confirmed on receipt of payment. We issue an invoice with
            bank details immediately; your allocation is held until the due date.
          </p>
          <div className="mt-12">
            <CheckoutForm seatCount={cart.seatCount} />
          </div>
        </div>

        <aside className="h-fit border border-paper/15 p-8">
          <p className="eyebrow text-paper/50">Summary</p>
          <ul className="mt-6 space-y-4">
            {cart.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="text-paper/70">
                  {item.package.name}
                  <span className="text-paper/40"> × {item.units}</span>
                </span>
                <span>{formatMoney(item.priceMinor * item.units, cart.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 border-t border-paper/15 pt-6">
            <div className="flex justify-between">
              <span className="eyebrow text-paper/50">Total</span>
              <span className="text-xl">
                {formatMoney(cart.subtotalMinor, cart.currency)}
              </span>
            </div>
            <p className="mt-4 text-xs text-paper/40">
              {cart.seatCount} guests · payment by bank transfer
            </p>
          </div>
        </aside>
      </div>
    </Section>
  );
}
