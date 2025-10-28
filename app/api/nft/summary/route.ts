// app/api/nft/summary/route.ts
import { NextResponse } from 'next/server';

// Types expected from /api/nft
type ApiNftItem = {
  id: string;
  name: string;
  limited?: number;
  minted?: number;
};

type ApiNftResponse = {
  ok: boolean;
  items: ApiNftItem[];
};

// Runtime type guard to validate upstream JSON
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

// Aggregate availability by consuming /api/nft (cookie-based mock).
// We do not duplicate the catalog here — we reuse /api/nft output for consistency.
export async function GET(req: Request) {
  // Step 1: call upstream and propagate cookies so minted/owned reflect current browser state
  let r: Response;
  try {
    r = await fetch(new URL('/api/nft', req.url), {
      headers: { cookie: req.headers.get('cookie') ?? '' },
      cache: 'no-store',
    });
  } catch (e) {
    console.error('GET /api/nft failed:', e);
    return NextResponse.json({ ok: false, error: 'upstream_unreachable' }, { status: 502 });
  }

  // Step 2: ensure we actually received JSON
  const ct = r.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    console.error('GET /api/nft: unexpected content-type:', ct);
    return NextResponse.json({ ok: false, error: 'bad_upstream_type' }, { status: 502 });
  }

  // Step 3: parse JSON with error handling
  let data: unknown;
  try {
    data = await r.json();
  } catch (e) {
    console.error('GET /api/nft: JSON parse error:', e);
    return NextResponse.json({ ok: false, error: 'bad_upstream_json' }, { status: 502 });
  }

  // Step 4: validate payload shape and HTTP status
  if (!r.ok || !isApiNftResponse(data)) {
    console.error('GET /api/nft: invalid payload or status', { status: r.status, body: data });
    return NextResponse.json({ ok: false, error: 'bad_upstream_payload' }, { status: 502 });
  }

  // At this point data is typed
  const rows: ApiNftItem[] = data.items;

  const items = rows.map((i) => {
    const total = Number.isFinite(i.limited as number) ? (i.limited ?? 0) : 0;
    const sold = Math.min(i.minted ?? 0, total);
    const left = Math.max(total - sold, 0);
    const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
    return { id: i.id, name: i.name, total, sold, left, pct };
  });

  // Totals: exclude WS if not needed in global stats
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
