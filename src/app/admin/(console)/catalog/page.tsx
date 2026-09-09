import { prisma } from "@/lib/db";
import { availableUnits } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { Cell, Empty, PageHeader, Table } from "@/components/admin/table";
import { EditionStatusControl } from "@/components/admin/edition-status";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export default async function CatalogPage() {
  const editions = await prisma.raceEdition.findMany({
    include: {
      race: true,
      packages: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: { startsAt: "asc" },
  });

  const availability = new Map<string, number>(
    await Promise.all(
      editions
        .flatMap((edition) => edition.packages)
        .map(
          async (pkg) => [pkg.id, await availableUnits(pkg.id)] as [string, number],
        ),
    ),
  );

  return (
    <div className="space-y-12">
      <PageHeader
        title="Catalog"
        subtitle="Race editions, hospitality packages and live inventory."
      />

      {editions.map((edition) => (
        <section key={edition.id}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-xl font-light">
                {edition.race.name} {edition.season}
              </h2>
              <p className="mt-1 text-xs text-paper/40">
                {DATE.format(edition.startsAt)} — {DATE.format(edition.endsAt)} ·{" "}
                {edition.race.city}, {edition.race.country}
              </p>
            </div>
            <EditionStatusControl editionId={edition.id} status={edition.status} />
          </div>

          <div className="mt-6">
            <Table
              columns={["SKU", "Package", "Kind", "Price", "Seats/unit", "Total", "Available"]}
            >
              {edition.packages.map((pkg) => (
                <tr key={pkg.id}>
                  <Cell muted>
                    <span className="font-mono text-xs">{pkg.sku}</span>
                  </Cell>
                  <Cell>
                    {pkg.name}
                    {pkg.inviteOnly ? (
                      <span className="ml-2 text-xs text-accent">invite only</span>
                    ) : null}
                  </Cell>
                  <Cell muted>{pkg.kind.replace("_", " ")}</Cell>
                  <Cell>{formatMoney(pkg.priceMinor, edition.currency)}</Cell>
                  <Cell muted>{pkg.seatsPerUnit}</Cell>
                  <Cell muted>
                    {pkg.totalUnits}
                    {pkg.heldUnits ? ` (−${pkg.heldUnits} held)` : ""}
                  </Cell>
                  <Cell>{availability.get(pkg.id) ?? 0}</Cell>
                </tr>
              ))}
            </Table>
            {edition.packages.length === 0 ? (
              <Empty>No packages configured for this round.</Empty>
            ) : null}
          </div>
        </section>
      ))}

      {editions.length === 0 ? <Empty>No race editions yet.</Empty> : null}
    </div>
  );
}
