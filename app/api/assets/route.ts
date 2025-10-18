import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE = 'vigri_assets';

// мок-цены (EUR)
const PRICES: Record<string, number> = {
  VIGRI: 0.0008,
  SOL: 135.2,
  USDC: 0.94,
};
const NAMES: Record<string, string> = {
  VIGRI: 'Vigri Token',
  SOL: 'Solana',
  USDC: 'USD Coin',
};

type State = {
  balances: Record<string, number>;
  history: Array<{
    id: string;
    ts: number;
    type: 'buy_vigri' | 'reset' | 'airdrop' | 'claim' | 'discount';
    symbol: string;
    amount: number;   // + получено / - списано
    eurPrice: number; // цена за 1 ед. в EUR
  }>;
};

function defaultState(): State {
  return {
    balances: { VIGRI: 125_000, SOL: 2.35, USDC: 80 },
    history: [],
  };
}

function readState(): State {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return defaultState();
  try {
    const s = JSON.parse(raw) as State;
    if (!s.balances) return defaultState();
    s.history ||= [];
    return s;
  } catch {
    return defaultState();
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

function positionsOf(s: State) {
  const positions = Object.keys(s.balances).map((sym) => {
    const amount = s.balances[sym] || 0;
    const price = PRICES[sym] || 0;
    return {
      symbol: sym,
      name: NAMES[sym] || sym,
      amount,
      priceEUR: price,
      valueEUR: +(amount * price).toFixed(2),
    };
  });
  const totalValueEUR = +positions.reduce((a, p) => a + p.valueEUR, 0).toFixed(2);
  return { positions, totalValueEUR };
}

export async function GET() {
  const store = cookies();
  if (!store.get('vigri_session')?.value) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const s = readState();
  const { positions, totalValueEUR } = positionsOf(s);
  return NextResponse.json({
    ok: true,
    prices: PRICES,
    positions,
    totalValueEUR,
    history: [...s.history].sort((a, b) => b.ts - a.ts),
  });
}

export async function POST(req: Request) {
  const store = cookies();
  if (!store.get('vigri_session')?.value) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const body = await req.json().catch(() => ({} as any));
  const action = String(body?.action || '');

  let s = readState();

  if (action === 'reset') {
    s = defaultState();
    s.history.unshift({
      id: crypto.randomUUID(),
      ts: Date.now(),
      type: 'reset',
      symbol: '—',
      amount: 0,
      eurPrice: 0,
    });
    const res = writeState(s);
    const { positions, totalValueEUR } = positionsOf(s);
    return NextResponse.json(
      { ok: true, positions, totalValueEUR, history: s.history },
      { headers: res.headers }
    );
  }

  if (action === 'buy_vigri') {
    const amount = Math.max(1, Math.floor(Number(body?.amount) || 0));
    const priceV = PRICES.VIGRI;
    const costEUR = amount * priceV;
    const usdcUnit = PRICES.USDC;
    const needUSDC = costEUR / usdcUnit;

    if ((s.balances.USDC || 0) + 1e-9 < needUSDC) {
      return NextResponse.json(
        { ok: false, error: 'Not enough USDC' },
        { status: 400 }
      );
    }

    s.balances.USDC -= needUSDC;
    s.balances.VIGRI = (s.balances.VIGRI || 0) + amount;

    s.history.unshift({
      id: crypto.randomUUID(),
      ts: Date.now(),
      type: 'buy_vigri',
      symbol: 'VIGRI',
      amount,
      eurPrice: priceV,
    });

    const res = writeState(s);
    const { positions, totalValueEUR } = positionsOf(s);
    return NextResponse.json(
      { ok: true, positions, totalValueEUR, history: s.history },
      { headers: res.headers }
    );
  }

  return NextResponse.json({ ok: false, error: 'Unknown action' }, { status: 400 });
}
