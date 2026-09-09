import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { ButtonLink, Eyebrow, Section } from "@/components/ui";
import type { BankDetails } from "@/lib/integrations/wise/receiving";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Reservation confirmed" };

const DUE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

type Params = { params: Promise<{ number: string }> };

export default async function OrderPage({ params }: Params) {
  const { number } = await params;
  const order = await prisma.order.findUnique({
    where: { number },
    include: {
      items: { include: { package: { include: { edition: { include: { race: true } } } } } },
      invoice: true,
      guests: true,
    },
  });
  if (!order) notFound();

  const bank = order.invoice?.bankDetails as BankDetails | null;
  const bankRows: Array<{ label: string; value: string }> = bank
    ? [
        { label: "Account holder", value: bank.accountHolder },
        { label: "Bank", value: bank.bankName },
        ...bank.fields,
      ]
    : [];

  return (
    <Section>
      <Eyebrow>Reservation {order.number}</Eyebrow>
      <h1 className="display mt-6 text-4xl">
        {order.status === "PAID" ? "Confirmed" : "Awaiting payment"}
      </h1>
      <p className="mt-6 max-w-2xl text-paper/60">
        {order.status === "PAID"
          ? "Payment received. Tickets and guest credentials are being issued — you will receive them by email."
          : "Your allocation is held. Transfer the invoice amount quoting the reference below and we will confirm within one business day."}
      </p>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        <div>
          <p className="eyebrow text-paper/50">Reserved</p>
          <ul className="mt-6 space-y-4">
            {order.items.map((item) => (
              <li key={item.id} className="flex justify-between gap-4 text-sm">
                <span className="text-paper/70">
                  {item.package.edition.race.name} — {item.package.name}
                  <span className="text-paper/40"> × {item.units}</span>
                </span>
                <span>{formatMoney(item.priceMinor * item.units, order.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-8 flex justify-between border-t border-paper/15 pt-6">
            <span className="eyebrow text-paper/50">Total</span>
            <span className="text-xl">
              {formatMoney(order.totalMinor, order.currency)}
            </span>
          </div>
          {order.guests.length > 0 ? (
            <p className="mt-6 text-xs text-paper/40">
              {order.guests.length} guest{order.guests.length === 1 ? "" : "s"} registered
            </p>
          ) : null}
        </div>

        {order.invoice ? (
          <div className="border border-paper/15 p-8">
            <p className="eyebrow text-paper/50">Invoice {order.invoice.number}</p>
            <p className="mt-6 text-3xl font-light">
              {formatMoney(order.invoice.amountMinor, order.invoice.currency)}
            </p>
            <p className="mt-2 text-xs text-paper/40">
              Due {DUE.format(order.invoice.dueAt)}
            </p>
            <dl className="mt-8 space-y-3 text-sm">
              <div className="flex justify-between gap-6">
                <dt className="text-paper/40">Reference</dt>
                <dd className="font-mono">{order.invoice.reference}</dd>
              </div>
              {bankRows.map((row) => (
                <div key={row.label} className="flex justify-between gap-6">
                  <dt className="text-paper/40">{row.label}</dt>
                  <dd className="text-right">{row.value}</dd>
                </div>
              ))}
            </dl>
            {bank ? (
              <p className="mt-6 text-xs text-paper/40">{bank.address}</p>
            ) : null}
            <p className="mt-8 text-xs text-paper/40">
              The reference must be quoted exactly — it is how the transfer is matched to
              your reservation.
            </p>
          </div>
        ) : null}
      </div>

      <div className="mt-16">
        <ButtonLink href="/races" variant="outline">
          Back to the calendar
        </ButtonLink>
      </div>
    </Section>
  );
}
