// app/api/nft/claim/route.ts
import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';
import { prisma } from '@/lib/prisma';
import { creditEcho } from '@/lib/echo';

export const runtime = 'nodejs';

const COOKIE = 'vigri_nft_claim';

type ClaimState = {
  claimed: boolean;
  ts?: number; // unix ms when claimed
};

function defaultState(): ClaimState {
  return { claimed: false };
}

function readState(): ClaimState {
  const raw = getCookie(COOKIE);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw) as Partial<ClaimState>;
    return {
      claimed: Boolean(parsed.claimed),
      ts: typeof parsed.ts === 'number' ? parsed.ts : undefined,
    };
  } catch {
    return defaultState();
  }
}

function writeState(s: ClaimState) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE,
    value: JSON.stringify(s),
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

/**
 * Proportional reward settings
 * - Base rate per 1 EUR of purchase
 * - Soft boost for 1st / 2nd / subsequent purchases
 * - Referral shares for L1/L2/L3 (as fraction of buyer reward)
 *
 * All numbers are in "echo" (not micro).
 * Use creditEcho(... amount) with echo (not micro).
 */
const ECHO_PER_EUR = 0.001;               // 0.001 echo per € (example: 1000 uecho per €)
const BUY_BOOST = [2.0, 1.2, 1.0];        // 1st=×2.0, 2nd=×1.2, 3rd+=×1.0
const L_SHARES = { L1: 0.12, L2: 0.04, L3: 0.02 }; // 12% / 4% / 2% of buyer reward

// Optional tier fine-tuning (kept mild to avoid hard jumps)
const TIER_MULT: Record<string, number> = {
  Base: 1.0,
  Bronze: 1.0,
  Silver: 1.2,
  Gold: 1.6,
  Platinum: 2.5,
  Tree: 1.0,
  Steel: 1.0,
  'WS-20': 0.0, // never pay for WS-20 (not sold)
};

/**
 * Compute proportional echo for buyer
 */
function computeBuyerEcho(eur: number, purchaseIndex: number, tier: string): number {
  const base = eur * ECHO_PER_EUR;
  const boost = BUY_BOOST[Math.min(purchaseIndex - 1, BUY_BOOST.length - 1)] ?? 1.0;
  const tierMult = TIER_MULT[tier] ?? 1.0;
  return base * boost * tierMult;
}

/**
 * Get L1/L2/L3 chain for a user (by referrerId links).
 */
async function getRefChain(userId: string): Promise<{ L1: string | null; L2: string | null; L3: string | null }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { referrerId: true },
  });
  const L1 = user?.referrerId ?? null;

  let L2: string | null = null;
  let L3: string | null = null;

  if (L1) {
    const u2 = await prisma.user.findUnique({
      where: { id: L1 },
      select: { referrerId: true },
    });
    L2 = u2?.referrerId ?? null;

    if (L2) {
      const u3 = await prisma.user.findUnique({
        where: { id: L2 },
        select: { referrerId: true },
      });
      L3 = u3?.referrerId ?? null;
    }
  }

  return { L1, L2, L3 };
}

/**
 * Count prior purchases (for boost).
 * We count previous "purchase" logs of the buyer.
 */
async function getPurchaseIndex(buyerId: string): Promise<number> {
  const cnt = await prisma.echoLog.count({
    where: { userId: buyerId, kind: 'purchase' },
  });
  return cnt + 1; // next purchase index
}

// Return current claim status (cookie only)
export async function GET() {
  const state = readState();
  return NextResponse.json({ ok: true, ...state });
}

// Mark as claimed + (optionally) credit echo/referrals for a purchase
export async function POST(req: Request) {
  const state = readState();
  if (!state.claimed) {
    state.claimed = true;
    state.ts = Date.now();
  }

  // persist cookie state
  const res = writeState(state);

  // Optional proportional credit path
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') ?? undefined; // if omitted, proportional credit will be skipped
    const tier = searchParams.get('tier') ?? 'Base';
    const eurRaw = searchParams.get('eur') ?? '0';
    const eur = Number(eurRaw);

    // Keep old dev path if userId is missing or eur invalid → fallback to legacy fixed credit (for quick tests)
    if (!userId || !Number.isFinite(eur) || eur <= 0) {
      // legacy fixed demo credit (idempotent-ish by ts)
      // NOTE: we keep this block to not break existing dev flows,
      // but production UI should pass both userId & eur to be proportional.
      const claimId = `cookie-claim:${userId ?? 'anon'}:${state.ts ?? Date.now()}`;

      // base
      await creditEcho(prisma, {
        userId: userId ?? 'unknown',
        kind: 'purchase',
        action: 'nft.base',
        amount: 0.2,
        sourceId: claimId,
        dedupeKey: `claim:${claimId}:base`,
      });

      // tier bonus (if any)
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

    // --- Proportional flow (userId + eur provided) ---
    const purchaseIndex = await getPurchaseIndex(userId);
    const buyerEcho = computeBuyerEcho(eur, purchaseIndex, tier);

    const claimId = `purchase:${userId}:${state.ts ?? Date.now()}:${tier}:${eur}`;

    // 1) credit buyer
    await creditEcho(prisma, {
      userId,
      kind: 'purchase',
      action: 'nft.proportional',
      amount: buyerEcho,
      sourceId: claimId,
      dedupeKey: `prop:${claimId}:buyer`,
      meta: { eur, tier, purchaseIndex },
    });

    // 2) credit ref levels (if any)
    const chain = await getRefChain(userId);

    if (chain.L1) {
      await creditEcho(prisma, {
        userId: chain.L1,
        kind: 'referral',
        action: 'referral.purchase.l1',
        amount: buyerEcho * L_SHARES.L1,
        sourceId: claimId,
        dedupeKey: `prop:${claimId}:L1`,
        refUserId: userId,
        meta: { eur, tier, purchaseIndex },
      });
    }
    if (chain.L2) {
      await creditEcho(prisma, {
        userId: chain.L2,
        kind: 'referral',
        action: 'referral.purchase.l2',
        amount: buyerEcho * L_SHARES.L2,
        sourceId: claimId,
        dedupeKey: `prop:${claimId}:L2`,
        refUserId: userId,
        meta: { eur, tier, purchaseIndex },
      });
    }
    if (chain.L3) {
      await creditEcho(prisma, {
        userId: chain.L3,
        kind: 'referral',
        action: 'referral.purchase.l3',
        amount: buyerEcho * L_SHARES.L3,
        sourceId: claimId,
        dedupeKey: `prop:${claimId}:L3`,
        refUserId: userId,
        meta: { eur, tier, purchaseIndex },
      });
    }
  } catch {
    // never block claim flow on reward errors
  }

  return NextResponse.json({ ok: true, ...state }, { headers: res.headers });
}
