import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { availableUnits } from "@/lib/inventory";
import { committedUnits } from "@/lib/catalog/manage";
import { PageHeader } from "@/components/admin/table";
import {
  ArchivePackage,
  EditionForm,
  PackageForm,
  RaceImageForm,
} from "@/components/admin/catalog-forms";

export const dynamic = "force-dynamic";

export default async function EditionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await currentSession();
  if (!session || !can(session.role, "catalog:write")) redirect("/admin/catalog");

  const { id } = await params;
  const edition = await prisma.raceEdition.findUnique({
    where: { id },
    include: { race: true, packages: { orderBy: { sortOrder: "asc" } } },
  });
  if (!edition) notFound();

  const inventory = new Map(
    await Promise.all(
      edition.packages.map(
        async (pkg) =>
          [
            pkg.id,
            {
              available: await availableUnits(pkg.id),
              committed: await committedUnits(pkg.id),
            },
          ] as const,
      ),
    ),
  );

  return (
    <div className="space-y-12">
      <PageHeader
        title={`${edition.race.name} ${edition.season}`}
        subtitle={`/races/${edition.slug} · ${edition.race.city}, ${edition.race.country}`}
        action={
          <Link
            href={`/races/${edition.slug}`}
            className="eyebrow text-paper/50 hover:text-accent"
          >
            View public page
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <EditionForm edition={edition} />
        <RaceImageForm raceId={edition.race.id} heroImage={edition.race.heroImage} />
      </div>

      <section className="space-y-6">
        <h2 className="text-xl font-light">Packages and inventory</h2>
        {edition.packages.map((pkg) => {
          const counts = inventory.get(pkg.id);
          return (
            <div key={pkg.id} className="space-y-3">
              <PackageForm
                editionId={edition.id}
                currency={edition.currency}
                pkg={pkg}
                committed={counts?.committed}
              />
              <div className="flex flex-wrap items-center justify-between gap-4 px-1">
                <p className="text-xs text-paper/40">
                  {counts?.available ?? 0} available · {counts?.committed ?? 0} sold or held
                </p>
                <ArchivePackage packageId={pkg.id} />
              </div>
            </div>
          );
        })}
        <PackageForm editionId={edition.id} currency={edition.currency} />
      </section>
    </div>
  );
}
