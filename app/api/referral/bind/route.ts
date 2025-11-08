// app/api/referral/bind/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCookie } from '@/lib/cookies';
import { creditEcho } from '@/lib/echo';

export const runtime = 'nodejs';

// echo rewards for "referral.registered" (tunable)
const L1_REGISTER = 0.05;
const L2_REGISTER = 0.025;
const L3_REGISTER = 0.0125;

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId'); // DEV: later from session
  if (!userId) {
    return NextResponse.json({ ok: false, error: 'missing_userId' }, { status: 400 });
  }

  // inviter code from cookie (MVP: inviter's userId)
  const ref = getCookie('vigri_ref');
  if (!ref) {
    return NextResponse.json({ ok: false, error: 'no_ref_cookie' }, { status: 400 });
  }
  if (ref === userId) {
    return NextResponse.json({ ok: false, error: 'self_ref' }, { status: 400 });
  }

  // inviter must exist
  const inviter = await prisma.user.findUnique({ where: { id: ref } });
  if (!inviter) {
    return NextResponse.json({ ok: false, error: 'inviter_not_found' }, { status: 404 });
  }

  // user must exist and not already bound
  const me = await prisma.user.findUnique({ where: { id: userId } });
  if (!me) {
    return NextResponse.json({ ok: false, error: 'user_not_found' }, { status: 404 });
  }
  if (me.referrerId) {
    return NextResponse.json({ ok: false, error: 'already_bound' }, { status: 409 });
  }

  // bind once
  await prisma.user.update({
    where: { id: userId },
    data: { referrerId: inviter.id },
  });

  // upline up to 3 levels
  const l1: string = inviter.id;
  const l2: string | null = inviter.referrerId ?? null;

  const l2User = l2 ? await prisma.user.findUnique({ where: { id: l2 } }) : null;
  const l3: string | null = l2User?.referrerId ?? null;

  // credit chain (idempotent via dedupeKey)
  try {
    await creditEcho(prisma, {
      userId: l1,
      kind: 'referral',
      action: 'referral.registered.l1',
      amount: L1_REGISTER,
      sourceId: userId,
      dedupeKey: `refbind:${userId}:l1`,
      meta: { invited: userId },
    });

    if (l2) {
      await creditEcho(prisma, {
        userId: l2,
        kind: 'referral',
        action: 'referral.registered.l2',
        amount: L2_REGISTER,
        sourceId: userId,
        dedupeKey: `refbind:${userId}:l2`,
        meta: { invited: userId },
      });
    }

    if (l3) {
      await creditEcho(prisma, {
        userId: l3,
        kind: 'referral',
        action: 'referral.registered.l3',
        amount: L3_REGISTER,
        sourceId: userId,
        dedupeKey: `refbind:${userId}:l3`,
        meta: { invited: userId },
      });
    }
  } catch {
    // don't block binding if rewards fail
  }

  return NextResponse.json({ ok: true, boundTo: l1, upline: { l1, l2, l3 } });
}
