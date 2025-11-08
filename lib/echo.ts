// lib/echo.ts
import { PrismaClient, Prisma } from '@prisma/client';

// 1 echo = 1_000_000 micro-echo
const SCALE = 1_000_000;

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

  const deltaUe = toUecho(amount);
  if (deltaUe === 0) throw new Error('Amount too small for current scale');

  return prisma.$transaction(async (tx) => {
    if (dedupeKey) {
      const exists = await tx.echoLog.findUnique({ where: { dedupeKey }, select: { id: true } });
      if (exists) {
        return { ok: true, idempotent: true };
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
