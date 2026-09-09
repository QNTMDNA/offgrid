import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import type { AdminRole } from "@prisma/client";
import { env } from "@/lib/env";

export const SESSION_COOKIE = "ogr_admin";
const MAX_AGE_SECONDS = 60 * 60 * 12;

export type AdminSession = {
  userId: string;
  email: string;
  name: string;
  role: AdminRole;
};

function key(): Uint8Array {
  return new TextEncoder().encode(env().SESSION_SECRET);
}

export async function signSession(session: AdminSession): Promise<string> {
  return new SignJWT({ ...session })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE_SECONDS}s`)
    .sign(key());
}

export async function verifySession(token: string): Promise<AdminSession | null> {
  try {
    const { payload } = await jwtVerify(token, key());
    const { userId, email, name, role } = payload as Record<string, unknown>;
    if (
      typeof userId !== "string" ||
      typeof email !== "string" ||
      typeof name !== "string" ||
      typeof role !== "string"
    ) {
      return null;
    }
    return { userId, email, name, role: role as AdminRole };
  } catch {
    return null;
  }
}

export async function startSession(session: AdminSession): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, await signSession(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function endSession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function currentSession(): Promise<AdminSession | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  return token ? verifySession(token) : null;
}
