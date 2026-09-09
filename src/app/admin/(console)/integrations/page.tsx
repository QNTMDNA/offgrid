import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { Cell, Empty, PageHeader, Stat, StatGrid, Table } from "@/components/admin/table";

export const dynamic = "force-dynamic";

const TIME = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export default async function IntegrationsPage() {
  const config = env();
  const [byStatus, events, deliveries, links] = await Promise.all([
    prisma.outboxEvent.groupBy({ by: ["status"], _count: true }),
    prisma.outboxEvent.findMany({
      where: { status: { in: ["PENDING", "FAILED"] } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.webhookDelivery.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.integrationLink.groupBy({ by: ["system", "entity"], _count: true }),
  ]);

  const counts = new Map(byStatus.map((row) => [row.status, row._count]));

  return (
    <div className="space-y-12">
      <PageHeader
        title="Integrations"
        subtitle="Outbound work is queued in the outbox and drained by the scheduler; nothing calls a third party inside a request."
      />

      <StatGrid>
        <Stat
          label="Salesforce"
          value={config.SALESFORCE_ENABLED ? "Enabled" : "Disabled"}
        />
        <Stat label="Wise" value={config.WISE_ENABLED ? "Enabled" : "Disabled"} />
        <Stat
          label="Speakeasy"
          value={config.SPEAKEASY_ENABLED ? "Enabled" : "Mock provider"}
        />
        <Stat
          label="Outbox pending / failed"
          value={`${counts.get("PENDING") ?? 0} / ${counts.get("FAILED") ?? 0}`}
        />
      </StatGrid>

      <section>
        <h2 className="eyebrow text-paper/40">Records linked</h2>
        <div className="mt-6">
          <Table columns={["System", "Entity", "Linked"]}>
            {links.map((row) => (
              <tr key={`${row.system}-${row.entity}`}>
                <Cell>{row.system}</Cell>
                <Cell muted>{row.entity}</Cell>
                <Cell>{row._count}</Cell>
              </tr>
            ))}
          </Table>
          {links.length === 0 ? <Empty>Nothing synced yet.</Empty> : null}
        </div>
      </section>

      <section>
        <h2 className="eyebrow text-paper/40">Outbox queue</h2>
        <div className="mt-6">
          <Table columns={["Created", "System", "Topic", "Status", "Attempts", "Last error"]}>
            {events.map((event) => (
              <tr key={event.id}>
                <Cell muted>{TIME.format(event.createdAt)}</Cell>
                <Cell muted>{event.system}</Cell>
                <Cell>
                  <span className="font-mono text-xs">{event.topic}</span>
                </Cell>
                <Cell muted>{event.status}</Cell>
                <Cell muted>{event.attempts}</Cell>
                <Cell muted>
                  <span className="text-xs text-red-300">{event.lastError ?? "—"}</span>
                </Cell>
              </tr>
            ))}
          </Table>
          {events.length === 0 ? <Empty>Queue is clear.</Empty> : null}
        </div>
      </section>

      <section>
        <h2 className="eyebrow text-paper/40">Recent webhook deliveries</h2>
        <div className="mt-6">
          <Table columns={["Received", "System", "Event", "Processed"]}>
            {deliveries.map((delivery) => (
              <tr key={delivery.id}>
                <Cell muted>{TIME.format(delivery.createdAt)}</Cell>
                <Cell muted>{delivery.system}</Cell>
                <Cell>
                  <span className="font-mono text-xs">{delivery.eventType}</span>
                </Cell>
                <Cell muted>
                  {delivery.processedAt ? TIME.format(delivery.processedAt) : "—"}
                </Cell>
              </tr>
            ))}
          </Table>
          {deliveries.length === 0 ? <Empty>No deliveries yet.</Empty> : null}
        </div>
      </section>
    </div>
  );
}
