// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/crypto';
import {
  createSession,
  SESSION_COOKIE,
  cookieOptionsWithExpiry,
} from '@/lib/session';
import { assertRateLimit, RateLimitError } from '@/lib/rateLimit';
import { creditEcho } from '@/lib/echo';
import { loadAwardRules } from '@/lib/awards';
import { bindReferrerOnceAndAward } from '@/lib/referral';

export const runtime = 'nodejs';

type LoginBody = {
  email?: string;
  password?: string;
};

const REF_COOKIE = 'vigri_ref';

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.split('=');
    if (k && k.trim() === name) {
      return decodeURIComponent(rest.join('=').trim());
    }
  }
  return null;
}

async function awardSelfFirstLoginEcho(userId: string): Promise<void> {
  let selfAmount = 10;

  try {
    const rules = await loadAwardRules();
    const fl = (rules as unknown as { first_login?: { bonus?: number } }).first_login;
    if (
      fl &&
      typeof fl.bonus === 'number' &&
      Number.isFinite(fl.bonus) &&
      fl.bonus > 0
    ) {
      selfAmount = fl.bonus;
    }
  } catch {
    // ignore
  }

  if (selfAmount <= 0) return;

  const sourceId = `first_login:${userId}`;

  try {
    await creditEcho(prisma, {
      userId,
      kind: 'bonus',
      action: 'self.registration',
      amount: selfAmount,
      sourceId,
      dedupeKey: `first_login:self:${userId}`,
      refUserId: userId,
      meta: { reason: 'first_login' },
    });
  } catch (e) {
    console.error('first_login self echo error', e);
  }
}

export async function POST(req: Request) {
  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {
    // ignore malformed JSON
  }
  const body = bodyUnknown as LoginBody;

  const email = (body?.email ?? '').trim().toLowerCase();
  const password = (body?.password ?? '').trim();

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  try {
    await assertRateLimit('login', req);
  } catch (e) {
    if (e instanceof RateLimitError) {
      const res = NextResponse.json(
        { ok: false, error: 'rate_limited' },
        { status: 429 },
      );
      res.headers.set('Retry-After', String(e.retryAfter));
      return res;
    }
    throw e;
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, referrerId: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, error: 'invalid_creds' }, { status: 401 });
  }

  const key = await prisma.key.findUnique({
    where: { id: `password:${user.id}` },
    select: { hashedPassword: true },
  });
  if (!key?.hashedPassword) {
    return NextResponse.json({ ok: false, error: 'invalid_creds' }, { status: 401 });
  }

  const ok = await verifyPassword(key.hashedPassword, password);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'invalid_creds' }, { status: 401 });
  }

  if (!user.emailVerified) {
    return NextResponse.json({ ok: false, error: 'email_unverified' }, { status: 403 });
  }

  const cookieHeader = req.headers.get('cookie');
  const cookieVal = readCookie(cookieHeader, REF_COOKIE);

  if (!user.referrerId && cookieVal && cookieVal !== user.id) {
    try {
      await bindReferrerOnceAndAward(prisma, { userId: user.id, inviterId: cookieVal });
    } catch {
      // ignore
    }
  }

  await awardSelfFirstLoginEcho(user.id);

  const { id: sid, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sid, cookieOptionsWithExpiry(expiresAt));
  return res;
}
