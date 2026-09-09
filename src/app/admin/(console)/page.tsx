import Link from "next/link";
import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { channelReport } from "@/lib/marketing/attribution";
import { Cell, PageHeader, Stat, StatGrid, Table } from "@/components/admin/table";

export const dynamic = "force-dynamic";

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60_000;

export default async function AdminOverviewPage() {
  const since = new Date(Date.now() - THIRTY_DAYS_MS);

  const [paid, openLeads, pendingOutbox, subscribers, recentOrders, channels] =
    await Promise.all([
      prisma.order.aggregate({
        where: { status: "PAID", placedAt: { gte: since } },
        _sum: { totalMinor: true },
        _count: true,
      }),
      prisma.lead.count({ where: { status: { in: ["NEW", "WORKING"] } } }),
      prisma.outboxEvent.count({ where: { status: "PENDING" } }),
      prisma.subscriber.count({ where: { status: "SUBSCRIBED" } }),
      prisma.order.findMany({
        include: { contact: true },
        orderBy: { placedAt: "desc" },
        take: 8,
      }),
      channelReport(since),
    ]);

  return (
    <div className="space-y-12">
      <PageHeader title="Overview" subtitle="Last 30 days" />

      <StatGrid>
        <Stat
          label="Booked revenue"
          value={formatMoney(paid._sum.totalMinor ?? 0, "USD")}
        />
        <Stat label="Paid orders" value={String(paid._count)} />
        <Stat label="Open leads" value={String(openLeads)} />
        <Stat label="Confirmed subscribers" value={String(subscribers)} />
      </StatGrid>

      {pendingOutbox > 0 ? (
        <p className="border border-accent/50 px-4 py-3 text-sm text-accent">
          {pendingOutbox} integration event{pendingOutbox === 1 ? "" : "s"} pending —
          check <Link href="/admin/integrations" className="underline">integrations</Link>.
        </p>
      ) : null}

      <section>
        <h2 className="eyebrow text-paper/40">Recent orders</h2>
        <div className="mt-6">
          <Table columns={["Order", "Customer", "Status", "Total"]}>
            {recentOrders.map((order) => (
              <tr key={order.id}>
                <Cell>
                  <Link href={`/admin/orders/${order.number}`} className="hover:text-accent">
                    {order.number}
                  </Link>
                </Cell>
                <Cell muted>
                  {order.contact.firstName} {order.contact.lastName}
                </Cell>
                <Cell muted>{order.status}</Cell>
                <Cell>{formatMoney(order.totalMinor, order.currency)}</Cell>
              </tr>
            ))}
          </Table>
        </div>
      </section>

      <section>
        <h2 className="eyebrow text-paper/40">Acquisition by first touch</h2>
        <div className="mt-6">
          <Table columns={["Source", "Medium", "Touches", "Leads"]}>
            {channels.map((row) => (
              <tr key={`${row.source}-${row.medium}`}>
                <Cell>{row.source}</Cell>
                <Cell muted>{row.medium}</Cell>
                <Cell muted>{row.touches}</Cell>
                <Cell>{row.leads}</Cell>
              </tr>
            ))}
          </Table>
        </div>
      </section>
    </div>
  );
}
