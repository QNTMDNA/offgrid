import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { Empty, PageHeader } from "@/components/admin/table";
import { RaceForm, RaceImageForm } from "@/components/admin/catalog-forms";

export const dynamic = "force-dynamic";

export default async function RacesPage() {
  const session = await currentSession();
  if (!session || !can(session.role, "catalog:write")) redirect("/admin/catalog");

  const races = await prisma.race.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { editions: true } } },
  });

  return (
    <div className="space-y-12">
      <PageHeader
        title="Races"
        subtitle="Venues that editions hang off. Artwork uploaded here is used across the public site."
      />

      <RaceForm />

      {races.map((race) => (
        <section key={race.id} className="space-y-6">
          <div>
            <h2 className="text-xl font-light">{race.name}</h2>
            <p className="mt-1 text-xs text-paper/40">
              /races/{race.slug} · {race._count.editions} edition(s)
            </p>
          </div>
          <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
            <RaceForm race={race} />
            <RaceImageForm raceId={race.id} heroImage={race.heroImage} />
          </div>
        </section>
      ))}

      {races.length === 0 ? <Empty>No races yet.</Empty> : null}
    </div>
  );
}
