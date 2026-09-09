import { prisma } from "@/lib/db";
import { formatMoney } from "@/lib/money";
import { Cell, Empty, PageHeader, Table } from "@/components/admin/table";

export const dynamic = "force-dynamic";

export default async function PartnersAdminPage() {
  const partners = await prisma.partner.findMany({
    include: {
      account: true,
      sponsorships: { include: { edition: { include: { race: true } } } },
      _count: { select: { payouts: true } },
    },
    orderBy: { account: { name: "asc" } },
  });

  return (
    <div className="space-y-10">
      <PageHeader
        title="Partners"
        subtitle="Brand, venue and supplier relationships, and the Wise recipient each is paid through."
      />

      <Table
        columns={["Partner", "Kind", "Payout currency", "Wise recipient", "Sponsorships", "Payouts"]}
      >
        {partners.map((partner) => (
          <tr key={partner.id}>
            <Cell>
              {partner.account.name}
              {partner.showcase ? (
                <span className="ml-2 text-xs text-accent">public</span>
              ) : null}
            </Cell>
            <Cell muted>{partner.kind.replace("_", " ")}</Cell>
            <Cell muted>{partner.payoutCurrency}</Cell>
            <Cell muted>
              <span className="font-mono text-xs">
                {partner.wiseRecipientId ?? "not set up"}
              </span>
            </Cell>
            <Cell muted>
              {partner.sponsorships.length === 0
                ? "—"
                : partner.sponsorships
                    .map(
                      (s) =>
                        `${s.edition.race.city} ${s.edition.season} · ${s.tier} · ${formatMoney(
                          s.valueMinor,
                          s.currency,
                        )}`,
                    )
                    .join(" / ")}
            </Cell>
            <Cell muted>{partner._count.payouts}</Cell>
          </tr>
        ))}
      </Table>
      {partners.length === 0 ? <Empty>No partners yet.</Empty> : null}
    </div>
  );
}
