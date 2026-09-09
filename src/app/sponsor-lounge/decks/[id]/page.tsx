import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { currentMember } from "@/lib/lounge/session";
import { ButtonLink } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function LoungeDeckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const member = await currentMember();
  if (!member) redirect("/sponsor-lounge/login");

  const { id } = await params;
  const document = await prisma.loungeDocument.findFirst({
    where: { id, published: true },
  });
  if (!document?.embedUrl) notFound();

  const list = await headers();
  await prisma.loungeAccess.create({
    data: {
      memberId: member.memberId,
      documentId: document.id,
      kind: "VIEW",
      ip: list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: list.get("user-agent"),
    },
  });

  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-16">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-paper/50">Confidential</p>
          <h1 className="mt-4 text-3xl font-light">{document.title}</h1>
          {document.summary ? (
            <p className="mt-3 max-w-xl text-sm text-paper/50">{document.summary}</p>
          ) : null}
        </div>
        <ButtonLink href="/sponsor-lounge" variant="ghost">
          Back
        </ButtonLink>
      </div>

      <div className="relative mt-10 h-0 w-full border border-paper/10 pb-[56.25%]">
        <iframe
          src={document.embedUrl}
          title={document.title}
          allowFullScreen
          allow="fullscreen"
          loading="lazy"
          className="absolute left-0 top-0 h-full w-full"
        />
      </div>

      <p className="mt-6 text-xs text-paper/40">
        Viewed as {member.name}. This deck is confidential and provided under the terms
        of your NDA; access is recorded against your account.
      </p>
    </div>
  );
}
