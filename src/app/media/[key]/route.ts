import { NextResponse } from "next/server";
import { contentTypeForKey, readImage } from "@/lib/catalog/media";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ key: string }> },
) {
  const { key } = await params;
  try {
    const body = await readImage(key);
    return new NextResponse(new Uint8Array(body), {
      headers: {
        "Content-Type": contentTypeForKey(key),
        "Content-Length": String(body.byteLength),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
