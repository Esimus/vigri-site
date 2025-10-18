import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

const COOKIE = 'vigri_nfts';
const TGE_PRICE_EUR = 0.0008;

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

  const rightsRes = await fetch(new URL('/api/nft/rights', req.url), { cache: 'no-store' });
  const rights = await rightsRes.json();
  const me = rights.items?.find((x: any) => x.id === id);
  if (!me) return NextResponse.json({ ok: false, error: 'Unknown NFT' }, { status: 400 });

  const maxEur = Math.max(0, me.discountBudgetEur - me.discountUsedEur);
  const spend = Math.min(maxEur, Math.max(0, Number(eurAmount) || 0));
  if (spend <= 0) return NextResponse.json({ ok: false, error: 'Nothing to spend' }, { status: 400 });

  // Цена покупки с учётом скидки: TGE / (1 - discountPct)
  const unitPrice = TGE_PRICE_EUR * (1 - me.discountPctEffective);
  const vigriBought = spend / unitPrice;

  const state = readState();
  state.discountUsedEur = state.discountUsedEur || {};
  state.discountUsedEur[id] = (state.discountUsedEur[id] || 0) + spend;

  const res = NextResponse.json({ ok: true, id, eurSpent: spend, vigriBought, unitEur: unitPrice });
  res.cookies.set({ name: COOKIE, value: JSON.stringify(state), path: '/', sameSite: 'lax', httpOnly: false, maxAge: 60 * 60 * 24 * 30 });
  return res;
}
