// app/api/assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getCookie } from '@/lib/cookies';

const prisma = new PrismaClient();

const COOKIE = 'vigri_assets';

// mock prices (EUR)
// TODO: replace with real rates (SOL/EUR, VIGRI price) later
const PRICES = {
  VIGRI: 0.0008,
  SOL: 195.2,
  USDC: 0.94,
} satisfies Record<'VIGRI' | 'SOL' | 'USDC', number>;

const NAMES: Record<string, string> = {
  VIGRI: 'Vigri Token',
  SOL: 'Solana',
  USDC: 'USD Coin',
};

type HistoryItem = {
  id: string;
  ts: number;
  type: string;
  symbol: string;
  amount: number;   // positive = received / negative = spent
  unitPriceSol: number;
  txSignature?: string;
};

type State = {
  balances: Record<string, number>;
  history: HistoryItem[];
};

type NftPortfolioItem = {
  tierId: string;
  label: string;
  count: number;
  paidSol: number;
  currentPriceSol: number;
  currentValueSol: number;
};

type TierAgg = { count: number; paidSol: number };

// NFT tier metadata for labels/keys
const NFT_TIERS: Record<number, { key: string; label: string }> = {
  0: { key: 'tree_steel', label: 'Tree / Steel' },
  1: { key: 'bronze', label: 'Bronze NFT' },
  2: { key: 'silver', label: 'Silver NFT' },
  3: { key: 'gold', label: 'Gold NFT' },
  4: { key: 'platinum', label: 'Platinum NFT' },
  5: { key: 'ws', label: 'WS 20' },
};

function defaultState(): State {
  return {
    balances: {
      VIGRI: 125_000,
      SOL: 2.35,
      USDC: 0,
    },
    history: [],
  };
}

function readState(): State {
  const raw = getCookie(COOKIE);
  if (!raw) return defaultState();
  try {
    const s = JSON.parse(raw) as State;
    if (!s?.balances) return defaultState();
    s.history ||= [];
    return s;
  } catch {
    return defaultState();
  }
}

function positionsOf(s: State) {
  const positions = Object.keys(s.balances)
    .map((sym) => {
      const amount = s.balances[sym] || 0;
      const price = sym in PRICES ? PRICES[sym as keyof typeof PRICES] : 0;
      return {
        symbol: sym,
        name: sym in NAMES ? NAMES[sym as keyof typeof NAMES] : sym,
        amount,
        priceEUR: price,
        valueEUR: +(amount * price).toFixed(2),
      };
    })
    .filter((p) => p.amount > 0);

  const totalValueEUR = +positions
    .reduce((a, p) => a + p.valueEUR, 0)
    .toFixed(2);

  return { positions, totalValueEUR };
}

// ---- Presale config bridge ----

type PresaleTierApi = {
  id: number;
  priceSol?: number;
  supplyTotal?: number;
  supplyMinted?: number;
};

type PresaleConfigApi = {
  exists: boolean;
  tiers?: PresaleTierApi[];
};

function isFiniteNumber(x: unknown): x is number {
  return typeof x === 'number' && Number.isFinite(x);
}

async function loadPresaleTiers(): Promise<Map<number, PresaleTierApi>> {
  const map = new Map<number, PresaleTierApi>();

  try {
    const base =
      typeof process.env.INTERNAL_API_BASE === 'string' &&
      process.env.INTERNAL_API_BASE.length > 0
        ? process.env.INTERNAL_API_BASE
        : 'http://127.0.0.1:3000';

    const res = await fetch(`${base}/api/presale/global-config`, {
      cache: 'no-store',
    });

    if (!res.ok) return map;

    const raw: PresaleConfigApi = await res.json();

    if (!raw || !raw.exists || !Array.isArray(raw.tiers)) {
      return map;
    }

    for (const t of raw.tiers) {
      if (!isFiniteNumber(t.id)) continue;
      map.set(t.id, {
        id: t.id,
        priceSol: isFiniteNumber(t.priceSol) ? t.priceSol : undefined,
        supplyTotal: isFiniteNumber(t.supplyTotal)
          ? t.supplyTotal
          : undefined,
        supplyMinted: isFiniteNumber(t.supplyMinted)
          ? t.supplyMinted
          : undefined,
      });
    }
  } catch {
    return map;
  }

  return map;
}

// ---- Handler ----

export async function GET(req: NextRequest) {
  // auth guard
  const session = getCookie('vigri_session');
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const url = new URL(req.url);
  const wallet = url.searchParams.get('wallet');
  const network = url.searchParams.get('network') ?? 'devnet';

  // token balances & history from cookies (mock for now)
  const s = readState();
  const { positions, totalValueEUR } = positionsOf(s);
  let history: HistoryItem[] = [...s.history];

  let nftPortfolio: NftPortfolioItem[] = [];

  if (wallet) {
    const events = await prisma.nftMintEvent.findMany({
      where: {
        wallet,
        network,
      },
    });

    const byTier = new Map<number, TierAgg>();

    for (const ev of events) {
      const prev = byTier.get(ev.tierId) ?? { count: 0, paidSol: 0 };
      byTier.set(ev.tierId, {
        count: prev.count + (ev.quantity || 1),
        paidSol: prev.paidSol + (ev.paidSol ?? 0),
      });
    }

    const presaleTiers = await loadPresaleTiers();

    nftPortfolio = Array.from(byTier.entries()).map(([tierNum, agg]) => {
      const meta = NFT_TIERS[tierNum];
      const presale = presaleTiers.get(tierNum);

      const currentPriceSol = presale?.priceSol ?? 0;
      const currentValueSol = currentPriceSol * agg.count;

      return {
        tierId: meta?.key ?? `tier_${tierNum}`,
        label: meta?.label ?? `Tier #${tierNum}`,
        count: agg.count,
        paidSol: agg.paidSol,
        currentPriceSol,
        currentValueSol,
      };
    });
      // --- History from NFT mints ---
      const historyFromMints: HistoryItem[] = events.map((ev) => {
      const meta = NFT_TIERS[ev.tierId];
      const presale = presaleTiers.get(ev.tierId);
      const priceSol = presale?.priceSol ?? 0;

      return {
        id: `nft:${ev.id}`,
        ts: ev.createdAt.getTime(),
        type: 'buy_nft',
        symbol: meta?.label ?? `Tier #${ev.tierId}`,
        amount: ev.quantity ?? 1,
        unitPriceSol: priceSol,
        txSignature: ev.txSignature,
      };
    });
    history = history.concat(historyFromMints);
  }

  return NextResponse.json({
    ok: true,
    prices: PRICES,
    positions,
    totalValueEUR,
    nftPortfolio,
    history: history.sort((a, b) => b.ts - a.ts),
  });
}
