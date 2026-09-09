import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentInvestor } from "@/lib/investors/session";
import { investorSignOutAction } from "@/app/actions/investors";
import { Button, ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

const DATE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

function fileSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export default async function InvestorRoomPage() {
  const investor = await currentInvestor();
  if (!investor) redirect("/investors/login");

  const documents = await prisma.investorDocument.findMany({
    where: { published: true },
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
  });

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16">
      <div className="flex items-start justify-between gap-6">
        <div>
          <p className="eyebrow text-paper/50">Confidential</p>
          <h1 className="mt-4 text-3xl font-light">Decks and reporting</h1>
          <p className="mt-4 max-w-xl text-sm text-paper/50">
            Signed in as {investor.name}. These documents are confidential and provided
            under the terms of your NDA. Downloads are recorded against your account.
          </p>
        </div>
        <form action={investorSignOutAction}>
          <Button type="submit" variant="ghost">
            Sign out
          </Button>
        </form>
      </div>

      <div className="mt-14 divide-y divide-paper/10 border-y border-paper/10">
        {documents.map((document) => (
          <article
            key={document.id}
            className="flex flex-col gap-4 py-8 md:flex-row md:items-center md:justify-between"
          >
            <div>
              <h2 className="text-lg font-light">{document.title}</h2>
              {document.summary ? (
                <p className="mt-2 max-w-xl text-sm text-paper/50">{document.summary}</p>
              ) : null}
              <p className="mt-3 text-xs text-paper/40">
                {[
                  document.period,
                  document.publishedAt ? DATE.format(document.publishedAt) : null,
                  fileSize(document.sizeBytes),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <div className="flex gap-3">
              <ButtonLink
                href={`/investors/documents/${document.id}`}
                variant="outline"
                target="_blank"
              >
                View
              </ButtonLink>
              <ButtonLink href={`/investors/documents/${document.id}?download=1`}>
                Download
              </ButtonLink>
            </div>
          </article>
        ))}
      </div>

      {documents.length === 0 ? (
        <p className="mt-14 text-sm text-paper/50">
          Nothing has been published yet. We will email you when the next deck is posted.
        </p>
      ) : null}
    </div>
  );
}
