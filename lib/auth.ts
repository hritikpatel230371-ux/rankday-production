import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createHmac, randomBytes, timingSafeEqual } from "crypto";
import { appConfig } from "@/lib/config";
import { getAuthSecret } from "@/lib/env";

const AUTH_SECRET = getAuthSecret();

type SessionPayload = {
  userId: string;
  sessionId: string;
  expiresAt: number;
};

function getSecret() {
  return AUTH_SECRET;
}

function sign(value: string) {
  return createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function createSessionToken(userId: string, sessionId: string, expiresAt: number) {
  const payload: SessionPayload = {
    userId,
    sessionId,
    expiresAt
  };
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${body}.${sign(body)}`;
}

export function readSessionToken(token?: string | null): SessionPayload | null {
  if (!token) return null;
  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expected = sign(body);
  const valid =
    expected.length === signature.length &&
    timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  if (!valid) return null;

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString());
  } catch {
    return null;
  }

  if (!payload || typeof payload !== "object") return null;

  const candidate = payload as Partial<SessionPayload>;
  if (
    typeof candidate.userId !== "string" ||
    typeof candidate.sessionId !== "string" ||
    typeof candidate.expiresAt !== "number" ||
    !Number.isFinite(candidate.expiresAt)
  ) {
    return null;
  }
  if (candidate.expiresAt <= Date.now()) return null;

  return {
    userId: candidate.userId,
    sessionId: candidate.sessionId,
    expiresAt: candidate.expiresAt
  };
}

export async function setSession(userId: string) {
  const jar = await cookies();
  const sessionId = randomBytes(32).toString("base64url");
  const expiresAt = Date.now() + appConfig.sessionDays * 24 * 60 * 60 * 1000;
  const { prisma } = await import("@/lib/prisma");
  await prisma.authSession.create({
    data: { id: sessionId, userId, expiresAt: new Date(expiresAt) }
  });
  jar.set(appConfig.authCookie, createSessionToken(userId, sessionId, expiresAt), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: appConfig.sessionDays * 24 * 60 * 60
  });
}

export async function clearSession() {
  const jar = await cookies();
  const session = readSessionToken(jar.get(appConfig.authCookie)?.value);
  jar.delete(appConfig.authCookie);
  if (session) {
    const { prisma } = await import("@/lib/prisma");
    await prisma.authSession.deleteMany({ where: { id: session.sessionId, userId: session.userId } });
  }
}

/**
 * Memoized getCurrentUser.
 * Wrapped with React cache() to deduplicate database lookups within a single request.
 * Calling this across layout.tsx, page.tsx, and server components will execute the
 * database query only ONCE per request, eliminating redundant network round trips.
 */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const session = readSessionToken(jar.get(appConfig.authCookie)?.value);
  if (!session) return null;
  const { prisma } = await import("@/lib/prisma");
  const storedSession = await prisma.authSession.findFirst({
    where: { id: session.sessionId, userId: session.userId, expiresAt: { gt: new Date() } },
    select: { user: { select: { id: true, email: true, name: true, profile: true } } }
  });
  return storedSession?.user ?? null;
});

/**
 * Memoized requireUser.
 * Guarantees authenticated user state or redirects to /login.
 */
export const requireUser = cache(async () => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

export function assertOwner(recordUserId: string, userId: string) {
  if (recordUserId !== userId) throw new Error("FORBIDDEN");
}
