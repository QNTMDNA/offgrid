import { headers } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { currentInvestor } from "@/lib/investors/session";
import { readDocument } from "@/lib/investors/storage";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const investor = await currentInvestor();
  if (!investor) {
    return NextResponse.redirect(new URL("/investors/login", request.url));
  }

  const { id } = await params;
  const document = await prisma.investorDocument.findFirst({
    where: { id, published: true },
  });
  if (!document) return new NextResponse("Not found", { status: 404 });

  const download = request.nextUrl.searchParams.has("download");
  const list = await headers();
  await prisma.investorAccess.create({
    data: {
      investorId: investor.investorId,
      documentId: document.id,
      kind: download ? "DOWNLOAD" : "VIEW",
      ip: list.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      userAgent: list.get("user-agent"),
    },
  });

  const body = await readDocument(document.storageKey);
  return new NextResponse(new Uint8Array(body), {
    headers: {
      "Content-Type": document.contentType,
      "Content-Length": String(body.byteLength),
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${document.filename}"`,
      // Private material must not sit in a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
