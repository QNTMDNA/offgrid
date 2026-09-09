import { prisma } from "@/lib/db";
import { audienceFor } from "@/lib/marketing/campaigns";
import { Cell, Empty, PageHeader, Stat, StatGrid, Table } from "@/components/admin/table";
import { QueueCampaign } from "@/components/admin/queue-campaign";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export default async function MarketingPage() {
  const [campaigns, segments, counts] = await Promise.all([
    prisma.campaign.findMany({
      include: { segment: true, _count: { select: { sends: true } } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.segment.findMany({ orderBy: { name: "asc" } }),
    prisma.subscriber.groupBy({ by: ["status"], _count: true }),
  ]);

  const byStatus = new Map(counts.map((row) => [row.status, row._count]));
  const audiences = await Promise.all(
    segments.map(async (segment) => ({
      segment,
      size: (await audienceFor(segment.id)).length,
    })),
  );

  return (
    <div className="space-y-12">
      <PageHeader
        title="Marketing"
        subtitle="Double opt-in list, rule-based segments and campaign delivery."
      />

      <StatGrid>
        <Stat label="Subscribed" value={String(byStatus.get("SUBSCRIBED") ?? 0)} />
        <Stat label="Pending" value={String(byStatus.get("PENDING") ?? 0)} />
        <Stat label="Unsubscribed" value={String(byStatus.get("UNSUBSCRIBED") ?? 0)} />
        <Stat label="Segments" value={String(segments.length)} />
      </StatGrid>

      <section>
        <h2 className="eyebrow text-paper/40">Segments</h2>
        <div className="mt-6">
          <Table columns={["Segment", "Slug", "Description", "Audience"]}>
            {audiences.map(({ segment, size }) => (
              <tr key={segment.id}>
                <Cell>{segment.name}</Cell>
                <Cell muted>
                  <span className="font-mono text-xs">{segment.slug}</span>
                </Cell>
                <Cell muted>{segment.description ?? "—"}</Cell>
                <Cell>{size}</Cell>
              </tr>
            ))}
          </Table>
          {segments.length === 0 ? <Empty>No segments yet.</Empty> : null}
        </div>
      </section>

      <section>
        <h2 className="eyebrow text-paper/40">Campaigns</h2>
        <div className="mt-6">
          <Table columns={["Campaign", "Segment", "Status", "Sends", "Created", ""]}>
            {campaigns.map((campaign) => (
              <tr key={campaign.id}>
                <Cell>
                  {campaign.name}
                  <span className="block text-xs text-paper/40">{campaign.subject}</span>
                </Cell>
                <Cell muted>{campaign.segment.name}</Cell>
                <Cell muted>{campaign.status}</Cell>
                <Cell muted>{campaign._count.sends}</Cell>
                <Cell muted>{DATE.format(campaign.createdAt)}</Cell>
                <Cell>
                  {campaign.status === "DRAFT" || campaign.status === "SCHEDULED" ? (
                    <QueueCampaign campaignId={campaign.id} />
                  ) : null}
                </Cell>
              </tr>
            ))}
          </Table>
          {campaigns.length === 0 ? <Empty>No campaigns yet.</Empty> : null}
        </div>
      </section>
    </div>
  );
}
