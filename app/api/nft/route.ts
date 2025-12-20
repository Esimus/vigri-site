// app/api/nft/route.ts
import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { resolveAmlZone } from '@/constants/amlAnnexA';
import type {
  Session,
  User,
  UserProfile,
  KycStatus,
  CountryZone as DbCountryZone,
} from '@prisma/client';

export const runtime = 'nodejs';

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
  discountPct: number; // 0..0.50 (0 allowed for Tree/Steel)
  activationType: 'flex' | 'fixed' | 'none';
  fixedClaimPct?: number; // for fixed (gold/platinum/tree)
  fixedDiscountPct?: number; // for fixed
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
  kycRequiredEffective?: boolean;
  onchain?: {
    tierId: number;
    priceSol: number;
    supplyTotal: number;
    supplyMinted: number;
  };
};

function tierToOnchainId(tier: Nft['tier']): number | null {
  switch (tier) {
    case 'tree':
      return 0;
    case 'bronze':
      return 1;
    case 'silver':
      return 2;
    case 'gold':
      return 3;
    case 'platinum':
      return 4;
    case 'ws':
      return 5;
    default:
      return null;
  }
}

const TGE_PRICE_EUR = 0.0008;
const COOKIE = 'vigri_nfts';
const COOKIE_WS_INVITED = 'vigri_ws_invited';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** ---- AML helpers (DB-backed) ---- */
type KycState = KycStatus;
type CountryZone = DbCountryZone;

type DbSession = Pick<Session, 'userId' | 'idleExpires'>;
type DbUserWithProfile = User & { profile: UserProfile | null };

function zoneFromAml(code: string | null | undefined): CountryZone | null {
  const z = resolveAmlZone(code);
  if (z === 'unknown') return null;
  return z; // 'green' | 'grey' | 'red'
}

function worstZone(a: CountryZone | null, b: CountryZone | null): CountryZone | null {
  if (a === 'red' || b === 'red') return 'red';
  if (a === 'grey' || b === 'grey') return 'grey';
  if (a === 'green' || b === 'green') return 'green';
  return null;
}

// Worst-of-two: citizenship + residence (more restrictive wins)
function resolveCountryZoneFromProfile(
  citizenship: string | null | undefined,
  residence: string | null | undefined,
  tax: string | null | undefined,
): CountryZone | null {
  const z1 = zoneFromAml(citizenship);
  const z2 = zoneFromAml(residence);
  const z3 = zoneFromAml(tax);
  return worstZone(worstZone(z1, z2), z3);
}

async function loadKycContext(sessionId: string): Promise<{
  kycStatus: KycState;
  zone: CountryZone | null;
  isEe: boolean;
}> {

  const session = (await prisma.session
    .findUnique({
      where: { id: sessionId },
      select: { userId: true, idleExpires: true },
    })
    .catch(() => null)) as DbSession | null;

  if (!session) return { kycStatus: 'none', zone: null, isEe: false };

  const now = BigInt(Date.now());
  if (session.idleExpires <= now) return { kycStatus: 'none', zone: null, isEe: false };

  const user = (await prisma.user
    .findUnique({
      where: { id: session.userId },
      include: { profile: true },
    })
    .catch(() => null)) as DbUserWithProfile | null;

  if (!user) return { kycStatus: 'none', zone: null, isEe: false };
  
  const isEe =
    (user.profile?.countryCitizenship ?? '').toUpperCase() === 'EE' &&
    (user.profile?.countryResidence ?? '').toUpperCase() === 'EE' &&
    (user.profile?.countryTax ?? '').toUpperCase() === 'EE';

  const profileZone = resolveCountryZoneFromProfile(
    user.profile?.countryCitizenship ?? null,
    user.profile?.countryResidence ?? null,
    user.profile?.countryTax ?? null,
  );

  // While KYC is not started: follow live profile zone.
  // After KYC started: never allow profile edits to weaken AML (use worst of snapshot + live).
  const dbZone = (user.kycCountryZone ?? null) as CountryZone | null;
  const zone =
    user.kycStatus === 'none'
      ? profileZone
      : worstZone(dbZone, profileZone);

    return { kycStatus: user.kycStatus, zone, isEe };
}

/** ---- Helpers ---- */
const eurToVigri = (eur: number) => Math.round(eur / TGE_PRICE_EUR);

function emptyState(): State {
  return { bag: {}, designs: {}, upgrades: {}, activation: {}, expires: {}, minted: {} };
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

async function readState(): Promise<State> {
  const raw = await getCookie(COOKIE);
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
      { id: 'tree-wood', label: 'Wood' },
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
    limited: 100,
    vesting: 'Vesting',
    tier: 'gold',
    discountPct: 0.4,
    activationType: 'none',
    fixedClaimPct: 0.3,
    fixedDiscountPct: 0.7,
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
    limited: 20,
    vesting: 'Vesting',
    tier: 'platinum',
    discountPct: 0.5,
    activationType: 'none',
    fixedClaimPct: 0.2,
    fixedDiscountPct: 0.8,
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
    discountPct: 0.5,
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
  const invited = (await getCookie(COOKIE_WS_INVITED)) === '1';
  const s = await readState();

  const presaleTiers = await loadPresaleTiers();

  const items: RespItem[] = CATALOG.map((n) => {
    const tierId = tierToOnchainId(n.tier);
    const t = tierId !== null ? presaleTiers.get(tierId) : undefined;

    const base: RespItem = {
      ...n,
      invited: n.id === 'nft-ws-20' ? invited : undefined,
      ownedQty: s.bag[n.id] || 0,
      ownedDesigns: s.designs?.[n.id] || {},
      userActivation: s.activation?.[n.id] ?? null,
      upgrades: s.upgrades?.[n.id] || { rare: 0, ultra: 0 },
      expiresAt: s.expires?.[n.id] ?? null,
      minted: s.minted?.[n.id] || 0,
    };

    if (t && tierId !== null) {
      base.onchain = {
        tierId,
        priceSol: isFiniteNumber(t.priceSol) ? t.priceSol : 0,
        supplyTotal: isFiniteNumber(t.supplyTotal) ? t.supplyTotal : 0,
        supplyMinted: isFiniteNumber(t.supplyMinted) ? t.supplyMinted : 0,
      };
    }
    return base;
  });

  return NextResponse.json({ ok: true, items });
}

/** ---- POST ---- */
type PostBody = {
  id?: string;
  qty?: number;
  designId?: string;
  activation?: ActivationKind;
};

export async function POST(req: Request) {
  const sessionId = await getCookie(SESSION_COOKIE);
  if (!sessionId) return NextResponse.json({ ok: false }, { status: 401 });

  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {}
  const body = bodyUnknown as PostBody;

  const id = String(body?.id || '');
  const qty = Math.max(1, Math.min(100, Math.floor(Number(body?.qty) || 1)));
  const designId = typeof body?.designId === 'string' ? body.designId : undefined;
  const activation: ActivationKind | undefined = body?.activation;

  const item = CATALOG.find((x) => x.id === id);
  if (!item) return NextResponse.json({ ok: false, error: 'Unknown NFT' }, { status: 400 });

  // ---- AML / KYC enforcement (DB-backed) ----
  const ctx = await loadKycContext(sessionId);

  // If we can't determine zone (empty profile / legacy data) => block
  if (!ctx.zone) {
    return NextResponse.json({ ok: false, error: 'KYC country missing' }, { status: 403 });
  }

  if (ctx.zone === 'red') {
    return NextResponse.json({ ok: false, error: 'Country blocked' }, { status: 403 });
  }

  // grey => always require approved KYC (even for Tree/Bronze)
  let effectiveKycRequired = Boolean(item.kycRequired) || ctx.zone === 'grey';

  // Estonia exception: if overall zone is green and any of 3 countries is EE, Silver is allowed without KYC
  if (item.id === 'nft-silver' && ctx.zone === 'green' && ctx.isEe) {
    effectiveKycRequired = false;
  }

  if (effectiveKycRequired && ctx.kycStatus !== 'approved') {
    return NextResponse.json({ ok: false, error: 'KYC required' }, { status: 403 });
  }

  const s = await readState();
  s.bag[id] = s.bag[id] || 0;
  s.minted = s.minted || {};
  s.minted[id] = s.minted[id] || 0;

  if (id === 'nft-ws-20') {
    const invited = (await getCookie(COOKIE_WS_INVITED)) === '1';
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
    // Internal server-to-server call: always hit the Node app directly,
    // bypassing nginx/basic auth on the public domain.
    const base =
      typeof process.env.INTERNAL_API_BASE === 'string' && process.env.INTERNAL_API_BASE.length > 0
        ? process.env.INTERNAL_API_BASE
        : 'http://127.0.0.1:3000';

    const res = await fetch(`${base}/api/presale/global-config`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      return map;
    }

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
    // fall back to empty map – frontend will still work with EUR-only data
    return map;
  }

  return map;
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
