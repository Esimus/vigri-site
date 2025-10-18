import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/** ДОЛЖНО совпадать с каталогом в /api/nft/route.ts (id, цены, fixed доли) */
const TGE_PRICE_EUR = 0.0008;
const COOKIE = 'vigri_nfts';

type Tier = 'bronze'|'silver'|'gold'|'platinum'|'founding';

type CatalogItem = {
  id: string;
  eurPrice: number;
  tier: Tier;
  discountPct: number;             // базовая скидка для Discount-части
  activationType: 'flex'|'fixed'|'none';
  fixedClaimPct?: number;
  fixedDiscountPct?: number;
  kycRequired?: boolean;
}
const CATALOG: CatalogItem[] = [
  { id: 'nft-bronze', eurPrice: 50,    tier: 'bronze',   discountPct: 0.25, activationType: 'flex' },
  { id: 'nft-silver', eurPrice: 350,   tier: 'silver',   discountPct: 0.35, activationType: 'flex' },
  { id: 'nft-gold',   eurPrice: 1000,  tier: 'gold',     discountPct: 0.40, activationType: 'fixed', fixedClaimPct: 0.30, fixedDiscountPct: 0.70, kycRequired: true },
  { id: 'nft-platinum', eurPrice: 10_000, tier: 'platinum', discountPct: 0.50, activationType: 'fixed', fixedClaimPct: 0.20, fixedDiscountPct: 0.80, kycRequired: true },
  { id: 'nft-founding-20', eurPrice: 0, tier: 'founding', discountPct: 0.50, activationType: 'none', kycRequired: true },
];

// Читаем состояние из куки /api/nft хранит его в JSON
type State = {
  bag?: Record<string, number>;
  activation?: Record<string, 'claim100'|'split50'|'discount100'|'fixed'>;
  upgrades?: Record<string, { rare: number; ultra: number }>;
  expires?: Record<string, string>; // ISO
  // новое:
  claimUsedEur?: Record<string, number>;
  discountUsedEur?: Record<string, number>;
};
function readState(): State {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return {};
  try { return JSON.parse(raw) as State; } catch { return {}; }
}

export async function GET() {
  const s = readState();

  const items = CATALOG.map(ci => {
    const qty = s.bag?.[ci.id] || 0;

    // Бюджеты в EUR по модели активации
    let claimPct = 0, discPctBudget = 0;
    if (ci.tier === 'founding') {
      // особые правила: Gift €500 + Discount €1000 без истечения
      const claimBudgetEur = 500;
      const discountBudgetEur = 1000;
      const claimUsed = s.claimUsedEur?.[ci.id] || 0;
      const discountUsed = s.discountUsedEur?.[ci.id] || 0;
      return {
        id: ci.id,
        tier: ci.tier,
        discountPctEffective: 0.50,
        claimBudgetEur, claimUsedEur: claimUsed,
        claimAvailVigri: Math.max(0, claimBudgetEur - claimUsed) / TGE_PRICE_EUR,
        discountBudgetEur, discountUsedEur: discountUsed,
        discountAvailEur: Math.max(0, discountBudgetEur - discountUsed),
        expiresAt: null as string | null,
      };
    }

    if (ci.activationType === 'flex') {
      const act = s.activation?.[ci.id] || 'discount100';
      if (act === 'claim100') { claimPct = 1; discPctBudget = 0; }
      else if (act === 'split50') { claimPct = 0.5; discPctBudget = 0.5; }
      else { claimPct = 0; discPctBudget = 1; }
    } else if (ci.activationType === 'fixed') {
      claimPct = ci.fixedClaimPct || 0;
      discPctBudget = ci.fixedDiscountPct || 0;
    }

    const totalEur = qty * ci.eurPrice;
    const claimBudgetEur = totalEur * claimPct;
    const discountBudgetEur = totalEur * discPctBudget;

    // Эффективная скидка с учётом редкости (Bronze/Silver → Rare/Ultra)
    let discountPctEffective = ci.discountPct;
    const up = s.upgrades?.[ci.id];
    if (up?.ultra && up.ultra > 0) discountPctEffective = 0.50;
    else if (up?.rare && up.rare > 0) discountPctEffective = 0.40;

    const claimUsed = s.claimUsedEur?.[ci.id] || 0;
    const discountUsed = s.discountUsedEur?.[ci.id] || 0;

    return {
      id: ci.id,
      tier: ci.tier,
      discountPctEffective,
      claimBudgetEur, claimUsedEur: claimUsed,
      claimAvailVigri: Math.max(0, claimBudgetEur - claimUsed) / TGE_PRICE_EUR,
      discountBudgetEur, discountUsedEur: discountUsed,
      discountAvailEur: Math.max(0, discountBudgetEur - discountUsed),
      expiresAt: s.expires?.[ci.id] || null,
    };
  });

  return NextResponse.json({ ok: true, items, tgePriceEur: TGE_PRICE_EUR });
}
