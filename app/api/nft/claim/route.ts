import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE = 'vigri_nfts';
const TGE_PRICE_EUR = 0.0008;

type State = {
  claimUsedEur?: Record<string, number>;
};

function readState(): any {
  const raw = cookies().get(COOKIE)?.value;
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

export async function POST(req: Request) {
  const { id, eurAmount } = await req.json().catch(() => ({ id: '', eurAmount: 0 }));
  if (!id) return NextResponse.json({ ok: false, error: 'Bad request' }, { status: 400 });

  const store = cookies();
  if (!store.get('vigri_session')?.value) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  // Узнаём доступно (запросом к rights)
  const rightsRes = await fetch(new URL('/api/nft/rights', req.url), { cache: 'no-store' });
  const rights = await rightsRes.json();
  const me = rights.items?.find((x: any) => x.id === id);
  if (!me) return NextResponse.json({ ok: false, error: 'Unknown NFT' }, { status: 400 });

  const maxEur = Math.max(0, me.claimBudgetEur - me.claimUsedEur);
  const spend = Math.min(maxEur, Math.max(0, Number(eurAmount) || maxEur));
  if (spend <= 0) return NextResponse.json({ ok: false, error: 'Nothing to claim' }, { status: 400 });

  const state = readState();
  state.claimUsedEur = state.claimUsedEur || {};
  state.claimUsedEur[id] = (state.claimUsedEur[id] || 0) + spend;

  const res = NextResponse.json({
    ok: true,
    id,
    eurClaimed: spend,
    vigriClaimed: spend / TGE_PRICE_EUR
  });
  res.cookies.set({ name: COOKIE, value: JSON.stringify(state), path: '/', sameSite: 'lax', httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  return res;
}
