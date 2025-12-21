// app/api/nft/discount/route.ts
import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';

const COOKIE = 'vigri_nft_discount';

type DiscountState = {
  // percent in [0..100]
  percent: number;
  // unix ms when updated
  ts?: number;
};

function defaultState(): DiscountState {
  return { percent: 0 };
}

async function readState(): Promise<DiscountState> {
  const raw = await getCookie(COOKIE);
  if (!raw) return defaultState();

  try {
    const parsed = JSON.parse(raw) as Partial<DiscountState>;
    const pct = Number(parsed.percent);
    return {
      percent: Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : 0,
      ts: typeof parsed.ts === 'number' ? parsed.ts : undefined,
    };
  } catch {
    return defaultState();
  }
}

function writeState(s: DiscountState) {
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

// Return current discount percent
export async function GET() {
  const s = await readState();
  return NextResponse.json({ ok: true, percent: s.percent, ts: s.ts });
}

// Update discount percent (expects JSON: { percent: number })
export async function POST(req: Request) {
  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {
    // ignore malformed JSON
  }

  const pct = Number((bodyUnknown as { percent?: number }).percent);
  const next = Number.isFinite(pct) && pct >= 0 && pct <= 100 ? pct : 0;

  const s: DiscountState = { percent: next, ts: Date.now() };
  const res = writeState(s);

  return NextResponse.json(
    { ok: true, percent: s.percent, ts: s.ts },
    { headers: res.headers }
  );
}
