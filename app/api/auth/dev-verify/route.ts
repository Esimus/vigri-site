// app/api/auth/dev-verify/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

type DevVerifyBody = { email?: string };

/** Dev-only endpoint: mark emailVerified = true by email */
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'not_allowed' }, { status: 403 });
  }

  try {
    // Safe JSON parsing without `any`
    let bodyUnknown: unknown = {};
    try {
      bodyUnknown = await req.json();
    } catch {
      // ignore malformed JSON
    }
    const body = bodyUnknown as DevVerifyBody;
    const email = (body?.email ?? '').trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    // Do not reveal existence of user
    if (!user) return NextResponse.json({ ok: true });

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    // Cleanup pending verify tokens (optional)
    await prisma.verifyEmailToken.deleteMany({ where: { userId: user.id } }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    // Keep concise log in dev; no eslint-disable needed
    console.error('dev-verify error', e);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

/** Also support GET for convenience in the browser: /api/auth/dev-verify?email=... */
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'not_allowed' }, { status: 403 });
  }

  const url = new URL(req.url);
  const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  // Reuse POST logic
  return POST(
    new Request(req.url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email }),
    }),
  );
}
