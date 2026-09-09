import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentSession } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import {
  deleteInvestorDocumentAction,
  setDocumentPublishedAction,
  setInvestorActiveAction,
} from "@/app/actions/investors";
import { InviteInvestor } from "@/components/admin/invite-investor";
import { UploadDeck } from "@/components/admin/upload-deck";
import { Cell, Empty, PageHeader, Table } from "@/components/admin/table";
import { Button } from "@/components/ui";

export const dynamic = "force-dynamic";

const DATE_TIME = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export default async function InvestorsAdminPage() {
  const session = await currentSession();
  if (!session || !can(session.role, "investors:read")) notFound();

  const [investors, documents, accessLog] = await Promise.all([
    prisma.investorUser.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { accessLog: true } } },
    }),
    prisma.investorDocument.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { accessLog: true } } },
    }),
    prisma.investorAccess.findMany({
      orderBy: { createdAt: "desc" },
      take: 40,
      include: { investor: true, document: true },
    }),
  ]);

  return (
    <div className="space-y-12">
      <PageHeader
        title="Investor room"
        subtitle="Passcode-gated decks and reporting at /investors. Every sign-in and document open is logged."
      />

      <UploadDeck />

      <section className="space-y-4">
        <h2 className="eyebrow text-paper/40">Documents</h2>
        <Table columns={["Document", "Period", "Size", "Opens", "Status", ""]}>
          {documents.map((document) => (
            <tr key={document.id}>
              <Cell>
                {document.title}
                <span className="ml-2 font-mono text-xs text-paper/40">
                  {document.filename}
                </span>
              </Cell>
              <Cell muted>{document.period ?? "—"}</Cell>
              <Cell muted>{Math.max(1, Math.round(document.sizeBytes / 1024))} KB</Cell>
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
                <form action={deleteInvestorDocumentAction}>
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

      <InviteInvestor />

      <section className="space-y-4">
        <h2 className="eyebrow text-paper/40">Access list</h2>
        <Table columns={["Investor", "Organisation", "Last sign-in", "Events", ""]}>
          {investors.map((investor) => (
            <tr key={investor.id}>
              <Cell>
                {investor.name}
                <span className="ml-2 text-paper/40">{investor.email}</span>
              </Cell>
              <Cell muted>{investor.organization ?? "—"}</Cell>
              <Cell muted>
                {investor.lastLoginAt ? DATE_TIME.format(investor.lastLoginAt) : "never"}
              </Cell>
              <Cell muted>{investor._count.accessLog}</Cell>
              <Cell muted>
                <form action={setInvestorActiveAction}>
                  <input type="hidden" name="investorId" value={investor.id} />
                  <input type="hidden" name="active" value={String(!investor.active)} />
                  <Button type="submit" variant="ghost">
                    {investor.active ? "Active — revoke" : "Revoked — restore"}
                  </Button>
                </form>
              </Cell>
            </tr>
          ))}
        </Table>
        {investors.length === 0 ? <Empty>Nobody has been granted access yet.</Empty> : null}
      </section>

      <section className="space-y-4">
        <h2 className="eyebrow text-paper/40">Recent activity</h2>
        <Table columns={["When", "Investor", "Event", "Document", "IP"]}>
          {accessLog.map((entry) => (
            <tr key={entry.id}>
              <Cell muted>{DATE_TIME.format(entry.createdAt)}</Cell>
              <Cell>{entry.investor.email}</Cell>
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
