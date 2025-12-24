// app/api/referral/bind/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCookie } from '@/lib/cookies';
import { bindReferrerOnceAndAward } from '@/lib/referral';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'missing_userId' }, { status: 400 });
  }

  const ref = await getCookie('vigri_ref');
  if (!ref) {
    return NextResponse.json({ ok: false, error: 'no_ref_cookie' }, { status: 400 });
  }

  const res = await bindReferrerOnceAndAward(prisma, { userId, inviterId: ref });

  if (!res.ok) {
    const status =
      res.error === 'self_ref' ? 400 :
      res.error === 'already_bound' ? 409 :
      res.error === 'inviter_not_found' ? 404 :
      res.error === 'user_not_found' ? 404 :
      400;

    return NextResponse.json({ ok: false, error: res.error }, { status });
  }

  return NextResponse.json(res);
}
