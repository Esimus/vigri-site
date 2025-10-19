// app/api/nft/claim/route.ts
import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';

const COOKIE = 'vigri_nft_claim';

type ClaimState = {
  claimed: boolean;
  ts?: number; // unix ms when claimed
};

function defaultState(): ClaimState {
  return { claimed: false };
}

function readState(): ClaimState {
  const raw = getCookie(COOKIE);
  if (!raw) return defaultState();
  try {
    const parsed = JSON.parse(raw) as Partial<ClaimState>;
    return {
      claimed: Boolean(parsed.claimed),
      ts: typeof parsed.ts === 'number' ? parsed.ts : undefined,
    };
  } catch {
    return defaultState();
  }
}

function writeState(s: ClaimState) {
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

// Return current claim status
export async function GET() {
  const state = readState();
  return NextResponse.json({ ok: true, ...state });
}

// Mark as claimed (idempotent)
export async function POST() {
  const state = readState();
  if (!state.claimed) {
    state.claimed = true;
    state.ts = Date.now();
  }
  const res = writeState(state);
  return NextResponse.json({ ok: true, ...state }, { headers: res.headers });
}
