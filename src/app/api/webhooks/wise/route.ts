import { NextResponse } from "next/server";
import { handleWebhook, verifySignature } from "@/lib/integrations/wise/webhook";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const raw = await request.text();
  const signature = request.headers.get("x-signature-sha256") ?? "";
  const deliveryId = request.headers.get("x-delivery-id");

  if (!deliveryId) {
    return NextResponse.json({ error: "missing delivery id" }, { status: 400 });
  }
  if (!signature || !verifySignature(raw, signature)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const outcome = await handleWebhook(
    deliveryId,
    event as Parameters<typeof handleWebhook>[1],
  );
  return NextResponse.json(outcome);
}
