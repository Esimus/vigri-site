// lib/session.ts
import { randomUUID } from 'crypto';
import { prisma } from '@/lib/prisma';

export const SESSION_COOKIE = 'vigri_session';
// how long the cookie/idle session should live
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 days

export async function createSession(userId: string): Promise<{ id: string; expiresAt: Date }> {
  const id = randomUUID();
  const now = Date.now();

  // our schema stores rolling expiry as BigInt timestamps
  const activeExpires = BigInt(now + SESSION_TTL_SECONDS * 1000);
  const idleExpires   = BigInt(now + SESSION_TTL_SECONDS * 1000);

  const created = await prisma.session.create({
    data: { id, userId, activeExpires, idleExpires },
  });

  // convenient Date for cookie "expires"
  const expiresAt = new Date(Number(idleExpires));
  return { id: created.id, expiresAt };
}

// ---- Cookie options (production-safe) ----
// Base cookie options that are shared across login/signup/logout.
// Use cookies().set(SESSION_COOKIE, value, cookieOptionsWithExpiry(expiresAt))
export const SESSION_COOKIE_OPTIONS_BASE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  // Next.js supports cookie priority; browsers may ignore it but it's safe to send
  priority: 'high' as const,
};

// Build cookie options including expiry and maxAge.
export function cookieOptionsWithExpiry(expiresAt: Date) {
  return {
    ...SESSION_COOKIE_OPTIONS_BASE,
    expires: expiresAt,
    maxAge: SESSION_TTL_SECONDS,
  };
}

// Build cookie options that immediately expire the cookie (for logout).
export const COOKIE_OPTIONS_EXPIRE_NOW = {
  ...SESSION_COOKIE_OPTIONS_BASE,
  expires: new Date(0),
  maxAge: 0,
};
