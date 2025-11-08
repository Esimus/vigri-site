// app/api/nft/route.ts
import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';

/** ---- Types ---- */
type Design = { id: string; label: string; rarity?: number };
type Nft = {
  id: string;
  name: string;
  eurPrice: number;
  vigriPrice: number;
  blurb: string;
  kycRequired?: boolean;
  limited?: number;
  vesting?: string | null;
  designs: Design[];
  // New fields
  tier: 'tree' | 'bronze' | 'silver' | 'gold' | 'platinum' | 'ws';
  discountPct: number;            // 0..0.50 (0 allowed for Tree/Steel)
  activationType: 'flex' | 'fixed' | 'none';
  fixedClaimPct?: number;         // for fixed (gold/platinum/tree)
  fixedDiscountPct?: number;      // for fixed
  /** i18n keys for compact feature list (rendered on the catalog grid) */
  summaryKeys?: string[];
};

// Allowed activation values saved per NFT id
type ActivationKind = 'claim100' | 'split50' | 'discount100' | 'fixed';

type State = {
  bag: Record<string, number>;
  designs?: Record<string, Record<string, number>>;
  upgrades?: Record<string, { rare: number; ultra: number }>;
  activation?: Record<string, ActivationKind>;
  lum?: boolean;
  expires?: Record<string, string>;
  minted?: Record<string, number>;
};

type RespItem = Nft & {
  ownedQty?: number;
  ownedDesigns?: Record<string, number>;
  invited?: boolean;
  userActivation?: ActivationKind | null;
  upgrades?: { rare: number; ultra: number };
  expiresAt?: string | null;
  minted?: number;
};

const TGE_PRICE_EUR = 0.0008;
const COOKIE = 'vigri_nfts';
const COOKIE_WS_INVITED = 'vigri_ws_invited';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** ---- Helpers ---- */
const eurToVigri = (eur: number) => Math.round(eur / TGE_PRICE_EUR);

function emptyState(): State {
  return { bag: {}, designs: {}, upgrades: {}, activation: {}, expires: {}, minted: {} };
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function readState(): State {
  const raw = getCookie(COOKIE);
  if (!raw) return emptyState();

  try {
    const parsedUnknown: unknown = JSON.parse(raw);
    if (!isObject(parsedUnknown)) return emptyState();

    if ('owned' in parsedUnknown && Array.isArray((parsedUnknown as { owned: unknown }).owned)) {
      const bag: Record<string, number> = {};
      for (const id of (parsedUnknown as { owned: string[] }).owned) {
        bag[id] = (bag[id] || 0) + 1;
      }
      return { ...emptyState(), bag };
    }

    const p = parsedUnknown as Partial<State>;
    return {
      bag: (p.bag ?? {}) as Record<string, number>,
      designs: (p.designs ?? {}) as Record<string, Record<string, number>>,
      upgrades: (p.upgrades ?? {}) as Record<string, { rare: number; ultra: number }>,
      activation: (p.activation ?? {}) as Record<string, ActivationKind>,
      lum: Boolean(p.lum),
      expires: (p.expires ?? {}) as Record<string, string>,
      minted: (p.minted ?? {}) as Record<string, number>,
    };
  } catch {
    return emptyState();
  }
}

function writeState(s: State) {
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

/** ---- Catalog ---- */
const CATALOG: Nft[] = [
  // Tree / Steel
  {
    id: 'nft-tree-steel',
    name: 'Tree / Steel',
    eurPrice: 50,
    vigriPrice: eurToVigri(50),
    blurb: 'Symbolic entry tier.',
    designs: [
      { id: 'tree-wood',  label: 'Wood'  },
      { id: 'tree-steel', label: 'Steel' },
    ],
    kycRequired: false,
    limited: 2000,
    vesting: null,
    tier: 'tree',
    discountPct: 0,
    activationType: 'fixed',
    summaryKeys: [
      'nft.summary.tree_0',
      'nft.summary.tree_1',
      'nft.summary.tree_2',
      'nft.summary.tree_3',
      'nft.summary.tree_4',
      'nft.summary.tree_5',
      'nft.summary.tree_6',
    ],
  },

  // Bronze
  {
    id: 'nft-bronze',
    name: 'Bronze NFT',
    eurPrice: 150,
    vigriPrice: eurToVigri(150),
    blurb: 'Entry tier (rare/ultra lottery)',
    designs: [
      { id: 'bronze-default', label: 'Default', rarity: 0.99 },
      { id: 'bronze-premium', label: 'Premium', rarity: 0.01 },
    ],
    kycRequired: false,
    limited: 1000,
    vesting: null,
    tier: 'bronze',
    discountPct: 0.25,
    activationType: 'none',
    summaryKeys: [
      'nft.summary.bronze_0',
      'nft.summary.bronze_1',
      'nft.summary.bronze_2',
      'nft.summary.bronze_3',
      'nft.summary.bronze_4',
      'nft.summary.bronze_5',
      'nft.summary.bronze_7',
      'nft.summary.bronze_8',
    ],
  },

  // Silver
  {
    id: 'nft-silver',
    name: 'Silver NFT',
    eurPrice: 1000,
    vigriPrice: eurToVigri(1000),
    blurb: 'Supporter tier (rare/ultra lottery)',
    designs: [
      { id: 'silver-default', label: 'Default', rarity: 0.99 },
      { id: 'silver-ultra', label: 'Ultra', rarity: 0.01 },
    ],
    kycRequired: true,
    limited: 200,
    vesting: 'Vesting',
    tier: 'silver',
    discountPct: 0.35,
    activationType: 'none',
    summaryKeys: [
      'nft.summary.silver_0',
      'nft.summary.silver_1',
      'nft.summary.silver_2',
      'nft.summary.silver_3',
      'nft.summary.silver_4',
      'nft.summary.silver_5',
      'nft.summary.silver_6',
      'nft.summary.silver_7',
      'nft.summary.silver_8',
      'nft.summary.silver_9',
      'nft.summary.silver_10',
    ],
  },

  // Gold
  {
    id: 'nft-gold',
    name: 'Gold NFT',
    eurPrice: 5000,
    vigriPrice: eurToVigri(5000),
    blurb: 'Premium tier',
    designs: [
      { id: 'gold-a', label: 'Design A' },
      { id: 'gold-b', label: 'Design B' },
    ],
    kycRequired: true,
    limited: 100,         // <-- added
    vesting: 'Vesting',
    tier: 'gold',
    discountPct: 0.40,
    activationType: 'none',
    fixedClaimPct: 0.30,
    fixedDiscountPct: 0.70,
    summaryKeys: [
      'nft.summary.gold_0',
      'nft.summary.gold_1',
      'nft.summary.gold_2',
      'nft.summary.gold_3',
      'nft.summary.gold_4',
      'nft.summary.gold_5',
      'nft.summary.gold_6',
      'nft.summary.gold_7',
      'nft.summary.gold_8',
    ],
  },

  // Platinum
  {
    id: 'nft-platinum',
    name: 'Platinum NFT',
    eurPrice: 10_000,
    vigriPrice: eurToVigri(10_000),
    blurb: 'Top tier',
    designs: [
      { id: 'platinum-a', label: 'Design A' },
      { id: 'platinum-b', label: 'Design B' },
    ],
    kycRequired: true,
    limited: 20,          // <-- added
    vesting: 'Vesting',
    tier: 'platinum',
    discountPct: 0.50,
    activationType: 'none',
    fixedClaimPct: 0.20,
    fixedDiscountPct: 0.80,
    summaryKeys: [
      'nft.summary.platinum_0',
      'nft.summary.platinum_1',
      'nft.summary.platinum_2',
      'nft.summary.platinum_3',
      'nft.summary.platinum_4',
      'nft.summary.platinum_5',
      'nft.summary.platinum_6',
      'nft.summary.platinum_7',
      'nft.summary.platinum_8',
    ],
  },

  // WS-20 — invite-only
  {
    id: 'nft-ws-20',
    name: 'WS 20',
    eurPrice: 0,
    vigriPrice: 0,
    blurb: 'Invite-only',
    designs: [{ id: 'ws-default', label: 'WS' }],
    kycRequired: true,
    limited: 20,
    vesting: null,
    tier: 'ws',
    discountPct: 0.50,
    activationType: 'none',
    summaryKeys: [
      'nft.summary.ws20_0',
      'nft.summary.ws20_1',
      'nft.summary.ws20_2',
      'nft.summary.ws20_3',
      'nft.summary.ws20_4',
      'nft.summary.ws20_5',
      'nft.summary.ws20_6',
      'nft.summary.ws20_7',
      'nft.summary.ws20_8',
    ],
  },
];

/** ---- Lottery ---- */
function drawUpgrade(tier: Nft['tier']): 'none' | 'rare' | 'ultra' {
  if (tier !== 'bronze' && tier !== 'silver') return 'none';
  if (Math.random() < 0.01) return 'ultra';
  if (Math.random() < 0.01) return 'rare';
  return 'none';
}

/** ---- GET ---- */
export async function GET() {
  const session = getCookie('vigri_session');
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const invited = getCookie(COOKIE_WS_INVITED) === '1';
  const s = readState();

  const items: RespItem[] = CATALOG.map((n) => ({
    ...n,
    invited: n.id === 'nft-ws-20' ? invited : undefined,
    ownedQty: s.bag[n.id] || 0,
    ownedDesigns: s.designs?.[n.id] || {},
    userActivation: s.activation?.[n.id] ?? null,
    upgrades: s.upgrades?.[n.id] || { rare: 0, ultra: 0 },
    expiresAt: s.expires?.[n.id] ?? null,
    minted: s.minted?.[n.id] || 0,
  }));

  return NextResponse.json({ ok: true, items });
}

/** ---- POST ---- */
type PostBody = {
  id?: string;
  qty?: number;
  designId?: string;
  activation?: ActivationKind;
  optInLumiros?: boolean;
};

export async function POST(req: Request) {
  const session = getCookie('vigri_session');
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  let bodyUnknown: unknown = {};
  try { bodyUnknown = await req.json(); } catch {}
  const body = bodyUnknown as PostBody;

  const id = String(body?.id || '');
  const qty = Math.max(1, Math.min(100, Math.floor(Number(body?.qty) || 1)));
  const designId = typeof body?.designId === 'string' ? body.designId : undefined;
  const activation: ActivationKind | undefined = body?.activation;
  const optInLumiros: boolean = Boolean(body?.optInLumiros);

  const item = CATALOG.find((x) => x.id === id);
  if (!item) return NextResponse.json({ ok: false, error: 'Unknown NFT' }, { status: 400 });

  const kyc = (getCookie('vigri_kyc') ?? 'none') as 'none' | 'pending' | 'approved' | 'rejected';
  if (item.kycRequired && kyc !== 'approved') {
    return NextResponse.json({ ok: false, error: 'KYC required' }, { status: 403 });
  }

  const s = readState();
  s.bag[id] = s.bag[id] || 0;
  s.minted = s.minted || {};
  s.minted[id] = s.minted[id] || 0;

  if (id === 'nft-ws-20') {
    const invited = getCookie(COOKIE_WS_INVITED) === '1';
    if (!invited) return NextResponse.json({ ok: false, error: 'Invite only' }, { status: 403 });
    if (s.bag[id] >= 1) return NextResponse.json({ ok: false, error: 'Already owned' }, { status: 409 });

    s.bag[id] = 1;
    s.minted[id] += 1;

    s.designs = s.designs || {};
    s.designs[id] = s.designs[id] || {};
    const def = item.designs[0]?.id ?? item.id;
    s.designs[id][def] = 1;

    s.activation = s.activation || {};
    s.activation[id] = 'fixed';
  } else {
    s.designs = s.designs || {};
    s.designs[id] = s.designs[id] || {};
    s.activation = s.activation || {};
    s.upgrades = s.upgrades || {};
    s.upgrades[id] = s.upgrades[id] || { rare: 0, ultra: 0 };

    const now = Date.now();
    s.expires = s.expires || {};
    const curExp = s.expires[id] ? new Date(s.expires[id]!).getTime() : 0;
    const nextExp = now + ONE_YEAR_MS;
    if (nextExp > curExp) s.expires[id] = new Date(nextExp).toISOString();

    if (item.tier === 'bronze' || item.tier === 'silver') {
      for (let i = 0; i < qty; i++) {
        const chosen =
          designId && item.designs.some((d) => d.id === designId)
            ? designId
            : pickByRarity(item.designs);
        s.designs[id][chosen] = (s.designs[id][chosen] || 0) + 1;

        const up = drawUpgrade(item.tier);
        if (up === 'rare') s.upgrades[id].rare += 1;
        else if (up === 'ultra') s.upgrades[id].ultra += 1;
      }
      if (activation === 'claim100' || activation === 'split50' || activation === 'discount100') {
        s.activation[id] = activation;
      } else if (!s.activation[id]) {
        s.activation[id] = 'discount100';
      }
    } else {
      const chosen =
        designId && item.designs.some((d) => d.id === designId)
          ? designId
          : (item.designs[0]?.id ?? item.id);
      s.designs[id][chosen] = (s.designs[id][chosen] || 0) + qty;
      s.activation[id] = 'fixed';
    }

    s.bag[id] += qty;
    s.minted[id] += qty;
  }

  if (optInLumiros) s.lum = true;

  const res = writeState(s);
  return NextResponse.json(
    {
      ok: true,
      id,
      qty: s.bag[id],
      ownedDesigns: s.designs?.[id] || {},
      userActivation: s.activation?.[id] || null,
      upgrades: s.upgrades?.[id] || { rare: 0, ultra: 0 },
      expiresAt: s.expires?.[id] || null,
      minted: s.minted?.[id] || 0,
    },
    { headers: res.headers }
  );
}

function pickByRarity(designs: Design[]): string {
  // safe first id (catalog guarantees non-empty, but keep a fallback)
  const firstId = designs[0]?.id ?? '';
  const withR = designs.filter((d) => typeof d.rarity === 'number');

  if (withR.length === 0) {
    return firstId;
  }

  const sum = withR.reduce((acc, d) => acc + (d.rarity ?? 0), 0);
  let r = Math.random() * (sum || 1);

  for (const d of withR) {
    r -= (d.rarity ?? 0);
    if (r <= 0) return d.id;
  }

  // length >= 1 here, TS can see the branch
  const last = withR[withR.length - 1]!;
  return last.id;
}
