import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Cell, Empty, PageHeader, Table } from "@/components/admin/table";
import { QualifyLead } from "@/components/admin/qualify-lead";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export default async function CrmPage() {
  const [leads, opportunities, editions] = await Promise.all([
    prisma.lead.findMany({
      where: { status: { in: ["NEW", "WORKING", "QUALIFIED"] } },
      include: { contact: true, touch: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.opportunity.findMany({
      where: { stage: { notIn: ["CLOSED_WON", "CLOSED_LOST"] } },
      include: { contact: true, edition: { include: { race: true } } },
      orderBy: { closeDate: "asc" },
      take: 50,
    }),
    prisma.raceEdition.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      include: { race: true },
      orderBy: { startsAt: "asc" },
    }),
  ]);

  const editionOptions = editions.map((edition) => ({
    id: edition.id,
    label: `${edition.race.name} ${edition.season}`,
    currency: edition.currency,
  }));

  return (
    <div className="space-y-12">
      <PageHeader
        title="CRM"
        subtitle="Inbound leads and open pipeline. Records sync to Salesforce through the outbox."
      />

      <section>
        <h2 className="eyebrow text-paper/40">Open leads</h2>
        <div className="mt-6">
          <Table columns={["Received", "Contact", "Source", "Interests", "Convert"]}>
            {leads.map((lead) => (
              <tr key={lead.id}>
                <Cell muted>{DATE.format(lead.createdAt)}</Cell>
                <Cell>
                  {lead.contact.firstName} {lead.contact.lastName}
                  <span className="block text-xs text-paper/40">{lead.contact.email}</span>
                  {lead.company ? (
                    <span className="block text-xs text-paper/40">{lead.company}</span>
                  ) : null}
                </Cell>
                <Cell muted>
                  {lead.source.replace("_", " ")}
                  {lead.touch?.source ? (
                    <span className="block text-xs text-paper/30">
                      via {lead.touch.source}
                    </span>
                  ) : null}
                </Cell>
                <Cell muted>
                  {lead.interests.join(", ") || "—"}
                  {lead.budgetMinor && lead.currency ? (
                    <span className="block text-xs text-paper/40">
                      budget {formatMoney(lead.budgetMinor, lead.currency)}
                    </span>
                  ) : null}
                </Cell>
                <Cell>
                  <QualifyLead leadId={lead.id} editions={editionOptions} />
                </Cell>
              </tr>
            ))}
          </Table>
          {leads.length === 0 ? <Empty>No open leads.</Empty> : null}
        </div>
      </section>

      <section>
        <h2 className="eyebrow text-paper/40">Pipeline</h2>
        <div className="mt-6">
          <Table columns={["Opportunity", "Race", "Stage", "Close", "Amount"]}>
            {opportunities.map((opportunity) => (
              <tr key={opportunity.id}>
                <Cell>
                  {opportunity.name}
                  {opportunity.contact ? (
                    <span className="block text-xs text-paper/40">
                      {opportunity.contact.email}
                    </span>
                  ) : null}
                </Cell>
                <Cell muted>
                  {opportunity.edition
                    ? `${opportunity.edition.race.name} ${opportunity.edition.season}`
                    : "—"}
                </Cell>
                <Cell muted>{opportunity.stage.replace("_", " ")}</Cell>
                <Cell muted>{DATE.format(opportunity.closeDate)}</Cell>
                <Cell>
                  {formatMoney(opportunity.amountMinor, opportunity.currency)}
                </Cell>
              </tr>
            ))}
          </Table>
          {opportunities.length === 0 ? <Empty>No open opportunities.</Empty> : null}
        </div>
      </section>
    </div>
  );
}
