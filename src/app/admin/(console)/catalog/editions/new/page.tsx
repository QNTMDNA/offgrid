import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { Empty, PageHeader } from "@/components/admin/table";
import { EditionForm } from "@/components/admin/catalog-forms";

export const dynamic = "force-dynamic";

export default async function NewEditionPage() {
  const session = await currentSession();
  if (!session || !can(session.role, "catalog:write")) redirect("/admin/catalog");

  const races = await prisma.race.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return (
    <div className="space-y-10">
      <PageHeader
        title="New race edition"
        subtitle="Create the round first, then add hospitality packages and inventory."
      />
      {races.length === 0 ? (
        <Empty>Add a race under Catalog → Races before creating an edition.</Empty>
      ) : (
        <EditionForm races={races} />
      )}
    </div>
  );
}
