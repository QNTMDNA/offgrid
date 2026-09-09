import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/lib/env";
import { prisma } from "@/lib/db";

export const INVESTOR_COOKIE = "ogr_investor";
const MAX_AGE_SECONDS = 60 * 60 * 8;
/**
 * Both session types are signed with SESSION_SECRET, so the audience claim is
 * what stops an investor token from being presented to the admin console.
 */
const AUDIENCE = "offgrid:investors";

export type InvestorSession = {
  investorId: string;
  email: string;
  name: string;
};

function key(): Uint8Array {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

export async function signInvestorSession(session: InvestorSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setAudience(AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
}

export async function verifyInvestorSession(
  token: string,
): Promise<InvestorSession | null> {
  try {
    const { payload } = await jwtVerify(token, key(), { audience: AUDIENCE });
    const { investorId, email, name } = payload as Record<string, unknown>;
    if (
      typeof investorId !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string"
    ) {
      return null;
    }
    return { investorId, email, name };
  } catch {
    return null;
  }
}

export async function startInvestorSession(session: InvestorSession): Promise<void> {
  const jar = await cookies();
  jar.set(INVESTOR_COOKIE, await signInvestorSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endInvestorSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(INVESTOR_COOKIE);
}

/**
 * Tokens live for hours, so the account is re-checked on every gated request:
 * revoking access has to take effect immediately, not at expiry.
 */
export async function currentInvestor(): Promise<InvestorSession | null> {
  const jar = await cookies();
  const token = jar.get(INVESTOR_COOKIE)?.value;
  const session = token ? await verifyInvestorSession(token) : null;
  if (!session) return null;

  const investor = await prisma.investorUser.findUnique({
    where: { id: session.investorId },
    select: { active: true },
  });
  return investor?.active ? session : null;
}
