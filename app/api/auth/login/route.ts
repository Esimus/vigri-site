// app/api/auth/login/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/crypto';
import { createSession, SESSION_COOKIE, cookieOptionsWithExpiry } from '@/lib/session';
import { assertRateLimit, RateLimitError } from '@/lib/rateLimit';

export const runtime = 'nodejs';

type LoginBody = {
  email?: string;
  password?: string;
};

export async function POST(req: Request) {
  // Safe JSON parsing without `any`
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

  // Rate limit
  try {
    await assertRateLimit('login', req);
  } catch (e) {
    if (e instanceof RateLimitError) {
      const res = NextResponse.json({ ok: false, error: 'rate_limited' }, { status: 429 });
      res.headers.set('Retry-After', String(e.retryAfter));
      return res;
    }
    throw e;
  }

  // Find user
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true },
  });
  if (!user) {
    return NextResponse.json({ ok: false, error: 'invalid_creds' }, { status: 401 });
  }

  // Read password key
  const key = await prisma.key.findUnique({
    where: { id: `password:${user.id}` },
    select: { hashedPassword: true },
  });
  if (!key?.hashedPassword) {
    return NextResponse.json({ ok: false, error: 'invalid_creds' }, { status: 401 });
  }

  // Verify password
  const ok = await verifyPassword(key.hashedPassword, password);
  if (!ok) {
    return NextResponse.json({ ok: false, error: 'invalid_creds' }, { status: 401 });
  }

  // Require verified email
  if (!user.emailVerified) {
    return NextResponse.json({ ok: false, error: 'email_unverified' }, { status: 403 });
  }

  // Create session and set cookie
  const { id: sid, expiresAt } = await createSession(user.id);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, sid, cookieOptionsWithExpiry(expiresAt));
  return res;
}
