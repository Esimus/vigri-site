// app/api/nft/summary/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;


// Types expected from /api/nft (upstream mock)
type ApiNftItem = {
  id: string;           // e.g. 'nft-gold'
  name: string;
  limited?: number;     // per-catalog supply (optional in upstream)
  minted?: number;      // per-user owned (local mock) — we will ignore this for "sold"
};

// Map list item id -> canonical TierKey used in echo logs
type TierKey = 'Base' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Tree' | 'Steel' | 'WS-20';

// Your canonical supplies per tier (global)
const SUPPLY_BY_TIER: Record<TierKey, number> = {
  Base: 0,
  Bronze: 1000,
  Silver: 200,
  Gold: 100,
  Platinum: 20,
  Tree: 2000,
  Steel: 2000,
  'WS-20': 20,
};

// Map upstream list ids to TierKey
const ID_TO_TIER: Record<string, TierKey> = {
  'nft-tree-steel': 'Tree',
  'nft-bronze': 'Bronze',
  'nft-silver': 'Silver',
  'nft-gold': 'Gold',
  'nft-platinum': 'Platinum',
  'nft-ws-20': 'WS-20',
};

// If you ever need reverse mapping, you can add TIER_TO_ID as well.
// For now we build "sold" by tier and then project it back onto ids.

export async function GET() {

    // 1) Build upstream rows locally (no HTTP self-call)
  const rows: ApiNftItem[] = [
    { id: 'nft-tree-steel', name: 'Tree / Steel', limited: SUPPLY_BY_TIER.Tree },
    { id: 'nft-bronze',     name: 'Bronze',       limited: SUPPLY_BY_TIER.Bronze },
    { id: 'nft-silver',     name: 'Silver',       limited: SUPPLY_BY_TIER.Silver },
    { id: 'nft-gold',       name: 'Gold',         limited: SUPPLY_BY_TIER.Gold },
    { id: 'nft-platinum',   name: 'Platinum',     limited: SUPPLY_BY_TIER.Platinum },
    { id: 'nft-ws-20',      name: 'WS-20',        limited: SUPPLY_BY_TIER['WS-20'] },
  ];

  // 2) Aggregate global SOLD per tier from EchoLog (purchase · nft.proportional)
  // Each proportional log = 1 unit sold for that tier (you can refine later if needed)
  let soldByTier: Partial<Record<TierKey, number>> = {};
  try {

  const logs = await prisma.echoLog.findMany({
  where: { kind: 'purchase', action: 'nft.proportional' },
  select: { meta: true },
  take: 100_000, // safety cap
});

  for (const r of logs) {
    // safe-narrow meta
    const meta = r.meta && typeof r.meta === 'object'
    ? (r.meta as { tier?: string; qty?: number })
    : null;

  const tierVal = meta?.tier ?? null;
  if (!tierVal) continue;
  const tk = tierVal as TierKey;

  const q = (typeof meta?.qty === 'number' && Number.isFinite(meta.qty))
    ? Math.max(1, Math.floor(meta.qty))
    : 1;

  soldByTier[tk] = (soldByTier[tk] ?? 0) + q;
      }
} catch {
  // On aggregation failure, default to zeros (do not break /summary)
  soldByTier = {};
}

  // 3) Build response per upstream item (id). We replace minted/limited with global {total,sold,left,pct}.
  const items = rows.map((i) => {
    const tk = ID_TO_TIER[i.id];
    const total = tk ? SUPPLY_BY_TIER[tk] ?? 0 : 0;
    const sold = tk ? Math.min(soldByTier[tk] ?? 0, total) : 0;
    const left = Math.max(total - sold, 0);
    const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
    return { id: i.id, name: i.name, total, sold, left, pct };
  });

  // 4) Totals: optionally exclude WS-20 from global stats if needed
  const itemsForTotal = items.filter((x) => x.id !== 'nft-ws-20');
  const totalAll = itemsForTotal.reduce((s, x) => s + x.total, 0);
  const soldAll = itemsForTotal.reduce((s, x) => s + x.sold, 0);
  const leftAll = Math.max(totalAll - soldAll, 0);
  const pctAll = totalAll > 0 ? Math.round((soldAll / totalAll) * 100) : 0;

  return NextResponse.json(
    { ok: true, items, totals: { total: totalAll, sold: soldAll, left: leftAll, pct: pctAll } },
    { headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' } }
  );
}
