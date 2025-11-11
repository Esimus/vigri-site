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

type AwardRules = {
  kyc?: { bonus?: number; once_per_user?: boolean; inviter_l1?: number };
  [k: string]: unknown;
};

function isObj(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object'; }
function hasDefault<T>(m: unknown): m is { default: T } { return isObj(m) && 'default' in m; }
function num(v: unknown, d: number): number { return typeof v === 'number' && isFinite(v) ? v : d; }

async function loadAwardRules(): Promise<AwardRules> {
  try {
    const mod = (await import('@/config/award_rules.json')) as unknown;
    return hasDefault<AwardRules>(mod) ? mod.default : (mod as AwardRules);
  } catch {
    return {};
  }
}

/** POST /api/award/kyc?userId=... */
export async function POST(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = (searchParams.get('userId') || '').trim();
    if (!userId) {
      return NextResponse.json<Err>({ ok: false, error: 'missing_userId' }, { status: 400 });
    }

    const me = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, referrerId: true },
    });
    if (!me) {
      return NextResponse.json<Err>({ ok: false, error: 'user_not_found' }, { status: 404 });
    }
    if (!me.referrerId) {
      return NextResponse.json<Ok>({ ok: true, refereeId: me.id, inviterId: null, paidEcho: 0 });
    }

    const rules = await loadAwardRules();
    const kyc = isObj(rules.kyc) ? (rules.kyc as AwardRules['kyc']) : undefined;
    const amountEcho = num(kyc?.bonus, 5);

    const sourceId = `kyc:${me.id}`;
    const dedupeKey = `kyc:L1:${me.referrerId}:${me.id}`;

    await creditEcho(prisma, {
      userId: me.referrerId,
      kind: 'referral',
      action: 'referral.kyc.l1',
      amount: amountEcho,
      sourceId,
      dedupeKey,
      refUserId: me.id,
      meta: { reason: 'kyc' },
    });

    return NextResponse.json<Ok>({
      ok: true,
      refereeId: me.id,
      inviterId: me.referrerId,
      paidEcho: amountEcho,
    });
  } catch {
    return NextResponse.json<Err>({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
