// app/api/nft/claim/route.ts
import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';
import { prisma } from '@/lib/prisma';
import { creditEcho } from '@/lib/echo';
import { Prisma } from '@prisma/client';

export const runtime = 'nodejs';

const COOKIE = 'vigri_nft_claim';

type ClaimState = { claimed: boolean; ts?: number };

type AwardRules = {
  version?: number;
  echo_unit_eur?: number;
  purchase?: {
    buyer_pct?: number;
    inviter_pct?: number;
    reserve_income_pct?: number;
    min_eur?: number;
    round?: 'floor2' | 'round2' | 'ceil2';
    tier_mult?: Record<string, number>;
  };
  kyc?: { bonus?: number; once_per_user?: boolean; inviter_l1?: number };
  caps?: { buyer_daily_max?: number; inviter_daily_max?: number };
  [k: string]: unknown;
};

function isObj(v: unknown): v is Record<string, unknown> { return !!v && typeof v === 'object'; }
function hasDefault<T>(m: unknown): m is { default: T } { return isObj(m) && 'default' in m; }
function num(v: unknown, d: number): number { return typeof v === 'number' && isFinite(v) ? v : d; }

function defaultState(): ClaimState { return { claimed: false }; }

function readState(): ClaimState {
  const raw = getCookie(COOKIE);
  if (!raw) return defaultState();
  try {
    const p = JSON.parse(raw) as Partial<ClaimState>;
    return { claimed: !!p.claimed, ts: typeof p.ts === 'number' ? p.ts : undefined };
  } catch { return defaultState(); }
}

function writeState(s: ClaimState) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE, value: JSON.stringify(s), path: '/',
    sameSite: 'lax', httpOnly: false, maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

function floor2(n: number): number { return Math.floor(n * 100) / 100; }

async function loadAwardRules(): Promise<AwardRules> {
  try {
    const mod = (await import('@/config/award_rules.json')) as unknown;
    return hasDefault<AwardRules>(mod) ? mod.default : (mod as AwardRules);
  } catch {
    return {};
  }
}

function tierMultiplier(tier: string, map?: Record<string, number>): number {
  if (tier === 'WS-20') return 0;
  if (!map) return 1;
  const m = map[tier];
  return typeof m === 'number' && isFinite(m) ? m : 1;
}

async function getRefChain(userId: string): Promise<{ L1: string | null; L2: string | null; L3: string | null }> {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { referrerId: true } });
  const L1 = user?.referrerId ?? null;
  let L2: string | null = null; let L3: string | null = null;
  if (L1) {
    const u2 = await prisma.user.findUnique({ where: { id: L1 }, select: { referrerId: true } });
    L2 = u2?.referrerId ?? null;
    if (L2) {
      const u3 = await prisma.user.findUnique({ where: { id: L2 }, select: { referrerId: true } });
      L3 = u3?.referrerId ?? null;
    }
  }
  return { L1, L2, L3 };
}

export async function GET() {
  const state = readState();
  return NextResponse.json({ ok: true, ...state });
}

export async function POST(req: Request) {
  const purchaseTs = Date.now();
  const state = readState();
  if (!state.claimed) { state.claimed = true; state.ts = purchaseTs; }
  const res = writeState(state);

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') ?? undefined;
    const tier = (searchParams.get('tier') ?? 'Base').trim();
    const eur = Number(searchParams.get('eur') ?? '0');
    const qtyRaw = Number(searchParams.get('qty') ?? '1');
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1;

    if (!userId || !Number.isFinite(eur) || eur <= 0) {
      const claimId = `cookie-claim:${userId ?? 'anon'}:${state.ts ?? purchaseTs}`;
      await creditEcho(prisma, {
        userId: userId ?? 'unknown',
        kind: 'purchase',
        action: 'nft.base',
        amount: 0.2,
        sourceId: claimId,
        dedupeKey: `claim:${claimId}:base`,
      });
      const tierBonus =
        tier === 'Gold' ? 0.1 :
        tier === 'Platinum' ? 0.2 :
        tier === 'WS-20' ? 0.0 :
        0;
      if (tierBonus > 0) {
        await creditEcho(prisma, {
          userId: userId ?? 'unknown',
          kind: 'purchase',
          action: 'nft.tier_bonus',
          amount: tierBonus,
          sourceId: claimId,
          dedupeKey: `claim:${claimId}:tier`,
          meta: { tier },
        });
      }
      return NextResponse.json({ ok: true, ...state }, { headers: res.headers });
    }

    const rules = await loadAwardRules();
    const p = isObj(rules.purchase) ? (rules.purchase as AwardRules['purchase']) : undefined;

    const buyerPct = num(p?.buyer_pct, 0.01);
    const inviterPct = num(p?.inviter_pct, 0.005);
    const mult = tierMultiplier(tier, p?.tier_mult);

    const buyerEcho = floor2(eur * buyerPct * mult);
    const inviterEcho = floor2(eur * inviterPct * mult);

    if (buyerEcho <= 0 && inviterEcho <= 0) {
      return NextResponse.json({ ok: true, ...state }, { headers: res.headers });
    }

    const claimId = `purchase:${userId}:${purchaseTs}:${tier}:${eur}`;

    if (buyerEcho > 0) {
      await creditEcho(prisma, {
        userId,
        kind: 'purchase',
        action: 'purchase.buyer',
        amount: buyerEcho,
        sourceId: claimId,
        dedupeKey: `purchase:${claimId}:buyer`,
        meta: { eur, tier },
      });
    }

    // record proportional sale for global summary
    await prisma.echoLog.create({
      data: {
      userId,
      kind: 'purchase',
      action: 'nft.proportional',
      amountUe: 0,                  
      sourceId: claimId,
      refUserId: null,
      meta: { tier, qty } as Prisma.InputJsonValue,
      dedupeKey: `summary:${claimId}:q${qty}`,
      },       
    });

    const chain = await getRefChain(userId);
    if (chain.L1 && inviterEcho > 0) {
      await creditEcho(prisma, {
        userId: chain.L1,
        kind: 'referral',
        action: 'referral.purchase.l1',
        amount: inviterEcho,
        sourceId: claimId,
        dedupeKey: `purchase:${claimId}:L1`,
        refUserId: userId,
        meta: { eur, tier },
      });
    }
  } catch {
    // swallow
  }

  return NextResponse.json({ ok: true, ...state }, { headers: res.headers });
}
