// app/api/referral/bind-by-email/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { bindReferrerOnceAndAward } from '@/lib/referral';

export const runtime = 'nodejs';

type Body = { email?: string };

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'missing_userId' }, { status: 400 });
  }

  let bodyUnknown: unknown = {};
  try { bodyUnknown = await req.json(); } catch {}
  const body = bodyUnknown as Body;

  const email = (body.email ?? '').trim().toLowerCase();
  if (!email || !email.includes('@')) {
    return NextResponse.json({ ok: false, error: 'bad_email' }, { status: 400 });
  }

  const inviterByEmail = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (!inviterByEmail) {
    return NextResponse.json({ ok: false, error: 'inviter_not_found' }, { status: 404 });
  }

  const res = await bindReferrerOnceAndAward(prisma, { userId, inviterId: inviterByEmail.id });

  if (!res.ok) {
    const status =
      res.error === 'self_ref' ? 400 :
      res.error === 'already_bound' ? 409 :
      res.error === 'inviter_not_found' ? 404 :
      res.error === 'user_not_found' ? 404 :
      400;

    return NextResponse.json({ ok: false, error: res.error }, { status });
  }

  const out = NextResponse.json(res);

  out.cookies.set({
    name: 'vigri_ref',
    value: inviterByEmail.id,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 90,
  });

  return out;
}
