// app/api/nft/summary/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';

// Types expected from /api/nft (upstream mock)
type ApiNftItem = {
  id: string;           // e.g. 'nft-gold'
  name: string;
  limited?: number;     // per-catalog supply (optional in upstream)
  minted?: number;      // per-user owned (local mock) — we will ignore this for "sold"
};

type ApiNftResponse = {
  ok: boolean;
  items: ApiNftItem[];
};

function isApiNftResponse(x: unknown): x is ApiNftResponse {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  if (o.ok !== true) return false;
  if (!Array.isArray(o.items)) return false;
  return o.items.every((it) => {
    if (!it || typeof it !== 'object') return false;
    const i = it as Record<string, unknown>;
    return typeof i.id === 'string' && typeof i.name === 'string';
  });
}

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
const ID_TO_TIER: Record<string, TierKey | undefined> = {
  'nft-bronze': 'Bronze',
  'nft-silver': 'Silver',
  'nft-gold': 'Gold',
  'nft-platinum': 'Platinum',
  'nft-tree-steel': 'Tree',   // if you split Tree/Steel as separate items later, adjust here
  'nft-ws-20': 'WS-20',
};

// If you ever need reverse mapping, you can add TIER_TO_ID as well.
// For now we build "sold" by tier and then project it back onto ids.

export async function GET(req: Request) {
  // 1) Call upstream /api/nft (we keep this to reuse item list & names)
  let upstream: Response;
  try {
    upstream = await fetch(new URL('/api/nft', req.url), {
      headers: { cookie: req.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });
  } catch (e) {
    return NextResponse.json({ ok: false, error: 'upstream_unreachable' }, { status: 502 });
  }

  const ct = upstream.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    return NextResponse.json({ ok: false, error: 'bad_upstream_type' }, { status: 502 });
  }

  let data: unknown;
  try {
    data = await upstream.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_upstream_json' }, { status: 502 });
  }

  if (!upstream.ok || !isApiNftResponse(data)) {
    return NextResponse.json({ ok: false, error: 'bad_upstream_payload' }, { status: 502 });
  }

  const rows: ApiNftItem[] = data.items;

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
      const tier = (r.meta && typeof r.meta === 'object'
        ? (r.meta as Record<string, unknown>)['tier']
        : null) as string | null;
      if (!tier) continue;
      const tk = tier as TierKey;
      soldByTier[tk] = (soldByTier[tk] ?? 0) + 1;
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

  return NextResponse.json({
    ok: true,
    items,
    totals: { total: totalAll, sold: soldAll, left: leftAll, pct: pctAll },
  });
}
