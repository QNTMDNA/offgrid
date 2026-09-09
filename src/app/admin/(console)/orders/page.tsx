import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Cell, Empty, PageHeader, Table } from "@/components/admin/table";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export default async function OrdersPage() {
  const orders = await prisma.order.findMany({
    include: { contact: true, invoice: true, _count: { select: { guests: true } } },
    orderBy: { placedAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-10">
      <PageHeader
        title="Orders"
        subtitle="Bank-transfer reservations. Payments reconcile automatically from Wise balance credits."
      />

      <Table columns={["Placed", "Order", "Customer", "Guests", "Status", "Paid", "Total"]}>
        {orders.map((order) => (
          <tr key={order.id}>
            <Cell muted>{DATE.format(order.placedAt)}</Cell>
            <Cell>
              <Link href={`/admin/orders/${order.number}`} className="hover:text-accent">
                {order.number}
              </Link>
              {order.invoice ? (
                <span className="block font-mono text-xs text-paper/30">
                  {order.invoice.reference}
                </span>
              ) : null}
            </Cell>
            <Cell muted>
              {order.contact.firstName} {order.contact.lastName}
              <span className="block text-xs text-paper/30">{order.contact.email}</span>
            </Cell>
            <Cell muted>{order._count.guests}</Cell>
            <Cell muted>{order.status.replace("_", " ")}</Cell>
            <Cell muted>{formatMoney(order.paidMinor, order.currency)}</Cell>
            <Cell>{formatMoney(order.totalMinor, order.currency)}</Cell>
          </tr>
        ))}
      </Table>
      {orders.length === 0 ? <Empty>No orders yet.</Empty> : null}
    </div>
  );
}
