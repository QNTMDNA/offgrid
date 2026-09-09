import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import {
  deleteLoungeDocumentAction,
  setDocumentPublishedAction,
  setMemberActiveAction,
} from "@/app/actions/lounge";
import { InviteMember } from "@/components/admin/invite-member";
import { UploadDeck } from "@/components/admin/upload-deck";
import { AddCanvaDeck } from "@/components/admin/add-canva-deck";
import { Cell, Empty, PageHeader, Table } from "@/components/admin/table";
import { Button } from "@/components/ui";

export const dynamic = "force-dynamic";

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export default async function SponsorLoungeAdminPage() {
  const session = await currentSession();
  if (!session || !can(session.role, "lounge:read")) notFound();

  const [members, documents, accessLog] = await Promise.all([
    prisma.loungeMember.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { accessLog: true } } },
    }),
    prisma.loungeDocument.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { accessLog: true } } },
    }),
    prisma.loungeAccess.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { member: true, document: true },
    }),
  ]);

  return (
    <div className="space-y-12">
      <PageHeader
        title="Sponsor Lounge"
        subtitle="Passcode-gated decks and reporting at /sponsor-lounge. Every sign-in and document open is logged."
      />

      <UploadDeck />

      <AddCanvaDeck />

      <section className="space-y-4">
        <h2 className="eyebrow text-paper/40">Documents</h2>
        <Table columns={["Document", "Period", "Size", "Opens", "Status", ""]}>
          {documents.map((document) => (
            <tr key={document.id}>
              <Cell>
                {document.title}
                <span className="ml-2 font-mono text-xs text-paper/40">
                  {document.filename ?? "canva"}
                </span>
              </Cell>
              <Cell muted>{document.period ?? "—"}</Cell>
              <Cell muted>
                {document.sizeBytes
                  ? `${Math.max(1, Math.round(document.sizeBytes / 1024))} KB`
                  : "embed"}
              </Cell>
              <Cell muted>{document._count.accessLog}</Cell>
              <Cell muted>
                <form action={setDocumentPublishedAction}>
                  <input type="hidden" name="documentId" value={document.id} />
                  <input
                    type="hidden"
                    name="published"
                    value={String(!document.published)}
                  />
                  <Button type="submit" variant="ghost">
                    {document.published ? "Published — unpublish" : "Draft — publish"}
                  </Button>
                </form>
              </Cell>
              <Cell muted>
                <form action={deleteLoungeDocumentAction}>
                  <input type="hidden" name="documentId" value={document.id} />
                  <Button type="submit" variant="ghost">
                    Delete
                  </Button>
                </form>
              </Cell>
            </tr>
          ))}
        </Table>
        {documents.length === 0 ? <Empty>No documents uploaded yet.</Empty> : null}
      </section>

      <InviteMember />

      <section className="space-y-4">
        <h2 className="eyebrow text-paper/40">Access list</h2>
        <Table columns={["Member", "Organisation", "Last sign-in", "Events", ""]}>
          {members.map((member) => (
            <tr key={member.id}>
              <Cell>
                {member.name}
                <span className="ml-2 text-paper/40">{member.email}</span>
              </Cell>
              <Cell muted>{member.organization ?? "—"}</Cell>
              <Cell muted>
                {member.lastLoginAt ? DATE_TIME.format(member.lastLoginAt) : "never"}
              </Cell>
              <Cell muted>{member._count.accessLog}</Cell>
              <Cell muted>
                <form action={setMemberActiveAction}>
                  <input type="hidden" name="memberId" value={member.id} />
                  <input type="hidden" name="active" value={String(!member.active)} />
                  <Button type="submit" variant="ghost">
                    {member.active ? "Active — revoke" : "Revoked — restore"}
                  </Button>
                </form>
              </Cell>
            </tr>
          ))}
        </Table>
        {members.length === 0 ? <Empty>Nobody has been granted access yet.</Empty> : null}
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow text-paper/40">Recent activity</h2>
        <Table columns={["When", "Member", "Event", "Document", "IP"]}>
          {accessLog.map((entry) => (
            <tr key={entry.id}>
              <Cell muted>{DATE_TIME.format(entry.createdAt)}</Cell>
              <Cell>{entry.member.email}</Cell>
              <Cell muted>{entry.kind.replace("_", " ").toLowerCase()}</Cell>
              <Cell muted>{entry.document?.title ?? "—"}</Cell>
              <Cell muted>
                <span className="font-mono text-xs">{entry.ip ?? "—"}</span>
              </Cell>
            </tr>
          ))}
        </Table>
        {accessLog.length === 0 ? <Empty>No activity yet.</Empty> : null}
      </section>
    </div>
  );
}
