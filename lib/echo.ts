// lib/echo.ts
import { PrismaClient, Prisma } from '@prisma/client';

// 1 echo = 1_000_000 micro-echo
const SCALE = 1_000_000;

// monthly cap for referral echo (in echo units)
const REF_MONTHLY_MAX_ECHO = 15000;

export type EchoKind = 'referral' | 'purchase' | 'activity' | 'bonus' | 'revoke';

export interface CreditEchoInput {
  userId: string;
  kind: EchoKind;
  action: string;
  amount: number;                 // in echo
  sourceId?: string | null;
  refUserId?: string | null;
  meta?: Record<string, unknown>;
  dedupeKey?: string | null;
}

function toUecho(n: number) {
  return Math.trunc(Math.round(n * SCALE));
}

export async function creditEcho(prisma: PrismaClient, input: CreditEchoInput) {
  const { userId, kind, action, amount, sourceId, refUserId, meta, dedupeKey } = input;
  if (!Number.isFinite(amount) || amount === 0) throw new Error('Invalid amount');

  let deltaUe = toUecho(amount);
  if (deltaUe === 0) throw new Error('Amount too small for current scale');

  return prisma.$transaction(async (tx) => {
    // idempotency check first
    if (dedupeKey) {
      const exists = await tx.echoLog.findUnique({ where: { dedupeKey }, select: { id: true } });
      if (exists) {
        return { ok: true, idempotent: true };
      }
    }

    // apply monthly cap only for positive referral earnings
    if (kind === 'referral' && deltaUe > 0) {
      const now = new Date();
      const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));

      const agg = await tx.echoLog.aggregate({
        where: {
          userId,
          kind: 'referral',
          createdAt: { gte: monthStart },
        },
        _sum: { amountUe: true },
      });

      const usedUe = agg._sum.amountUe ?? 0;
      const maxUe = REF_MONTHLY_MAX_ECHO * SCALE;
      const remainingUe = maxUe - usedUe;

      if (remainingUe <= 0) {
        // cap reached, nothing more to credit this month
        return { ok: true, idempotent: false, capped: true };
      }

      if (remainingUe < deltaUe) {
        deltaUe = remainingUe;
      }
    }

    await tx.echoLog.create({
      data: {
        userId,
        kind,
        action,
        amountUe: deltaUe,
        sourceId: sourceId ?? null,
        refUserId: refUserId ?? null,
        meta: (meta ?? undefined) as Prisma.InputJsonValue,
        dedupeKey: dedupeKey ?? null,
      },
    });

    const updated = await tx.user.update({
      where: { id: userId },
      data: {
        balanceEcho: { increment: deltaUe },
        participationScore: { increment: deltaUe },
      },
      select: { balanceEcho: true, participationScore: true },
    });

    return {
      ok: true,
      idempotent: false,
      balanceEchoUe: updated.balanceEcho,
      participationScoreUe: updated.participationScore,
      balanceEcho: updated.balanceEcho / SCALE,
      participationScore: updated.participationScore / SCALE,
    };
  });
}
