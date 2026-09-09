import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ANON_COOKIE,
  TOUCH_COOKIE,
  newAnonymousId,
  recordTouch,
} from "@/lib/marketing/attribution";

const bodySchema = z.object({
  path: z.string().max(2048),
  search: z.string().max(2048).default(""),
  referrer: z.string().max(2048).optional(),
});

const YEAR = 60 * 60 * 24 * 365;

export async function POST(request: Request) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  const cookieAnon = request.headers
    .get("cookie")
    ?.split(";")
    .map((c) => c.trim().split("="))
    .find(([name]) => name === ANON_COOKIE)?.[1];
  const anonymousId = cookieAnon ?? newAnonymousId();

  const touchId = await recordTouch({
    anonymousId,
    landingPath: parsed.data.path,
    referrer: parsed.data.referrer || undefined,
    params: new URLSearchParams(parsed.data.search),
  });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(ANON_COOKIE, anonymousId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: YEAR,
  });
  if (touchId) {
    response.cookies.set(TOUCH_COOKIE, touchId, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: YEAR,
    });
  }
  return response;
}
