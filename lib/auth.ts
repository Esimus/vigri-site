// lib/auth.ts
import { getCookie } from '@/lib/cookies';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';

export type SafeUser = { id: string; email: string };

/** Load user by session id (sid) and do hard-expiry checks. */
export async function getAuthUserBySid(sid: string | null): Promise<SafeUser | null> {
  if (!sid) return null;

  const s = await prisma.session.findUnique({
    where: { id: sid },
    include: { user: true },
  });
  if (!s) return null;

  const now = BigInt(Date.now());
  if (s.idleExpires < now || s.activeExpires < now) {
    try {
      await prisma.session.delete({ where: { id: sid } });
    } catch {}
    return null;
  }

  return { id: s.user.id, email: s.user.email };
}

/** Read sid from cookie and delegate to getAuthUserBySid. */
export async function getAuthUser(): Promise<SafeUser | null> {
  const sid = await getCookie(SESSION_COOKIE);
  return sid ? getAuthUserBySid(sid) : null;
}
