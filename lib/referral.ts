// lib/referral.ts
import type { PrismaClient } from '@prisma/client';
import { creditEcho } from '@/lib/echo';

type Result =
  | { ok: true; boundTo: string; upline: { l1: string; l2: string | null; l3: string | null } }
  | { ok: false; error: 'self_ref' | 'inviter_not_found' | 'user_not_found' | 'already_bound' };

const L1_REGISTER = 3;
const L2_REGISTER = 1;
const L3_REGISTER = 1;

export async function bindReferrerOnceAndAward(
  prisma: PrismaClient,
  args: { userId: string; inviterId: string },
): Promise<Result> {
  const { userId, inviterId } = args;

  if (inviterId === userId) return { ok: false, error: 'self_ref' };

  const inviter = await prisma.user.findUnique({
    where: { id: inviterId },
    select: { id: true, referrerId: true },
  });
  if (!inviter) return { ok: false, error: 'inviter_not_found' };

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, referrerId: true },
  });
  if (!me) return { ok: false, error: 'user_not_found' };
  if (me.referrerId) return { ok: false, error: 'already_bound' };

  await prisma.user.update({
    where: { id: userId },
    data: { referrerId: inviter.id },
  });

  const l1: string = inviter.id;
  const l2: string | null = inviter.referrerId ?? null;

  const l2User = l2
    ? await prisma.user.findUnique({ where: { id: l2 }, select: { referrerId: true } })
    : null;
  const l3: string | null = l2User?.referrerId ?? null;

  try {
    await creditEcho(prisma, {
      userId: l1,
      kind: 'referral',
      action: 'referral.registered.l1',
      amount: L1_REGISTER,
      sourceId: userId,
      dedupeKey: `refbind:${userId}:l1`,
      refUserId: userId,
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
        refUserId: userId,
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
        refUserId: userId,
        meta: { invited: userId },
      });
    }
  } catch {
    // keep binding even if rewards fail
  }

  return { ok: true, boundTo: l1, upline: { l1, l2, l3 } };
}
