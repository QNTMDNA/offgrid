import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { formatMoney } from "@/lib/money";
import { Cell, Empty, PageHeader, Table } from "@/components/admin/table";
import { NewPayout } from "@/components/admin/new-payout";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export default async function PayoutsPage() {
  const [payouts, partners] = await Promise.all([
    prisma.payout.findMany({
      include: { partner: { include: { account: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.partner.findMany({
      where: { active: true },
      include: { account: true },
      orderBy: { account: { name: "asc" } },
    }),
  ]);

  return (
    <div className="space-y-10">
      <PageHeader
        title="Payouts"
        subtitle={
          env().WISE_ENABLED
            ? "Executed through the Wise Business API: quote, transfer, then fund from the Off Grid balance."
            : "Wise is disabled — payouts will queue and execute once WISE_ENABLED is set."
        }
      />

      <NewPayout
        partners={partners.map((partner) => ({
          id: partner.id,
          label: partner.account.name,
          currency: partner.payoutCurrency,
        }))}
      />

      <Table columns={["Created", "Partner", "Reference", "Status", "Cost", "Amount"]}>
        {payouts.map((payout) => (
          <tr key={payout.id}>
            <Cell muted>{DATE.format(payout.createdAt)}</Cell>
            <Cell>{payout.partner.account.name}</Cell>
            <Cell muted>
              <span className="font-mono text-xs">{payout.reference}</span>
              {payout.wiseTransferId ? (
                <span className="block font-mono text-xs text-paper/30">
                  transfer {payout.wiseTransferId}
                </span>
              ) : null}
            </Cell>
            <Cell muted>
              {payout.status}
              {payout.failureReason ? (
                <span className="block text-xs text-red-300">{payout.failureReason}</span>
              ) : null}
            </Cell>
            <Cell muted>
              {payout.sourceAmountMinor != null
                ? formatMoney(payout.sourceAmountMinor, payout.sourceCurrency)
                : "—"}
            </Cell>
            <Cell>{formatMoney(payout.amountMinor, payout.targetCurrency)}</Cell>
          </tr>
        ))}
      </Table>
      {payouts.length === 0 ? <Empty>No payouts yet.</Empty> : null}
    </div>
  );
}
