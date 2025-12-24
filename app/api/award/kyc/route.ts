// app/api/award/kyc/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { creditEcho } from '@/lib/echo';

export const runtime = 'nodejs';

type Err = { ok: false; error: string };
type Ok = {
  ok: true;
  refereeId: string;
  inviterId: string | null;
  paidEcho: number;
  deduped?: boolean;
};

/**
 * POST /api/award/kyc?userId=...
 *
 * Purpose:
 * - Distribute referral echo for the invited user’s KYC approval.
 * - The user’s own KYC echo is credited in /api/me (awardKycEcho),
 *   this endpoint handles only the referral part.
 * - dedupeKey values are kept in sync with /api/me to avoid duplicates:
 *   kyc.l1:${userId}:${l1}, kyc.l2:${userId}:${l2}, kyc.l3:${userId}:${l3}
 */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || '').trim();
    if (!userId) {
      return NextResponse.json<Err>(
        { ok: false, error: 'missing_userId' },
        { status: 400 },
      );
    }

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referrerId: true },
    });
    if (!me) {
      return NextResponse.json<Err>(
        { ok: false, error: 'user_not_found' },
        { status: 404 },
      );
    }

    // No referral chain → nothing to award
    if (!me.referrerId) {
      return NextResponse.json<Ok>({
        ok: true,
        refereeId: me.id,
        inviterId: null,
        paidEcho: 0,
      });
    }

    // Fixed values according to the current scheme:
    // KYC:
    // - self: 20 echo (credited in /api/me)
    // - L1:   5 echo
    // - L2:   1 echo
    // - L3:   1 echo
    const l1Amount = 5;
    const l2Amount = 1;
    const l3Amount = 1;

    // upline L1 → L2 → L3
    const inviterL1 = await prisma.user.findUnique({
      where: { id: me.referrerId },
      select: { id: true, referrerId: true },
    });

    const l1Id = inviterL1?.id ?? null;
    const l2Id = inviterL1?.referrerId ?? null;

    const inviterL2 = l2Id
      ? await prisma.user.findUnique({
          where: { id: l2Id },
          select: { referrerId: true },
        })
      : null;

    const l3Id = inviterL2?.referrerId ?? null;

    const sourceId = `kyc_approved:${me.id}`;
    const meta = { reason: 'kyc_approved' };

    let deduped = false;

    try {
      if (l1Id && l1Amount > 0) {
        const res = await creditEcho(prisma, {
          userId: l1Id,
          kind: 'referral',
          action: 'referral.kyc.l1',
          amount: l1Amount,
          sourceId,
          dedupeKey: `kyc.l1:${me.id}:${l1Id}`,
          refUserId: me.id,
          meta,
        });
        if (res.idempotent) deduped = true;
      }

      if (l2Id && l2Amount > 0) {
        await creditEcho(prisma, {
          userId: l2Id,
          kind: 'referral',
          action: 'referral.kyc.l2',
          amount: l2Amount,
          sourceId,
          dedupeKey: `kyc.l2:${me.id}:${l2Id}`,
          refUserId: me.id,
          meta,
        });
      }

      if (l3Id && l3Amount > 0) {
        await creditEcho(prisma, {
          userId: l3Id,
          kind: 'referral',
          action: 'referral.kyc.l3',
          amount: l3Amount,
          sourceId,
          dedupeKey: `kyc.l3:${me.id}:${l3Id}`,
          refUserId: me.id,
          meta,
        });
      }
    } catch {
     // If echo crediting fails, do not fail the whole request
    }

    return NextResponse.json<Ok>({
      ok: true,
      refereeId: me.id,
      inviterId: l1Id,
      paidEcho: l1Id ? l1Amount : 0,
      deduped,
    });
  } catch {
    return NextResponse.json<Err>(
      { ok: false, error: 'server_error' },
      { status: 500 },
    );
  }
}
