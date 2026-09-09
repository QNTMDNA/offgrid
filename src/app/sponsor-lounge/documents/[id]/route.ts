import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { currentMember } from "@/lib/lounge/session";
import { readDocument } from "@/lib/lounge/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const member = await currentMember();
  if (!member) {
    return NextResponse.redirect(new URL("/sponsor-lounge/login", request.url));
  }

  const { id } = await params;
  const document = await prisma.loungeDocument.findFirst({
    where: { id, published: true },
  });
  // Canva decks live at /sponsor-lounge/decks/[id]; nothing is stored for them.
  if (!document?.storageKey) return new NextResponse("Not found", { status: 404 });

  const download = request.nextUrl.searchParams.has("download");
  const list = await headers();
  await prisma.loungeAccess.create({
    data: {
      memberId: member.memberId,
      documentId: document.id,
      kind: download ? "DOWNLOAD" : "VIEW",
      ip: list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: list.get("user-agent"),
    },
  });

  const body = await readDocument(document.storageKey);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": document.contentType ?? "application/octet-stream",
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${document.filename ?? "deck"}"`,
      // Private material must not sit in a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
