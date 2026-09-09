import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Cell, PageHeader, Stat, StatGrid, Table } from "@/components/admin/table";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

type Params = { params: Promise<{ number: string }> };

export default async function AdminOrderPage({ params }: Params) {
  const { number } = await params;
  const order = await prisma.order.findUnique({
    where: { number },
    include: {
      contact: true,
      account: true,
      invoice: true,
      payments: { orderBy: { createdAt: "desc" } },
      items: { include: { package: { include: { edition: { include: { race: true } } } } } },
      guests: { orderBy: { lastName: "asc" } },
    },
  });
  if (!order) notFound();

  return (
    <div className="space-y-10">
      <PageHeader
        title={`Order ${order.number}`}
        subtitle={`${order.contact.firstName} ${order.contact.lastName} — ${order.contact.email}${
          order.account ? ` · ${order.account.name}` : ""
        }`}
      />

      <StatGrid>
        <Stat label="Status" value={order.status.replace("_", " ")} />
        <Stat label="Total" value={formatMoney(order.totalMinor, order.currency)} />
        <Stat label="Paid" value={formatMoney(order.paidMinor, order.currency)} />
        <Stat label="Guests" value={String(order.guests.length)} />
      </StatGrid>

      <section>
        <h2 className="eyebrow text-paper/40">Items</h2>
        <div className="mt-6">
          <Table columns={["Race", "Package", "Units", "Line total"]}>
            {order.items.map((item) => (
              <tr key={item.id}>
                <Cell muted>
                  {item.package.edition.race.name} {item.package.edition.season}
                </Cell>
                <Cell>{item.package.name}</Cell>
                <Cell muted>{item.units}</Cell>
                <Cell>{formatMoney(item.priceMinor * item.units, order.currency)}</Cell>
              </tr>
            ))}
          </Table>
        </div>
      </section>

      {order.invoice ? (
        <section>
          <h2 className="eyebrow text-paper/40">Invoice</h2>
          <div className="mt-6">
            <Table columns={["Number", "Reference", "Status", "Due", "Amount"]}>
              <tr>
                <Cell>{order.invoice.number}</Cell>
                <Cell muted>
                  <span className="font-mono">{order.invoice.reference}</span>
                </Cell>
                <Cell muted>{order.invoice.status}</Cell>
                <Cell muted>{DATE.format(order.invoice.dueAt)}</Cell>
                <Cell>
                  {formatMoney(order.invoice.amountMinor, order.invoice.currency)}
                </Cell>
              </tr>
            </Table>
          </div>
        </section>
      ) : null}

      <section>
        <h2 className="eyebrow text-paper/40">Payments</h2>
        <div className="mt-6">
          <Table columns={["Received", "Method", "External id", "Status", "Amount"]}>
            {order.payments.map((payment) => (
              <tr key={payment.id}>
                <Cell muted>{DATE.format(payment.createdAt)}</Cell>
                <Cell muted>{payment.method.replace(/_/g, " ")}</Cell>
                <Cell muted>
                  <span className="font-mono text-xs">{payment.externalId ?? "—"}</span>
                </Cell>
                <Cell muted>{payment.status}</Cell>
                <Cell>{formatMoney(payment.amountMinor, payment.currency)}</Cell>
              </tr>
            ))}
          </Table>
        </div>
      </section>

      <section>
        <h2 className="eyebrow text-paper/40">Guests</h2>
        <div className="mt-6">
          <Table columns={["Guest", "Email", "Status", "Ticket", "Checked in"]}>
            {order.guests.map((guest) => (
              <tr key={guest.id}>
                <Cell>
                  {guest.firstName} {guest.lastName}
                </Cell>
                <Cell muted>{guest.email}</Cell>
                <Cell muted>{guest.status}</Cell>
                <Cell muted>
                  <span className="font-mono text-xs">{guest.ticketRef ?? "—"}</span>
                </Cell>
                <Cell muted>
                  {guest.checkedInAt ? DATE.format(guest.checkedInAt) : "—"}
                </Cell>
              </tr>
            ))}
          </Table>
        </div>
      </section>
    </div>
  );
}
