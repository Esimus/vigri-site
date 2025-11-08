import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { creditEcho } from '@/lib/echo';

export const runtime = 'nodejs';

type TierKey = 'Base' | 'Tree' | 'Steel' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'WS-20';

function tierFromParam(p?: string | null): TierKey {
  switch ((p ?? '').toLowerCase()) {
    case 'tree': return 'Tree';
    case 'steel': return 'Steel';
    case 'bronze': return 'Bronze';
    case 'silver': return 'Silver';
    case 'gold': return 'Gold';
    case 'platinum': return 'Platinum';
    case 'ws-20': return 'WS-20';
    default: return 'Base';
  }
}

const TIER_FACTOR: Record<Exclude<TierKey, 'WS-20'>, number> = {
  Base: 1,
  Tree: 0.5,
  Steel: 0.5,
  Bronze: 1,
  Silver: 2,
  Gold: 5,
  Platinum: 15,
};

const LEVEL_MULT = { L1: 1.0, L2: 0.5, L3: 0.2 } as const;
type LevelKey = keyof typeof LEVEL_MULT;

function baseForSequence(prevPurchases: number): number {
  if (prevPurchases <= 0) return 0.4;   // first
  if (prevPurchases === 1) return 0.1;  // second
  return 0.05;                          // 3rd+
}

// Try to resolve user id from ?userId=... or /api/me
async function resolveUserId(req: Request): Promise<string | null> {
  const url = new URL(req.url);
  const override = url.searchParams.get('userId');
  if (override) return override;

  try {
    const r = await fetch(new URL('/api/me', req.url), {
      cache: 'no-store',
      headers: { cookie: req.headers.get('cookie') ?? '' },
    });
    const j = await r.json();
    if (r.ok && j?.ok && j?.user?.id) return String(j.user.id);
  } catch {}
  return null;
}

async function countPrevBuyerAwards(buyerId: string) {
  return prisma.echoLog.count({
    where: {
      kind: 'referral',
      action: { startsWith: 'referral.award.purchase' },
      refUserId: buyerId,
    },
  });
}

async function getInviterChain(buyerId: string) {
  const me = await prisma.user.findUnique({
    where: { id: buyerId },
    select: {
      referrerId: true,
      referrer: {
        select: {
          id: true,
          referrerId: true,
          referrer: { select: { id: true } },
        },
      },
    },
  });
  const L1 = me?.referrer?.id ?? null;
  const L2 = me?.referrer?.referrerId ?? null;
  const L3 = me?.referrer?.referrer?.id ?? null;
  return { L1, L2, L3 };
}

export async function POST(req: Request) {
  try {
    const buyerId = await resolveUserId(req);
    if (!buyerId) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const url = new URL(req.url);
    const tier = tierFromParam(url.searchParams.get('tier'));

    // WS-20 не продаётся → реферальных начислений не делаем
    if (tier === 'WS-20') return NextResponse.json({ ok: true, skipped: 'ws20' });

    const prev = await countPrevBuyerAwards(buyerId);
    const base = baseForSequence(prev);
    const tf = TIER_FACTOR[tier as Exclude<TierKey, 'WS-20'>] ?? 1;

    if (base <= 0) return NextResponse.json({ ok: true, skipped: 'zero_base' });

    const { L1, L2, L3 } = await getInviterChain(buyerId);
    if (!L1 && !L2 && !L3) return NextResponse.json({ ok: true, skipped: 'no_inviter' });

    const stamp = Date.now().toString();
    const src = `purchase:${buyerId}:${stamp}:${tier}`;

    async function award(toUserId: string, level: LevelKey) {
      const amount = base * tf * LEVEL_MULT[level];
      if (amount <= 0) return;
      await creditEcho(prisma, {
        userId: toUserId,
        kind: 'referral',
        action: `referral.award.purchase.${level.toLowerCase()}`,
        amount,
        sourceId: src,
        dedupeKey: `award:${buyerId}:${tier}:${level}:${stamp}`, // уникальный ключ на покупку
        refUserId: buyerId,
        meta: { tier, seq: prev + 1 },
      });
    }

    if (L1) await award(L1, 'L1');
    if (L2) await award(L2, 'L2');
    if (L3) await award(L3, 'L3');

    return NextResponse.json({ ok: true, buyerId, tier, seq: prev + 1, chain: { L1, L2, L3 } });
  } catch {
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
