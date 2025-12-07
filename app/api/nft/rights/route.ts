// app/api/nft/rights/route.ts
import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';

const COOKIE = 'vigri_nft_rights';

// Rights state is a simple map of flags, e.g. { resale: true, royalty: false }
type State = Record<string, boolean>;

function defaultState(): State {
  return {};
}

async function readState(): Promise<State> {
  const raw = await getCookie(COOKIE);
  if (!raw) return defaultState();

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object') {
      const obj = parsed as Record<string, unknown>;
      // coerce unknown values to boolean (truthy/falsy) safely
      const out: State = {};
      for (const k of Object.keys(obj)) {
        out[k] = Boolean(obj[k]);
      }
      return out;
    }
    return defaultState();
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

// Return current rights map
export async function GET() {
  const state = await readState();
  return NextResponse.json({ ok: true, state });
}

// Update rights map
// Accepts either:
// 1) { key: string, value: boolean }  -> sets a single flag
// 2) { state: Record<string, boolean> } -> merges multiple flags
type PostBody =
  | { key?: string; value?: boolean }
  | { state?: Record<string, boolean> };

export async function POST(req: Request) {
  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {
    // ignore malformed JSON
  }
  const body = bodyUnknown as PostBody;

  const current = await readState();

  if ('key' in body && typeof body?.key === 'string') {
    const k = body.key;
    const v = Boolean(body?.value);
    current[k] = v;
  } else if ('state' in body && body?.state && typeof body.state === 'object') {
    for (const [k, val] of Object.entries(body.state)) {
      current[k] = Boolean(val);
    }
  } else {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }

  const res = writeState(current);
  return NextResponse.json({ ok: true, state: current }, { headers: res.headers });
}
