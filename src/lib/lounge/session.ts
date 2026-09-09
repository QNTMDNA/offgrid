import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

export const MEMBER_COOKIE = "ogr_member";
const MAX_AGE_SECONDS = 60 * 60 * 8;
/**
 * Both session types are signed with SESSION_SECRET, so the audience claim is
 * what stops an member token from being presented to the admin console.
 */
const AUDIENCE = "offgrid:members";

export type LoungeSession = {
  memberId: string;
  email: string;
  name: string;
};

function key(): Uint8Array {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

export async function signLoungeSession(session: LoungeSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
}

export async function verifyLoungeSession(
  token: string,
): Promise<LoungeSession | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { audience: AUDIENCE });
    const { memberId, email, name } = payload as Record<string, unknown>;
    if (
      typeof memberId !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string"
    ) {
      return null;
    }
    return { memberId, email, name };
  } catch {
    return null;
  }
}

export async function startLoungeSession(session: LoungeSession): Promise<void> {
  const jar = await cookies();
  jar.set(MEMBER_COOKIE, await signLoungeSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endLoungeSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(MEMBER_COOKIE);
}

/**
 * Tokens live for hours, so the account is re-checked on every gated request:
 * revoking access has to take effect immediately, not at expiry.
 */
export async function currentMember(): Promise<LoungeSession | null> {
  const jar = await cookies();
  const token = jar.get(MEMBER_COOKIE)?.value;
  const session = token ? await verifyLoungeSession(token) : null;
  if (!session) return null;

  const member = await prisma.loungeMember.findUnique({
    where: { id: session.memberId },
    select: { active: true },
  });
  return member?.active ? session : null;
}
