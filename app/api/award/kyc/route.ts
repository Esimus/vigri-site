// app/api/referral/award/kyc/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { creditEcho } from '@/lib/echo';

export const runtime = 'nodejs';

// Payouts for KYC-approved event (in micro-echo)
const L1_UECHO = 200_000; // +0.2 echo
const L2_UECHO = 100_000; // +0.1 echo
const L3_UECHO =  50_000; // +0.05 echo

type Err = { ok: false; error: string };
type Ok = { ok: true; userId: string; paid: Array<{ level: number; userId: string; amountUe: number }> };

// POST /api/referral/award/kyc?userId=...
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  if (!userId) return NextResponse.json<Err>({ ok: false, error: 'missing_userId' }, { status: 400 });

  // referee (got KYC approved)
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referrerId: true },
  });
  if (!me) return NextResponse.json<Err>({ ok: false, error: 'user_not_found' }, { status: 404 });

  const refereeId = me.id;

  // Build upline up to 3 levels
  const l1 = me.referrerId ?? null;
  const l2User = l1
    ? await prisma.user.findUnique({ where: { id: l1 }, select: { id: true, referrerId: true } })
    : null;
  const l2 = l2User?.referrerId ?? null;

  const l3User = l2
    ? await prisma.user.findUnique({ where: { id: l2 }, select: { id: true, referrerId: true } })
    : null;
  const l3 = l3User?.referrerId ?? null;

  const sourceId = `kyc:${refereeId}`; // idempotency
  const paid: Array<{ level: number; userId: string; amountUe: number }> = [];

  async function pay(level: number, toUserId: string, amountUe: number) {
    await creditEcho(prisma, {
      userId: toUserId,
      amount: amountUe,                // micro-echo
      kind: 'referral',
      action: `kyc.approved.L${level}`,
      sourceId,                        // de-dupe
      refUserId: refereeId,            // who triggered
      meta: { bucket: 'base' },
      dedupeKey: `kyc:L${level}:${toUserId}:${sourceId}`,
    });
    paid.push({ level, userId: toUserId, amountUe });
  }

  if (l1) await pay(1, l1, L1_UECHO);
  if (l2) await pay(2, l2, L2_UECHO);
  if (l3) await pay(3, l3, L3_UECHO);

  return NextResponse.json<Ok>({ ok: true, userId: refereeId, paid });
}
