import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
  // Новое:
  tier: 'bronze'|'silver'|'gold'|'platinum'|'founding';
  discountPct: number;           // 0.25..0.50
  activationType: 'flex'|'fixed'|'none';
  fixedClaimPct?: number;        // для fixed (gold/platinum)
  fixedDiscountPct?: number;     // для fixed
};

type State = {
  bag: Record<string, number>;
  designs?: Record<string, Record<string, number>>;
  upgrades?: Record<string, { rare: number; ultra: number }>; // только для bronze/silver
  activation?: Record<string, 'claim100'|'split50'|'discount100'|'fixed'>;
  lum?: boolean;                 // opt-in в экосистему
  expires?: Record<string, string>; // ISO до какого дня действует Discount
};

type RespItem = Nft & {
  ownedQty?: number;
  ownedDesigns?: Record<string, number>;
  invited?: boolean;
  userActivation?: State['activation'][string] | null;
  upgrades?: { rare: number; ultra: number };
  expiresAt?: string | null;
};

const TGE_PRICE_EUR = 0.0008;
const COOKIE = 'vigri_nfts';
const COOKIE_FOUNDING_INVITED = 'vigri_founding_invited';
const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/** ---- Helpers ---- */
const eurToVigri = (eur: number) => Math.round(eur / TGE_PRICE_EUR);

function readState(): State {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return { bag: {}, designs: {}, upgrades: {}, activation: {}, expires: {} };
  try {
    const parsed = JSON.parse(raw) as State | { owned: string[] } | { bag: Record<string, number> };
    if ('bag' in parsed) {
      return {
        bag: parsed.bag || {},
        designs: parsed.designs || {},
        upgrades: parsed.upgrades || {},
        activation: parsed.activation || {},
        lum: parsed.lum || false,
        expires: parsed.expires || {},
      };
    }
    if ('owned' in parsed && Array.isArray((parsed as any).owned)) {
      const bag: Record<string, number> = {};
      for (const id of (parsed as any).owned) bag[id] = (bag[id] || 0) + 1;
      return { bag, designs: {}, upgrades: {}, activation: {}, expires: {} };
    }
    return { bag: {}, designs: {}, upgrades: {}, activation: {}, expires: {} };
  } catch {
    return { bag: {}, designs: {}, upgrades: {}, activation: {}, expires: {} };
  }
}
function writeState(s: State) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: COOKIE,
    value: JSON.stringify(s),
    path: '/', sameSite: 'lax', httpOnly: false, maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

/** ---- Catalog ---- */
const CATALOG: Nft[] = [
  {
    id: 'nft-bronze', name: 'Bronze NFT',
    eurPrice: 50, vigriPrice: eurToVigri(50),
    blurb: 'Entry tier (rare/ultra lottery)',
    designs: [{ id: 'bronze-default', label: 'Default', rarity: 0.99 }, { id: 'bronze-premium', label: 'Premium', rarity: 0.01 }],
    kycRequired: false, vesting: null,
    tier: 'bronze', discountPct: 0.25, activationType: 'flex',
  },
  {
    id: 'nft-silver', name: 'Silver NFT',
    eurPrice: 350, vigriPrice: eurToVigri(350),
    blurb: 'Supporter tier (rare/ultra lottery)',
    designs: [{ id: 'silver-default', label: 'Default', rarity: 0.99 }, { id: 'silver-ultra', label: 'Ultra', rarity: 0.01 }],
    kycRequired: false, vesting: null,
    tier: 'silver', discountPct: 0.35, activationType: 'flex',
  },
  {
    id: 'nft-gold', name: 'Gold NFT',
    eurPrice: 1000, vigriPrice: eurToVigri(1000),
    blurb: 'Premium tier',
    designs: [{ id: 'gold-a', label: 'Design A' }, { id: 'gold-b', label: 'Design B' }],
    kycRequired: true, vesting: '30% claim / 70% discount (vesting)',
    tier: 'gold', discountPct: 0.40, activationType: 'fixed', fixedClaimPct: 0.30, fixedDiscountPct: 0.70,
  },
  {
    id: 'nft-platinum', name: 'Platinum NFT',
    eurPrice: 10_000, vigriPrice: eurToVigri(10_000),
    blurb: 'Top tier',
    designs: [{ id: 'platinum-a', label: 'Design A' }, { id: 'platinum-b', label: 'Design B' }],
    kycRequired: true, vesting: '20% claim / 80% discount (vesting)',
    tier: 'platinum', discountPct: 0.50, activationType: 'fixed', fixedClaimPct: 0.20, fixedDiscountPct: 0.80,
  },
  {
    id: 'nft-founding-20', name: 'Founding-20',
    eurPrice: 0, vigriPrice: 0,
    blurb: 'Limited to 20; gift €500 at TGE + perpetual 50% discount up to €1000',
    designs: [{ id: 'founding-default', label: 'Founding' }],
    kycRequired: true, limited: 20, vesting: null,
    tier: 'founding', discountPct: 0.50, activationType: 'none',
  },
];

/** ---- Lottery: Bronze/Silver → Rare/Ultra upgrade to Gold/Platinum privileges ---- */
function drawUpgrade(tier: Nft['tier']): 'none'|'rare'|'ultra' {
  if (tier !== 'bronze' && tier !== 'silver') return 'none';
  // эксклюзивно: сначала ultra (1%), иначе rare (1%)
  if (Math.random() < 0.01) return 'ultra';
  if (Math.random() < 0.01) return 'rare';
  return 'none';
}

/** ---- GET ---- */
export async function GET() {
  const store = cookies();
  const session = store.get('vigri_session')?.value;
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const invited = store.get(COOKIE_FOUNDING_INVITED)?.value === '1';
  const s = readState();

  const items: RespItem[] = CATALOG.map(n => ({
    ...n,
    invited: n.id === 'nft-founding-20' ? invited : undefined,
    ownedQty: s.bag[n.id] || 0,
    ownedDesigns: s.designs?.[n.id] || {},
    userActivation: s.activation?.[n.id] ?? null,
    upgrades: s.upgrades?.[n.id] || { rare: 0, ultra: 0 },
    expiresAt: s.expires?.[n.id] ?? null,
  }));

  return NextResponse.json({ ok: true, items });
}

/** ---- POST (purchase / claim) ---- */
export async function POST(req: Request) {
  const store = cookies();
  const session = store.get('vigri_session')?.value;
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const id = String(body?.id || '');
  const qty = Math.max(1, Math.min(100, Math.floor(Number(body?.qty) || 1)));
  const designId = typeof body?.designId === 'string' ? String(body.designId) : undefined;
  const activation: State['activation'][string] | undefined = body?.activation;
  const optInLumiros: boolean = !!body?.optInLumiros;

  const item = CATALOG.find(x => x.id === id);
  if (!item) return NextResponse.json({ ok: false, error: 'Unknown NFT' }, { status: 400 });

  const kyc = store.get('vigri_kyc')?.value ?? 'none';
  if (item.kycRequired && kyc !== 'approved') {
    return NextResponse.json({ ok: false, error: 'KYC required' }, { status: 403 });
  }

  const s = readState();
  s.bag[id] = (s.bag[id] || 0);          // ensure

  // Founding — invite only, max 1
  if (id === 'nft-founding-20') {
    const invited = store.get(COOKIE_FOUNDING_INVITED)?.value === '1';
    if (!invited) return NextResponse.json({ ok: false, error: 'Invite only' }, { status: 403 });
    if (s.bag[id] >= 1) return NextResponse.json({ ok: false, error: 'Already owned' }, { status: 409 });

    s.bag[id] = 1;
    s.designs = s.designs || {};
    s.designs[id] = s.designs[id] || {};
    const def = item.designs[0].id; s.designs[id][def] = 1;
    s.activation = s.activation || {}; s.activation[id] = 'fixed'; // не требуется, но пометим
  } else {
    // обычные покупки
    s.designs = s.designs || {}; s.designs[id] = s.designs[id] || {};
    s.activation = s.activation || {};
    s.upgrades = s.upgrades || {}; s.upgrades[id] = s.upgrades[id] || { rare: 0, ultra: 0 };

    // истечение права Discount — 1 год с момента первой покупки данного типа
    const now = Date.now();
    s.expires = s.expires || {};
    const curExp = s.expires[id] ? new Date(s.expires[id]!).getTime() : 0;
    const nextExp = now + ONE_YEAR_MS;
    if (nextExp > curExp) s.expires[id] = new Date(nextExp).toISOString();

    if (item.tier === 'bronze' || item.tier === 'silver') {
      // лотерея редкости для КАЖДОГО купленного NFT
      for (let i = 0; i < qty; i++) {
        const chosen = (designId && item.designs.some(d => d.id === designId)) ? designId : pickByRarity(item.designs);
        s.designs[id][chosen] = (s.designs[id][chosen] || 0) + 1;

        const up = drawUpgrade(item.tier);
        if (up === 'rare') s.upgrades[id].rare += 1;
        else if (up === 'ultra') s.upgrades[id].ultra += 1;
      }
      // выбор активации — гибкий
      if (activation === 'claim100' || activation === 'split50' || activation === 'discount100') {
        s.activation[id] = activation;
      } else if (!s.activation[id]) {
        s.activation[id] = 'discount100'; // дефолт
      }
    } else {
      // gold/platinum — фиксированные доли
      const chosen = (designId && item.designs.some(d => d.id === designId)) ? designId : item.designs[0].id;
      s.designs[id][chosen] = (s.designs[id][chosen] || 0) + qty;
      s.activation[id] = 'fixed';
    }

    s.bag[id] += qty;
  }

  if (optInLumiros) s.lum = true;

  const res = writeState(s);
  return NextResponse.json({
    ok: true,
    id,
    qty: s.bag[id],
    ownedDesigns: s.designs?.[id] || {},
    userActivation: s.activation?.[id] || null,
    upgrades: s.upgrades?.[id] || { rare: 0, ultra: 0 },
    expiresAt: s.expires?.[id] || null,
  }, { headers: res.headers });
}

/** helpers */
function pickByRarity(designs: Design[]): string {
  const withR = designs.filter(d => typeof d.rarity === 'number');
  if (!withR.length) return designs[0].id;
  const sum = withR.reduce((s, d) => s + (d.rarity as number), 0);
  let r = Math.random() * (sum || 1);
  for (const d of withR) { r -= (d.rarity as number); if (r <= 0) return d.id; }
  return withR[withR.length - 1].id;
}
