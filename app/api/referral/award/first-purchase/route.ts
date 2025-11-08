// app/api/referral/award/first-purchase/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { creditEcho } from '@/lib/echo';

export const runtime = 'nodejs';

// Base payouts in micro-echo (uecho). Will be scaled by tier multiplier.
const BASE_L1_UECHO = 200_000; // +0.2 echo
const BASE_L2_UECHO = 100_000; // +0.1 echo
const BASE_L3_UECHO =  50_000; // +0.05 echo

// Tier multipliers
const TIER_MULT = {
  Base: 1.0,
  Bronze: 1.0,
  Silver: 1.5,
  Gold: 2.0,
  Platinum: 3.0,
  Tree: 1.0,
  Steel: 1.2,
} as const;
type TierKey = keyof typeof TIER_MULT;

function tierMult(t: string): number {
  const key = (t in TIER_MULT ? t : 'Base') as TierKey;
  return TIER_MULT[key];
}

type Err = { ok: false; error: string };
type PaidItem = { level: number; userId: string; amountUe: number };
type Ok = { ok: true; userId: string; tier: string; paid: PaidItem[] };

// POST /api/referral/award/first-purchase?userId=...&tier=Gold
export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const tierParam = (searchParams.get('tier') || 'Base').trim();
  const mult = tierMult(tierParam);

  if (!userId) return NextResponse.json<Err>({ ok: false, error: 'missing_userId' }, { status: 400 });

  // Buyer (referee)
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

  // Idempotency: only once for first purchase per buyer
  const sourceId = `first_purchase:${refereeId}`;

  const paid: PaidItem[] = [];
  async function pay(level: number, toUserId: string, baseUe: number) {
    const amountUe = Math.round(baseUe * mult);
    await creditEcho(prisma, {
      userId: toUserId,
      amount: amountUe,               // micro-echo
      kind: 'referral',
      action: `nft.first_purchase.L${level}`,
      sourceId,                       // de-dupe
      refUserId: refereeId,           // who triggered
      meta: { tier: tierParam, mult, bucket: 'base' },
      dedupeKey: `fp:L${level}:${toUserId}:${sourceId}`,
    });
    paid.push({ level, userId: toUserId, amountUe });
  }

  if (l1) await pay(1, l1, BASE_L1_UECHO);
  if (l2) await pay(2, l2, BASE_L2_UECHO);
  if (l3) await pay(3, l3, BASE_L3_UECHO);

  return NextResponse.json<Ok>({ ok: true, userId: refereeId, tier: tierParam, paid });
}
