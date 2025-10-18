// app/api/auth/dev-verify/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// dev-only endpoint: mark emailVerified = true by email
export async function POST(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'not_allowed' }, { status: 403 });
  }
  try {
    const body = await req.json().catch(() => ({} as any));
    const email = (body?.email ?? '').trim().toLowerCase();
    if (!email) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) return NextResponse.json({ ok: true }); // не раскрываем

    await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    });

    // подчистим висящие verify-токены (не обязательно)
    await prisma.verifyEmailToken.deleteMany({ where: { userId: user.id } }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('dev-verify error', e);
    return NextResponse.json({ ok: false, error: 'internal_error' }, { status: 500 });
  }
}

// GET тоже поддержим для удобства в браузере: /api/auth/dev-verify?email=...
export async function GET(req: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ ok: false, error: 'not_allowed' }, { status: 403 });
  }
  const url = new URL(req.url);
  const email = (url.searchParams.get('email') ?? '').trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }
  // Переиспользуем POST-логику
  return POST(new Request(req.url, { method: 'POST', body: JSON.stringify({ email }) }));
}
