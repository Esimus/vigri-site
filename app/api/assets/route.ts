// app/api/assets/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCookie } from '@/lib/cookies';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SOLANA_RPC_URL } from '@/lib/config';

const COOKIE = 'vigri_assets';

// Base prices (EUR). SOL is fetched dynamically.
const PRICES_BASE = {
  VIGRI: 0.0008,
  SOL: 0,
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
  amount: number; // positive = received / negative = spent
  unitPriceSol: number;
  txSignature?: string;
};

type MintEventRecord = {
  id: string;
  tierId: number;
  wallet: string | null;
  txSignature: string | null;
  network: string | null;
  paidSol: number | null;
  designChoice: number | null;
  withPhysical: boolean | null;
  quantity: number | null;
  createdAt: Date;
};

type State = {
  balances: Record<string, number>;
  history: HistoryItem[];
};

type AssetsCookieState = State;

type NftPortfolioItem = {
  tierId: string;
  label: string;
  count: number;
  paidSol: number;
  currentPriceSol: number;
  currentValueSol: number;
};

type TierAgg = { count: number; paidSol: number };

// mainnet-only
type Cluster = 'mainnet';
const NETWORK: Cluster = 'mainnet';

// NFT tier metadata for labels/keys
const NFT_TIERS: Record<number, { key: string; label: string }> = {
  0: { key: 'tree_steel', label: 'Tree / Steel' },
  1: { key: 'bronze', label: 'Bronze NFT' },
  2: { key: 'silver', label: 'Silver NFT' },
  3: { key: 'gold', label: 'Gold NFT' },
  4: { key: 'platinum', label: 'Platinum NFT' },
  5: { key: 'ws20', label: 'WS 20' },
};

function defaultState(): State {
  return {
    balances: {
      VIGRI: 125_000,
      SOL: 0,
      USDC: 0,
    },
    history: [],
  };
}

async function readState(): Promise<State> {
  const raw = await getCookie(COOKIE);
  if (!raw) return defaultState();

  try {
    return JSON.parse(raw) as AssetsCookieState;
  } catch {
    return defaultState();
  }
}

function positionsOf(s: State, prices: Record<string, number>) {
  const positions = Object.keys(s.balances)
    .map((sym) => {
      const amount = s.balances[sym] || 0;

      // noUncheckedIndexedAccess => use ?? 0
      const price = prices[sym] ?? 0;

      return {
        symbol: sym,
        name: NAMES[sym] ?? sym,
        amount,
        priceEUR: price,
        valueEUR: +(amount * price).toFixed(2),
      };
    })
    .filter((p) => p.amount > 0);

  const totalValueEUR = +positions.reduce((a, p) => a + p.valueEUR, 0).toFixed(2);

  return { positions, totalValueEUR };
}

// ---- SOL/EUR (CoinGecko) ----

type SolEurCache = { value: number; ts: number };
let solEurCache: SolEurCache | null = null;

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function parseCoinGeckoSolEur(data: unknown): number | null {
  if (!isRecord(data)) return null;
  const solana = data['solana'];
  if (!isRecord(solana)) return null;
  const eur = solana['eur'];
  if (typeof eur !== 'number') return null;
  if (!Number.isFinite(eur) || eur <= 0) return null;
  return eur;
}

async function fetchSolEurFromCoinGecko(): Promise<number> {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=eur';
  const res = await fetch(url, {
    cache: 'no-store',
    headers: { accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`CoinGecko HTTP ${res.status}`);
  }

  const data: unknown = await res.json();
  const eur = parseCoinGeckoSolEur(data);
  if (eur === null) {
    throw new Error('CoinGecko response missing solana.eur');
  }
  return eur;
}

async function getSolEurCached(ttlMs = 120_000): Promise<number> {
  const now = Date.now();
  if (solEurCache && now - solEurCache.ts < ttlMs) {
    return solEurCache.value;
  }

  try {
    const value = await fetchSolEurFromCoinGecko();
    solEurCache = { value, ts: now };
    return value;
  } catch (e) {
    if (solEurCache) return solEurCache.value;
    console.error('Failed to fetch SOL/EUR from CoinGecko', e);
    return 0;
  }
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

async function loadPresaleTiers(
  base: string,
  cluster: Cluster,
): Promise<Map<number, PresaleTierApi>> {
  const map = new Map<number, PresaleTierApi>();

  try {
    const res = await fetch(
      `${base}/api/presale/global-config?cluster=${cluster}`,
      { cache: 'no-store' },
    );

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
        supplyTotal: isFiniteNumber(t.supplyTotal) ? t.supplyTotal : undefined,
        supplyMinted: isFiniteNumber(t.supplyMinted) ? t.supplyMinted : undefined,
      });
    }
  } catch {
    return map;
  }

  return map;
}

// ---- Handler ----

export async function GET(req: NextRequest) {
  const session = await getCookie('vigri_session');
  if (!session) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const url = new URL(req.url);
  const wallet = url.searchParams.get('wallet');

  // mainnet-only: reject any other network value if sent
  const networkParam = (url.searchParams.get('network') ?? '').trim().toLowerCase();
  if (networkParam && networkParam !== 'mainnet' && networkParam !== 'mainnet-beta') {
    return NextResponse.json({ ok: false, error: 'Network is mainnet-only' }, { status: 400 });
  }

  const s = await readState();

  if (wallet) {
    try {
      const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
      const pubkey = new PublicKey(wallet);
      const balanceLamports = await connection.getBalance(pubkey);
      s.balances.SOL = balanceLamports / LAMPORTS_PER_SOL;
    } catch (e) {
      console.error('Failed to load SOL balance', e);
      s.balances.SOL = 0;
    }
  } else {
    s.balances.SOL = 0;
  }

  const solEur = await getSolEurCached();
  const prices: Record<string, number> = { ...PRICES_BASE, SOL: solEur };

  const { positions, totalValueEUR } = positionsOf(s, prices);
  let history: HistoryItem[] = [...s.history];

  let nftPortfolio: NftPortfolioItem[] = [];

  if (wallet) {
    const events = await prisma.nftMintEvent.findMany({
      where: {
        wallet,
        network: NETWORK,
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

    const base = new URL(req.url).origin;
    const presaleTiers = await loadPresaleTiers(base, NETWORK);

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

    const historyFromMints: HistoryItem[] = events.map((ev: MintEventRecord) => {
      const meta = NFT_TIERS[ev.tierId];
      const presale = presaleTiers.get(ev.tierId);
      const priceSol = presale?.priceSol ?? 0;

      return {
        id: `nft:${ev.id}`,
        ts: ev.createdAt.getTime(),
        type: 'nft-mint',
        symbol: meta?.key ?? 'NFT',
        amount: ev.quantity ?? 1,
        unitPriceSol: priceSol,
        txSignature: ev.txSignature ?? undefined,
      };
    });

    history = history.concat(historyFromMints);
  }

  return NextResponse.json({
    ok: true,
    prices,
    positions,
    totalValueEUR,
    nftPortfolio,
    history: history.sort((a, b) => b.ts - a.ts),
  });
}
