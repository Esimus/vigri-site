// app/api/nft/claim/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';

function readCookieHeader(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';');
  const target = name.trim();
  for (const part of parts) {
    const [k, ...rest] = part.split('=');
    if (k && k.trim() === target) {
      return decodeURIComponent(rest.join('=').trim());
    }
  }
  return null;
}

async function resolveSessionUserId(req: NextRequest): Promise<string | null> {
  const cookieHeader = req.headers.get('cookie');
  const sid = readCookieHeader(cookieHeader, SESSION_COOKIE);
  if (!sid) return null;

  const session = await prisma.session
    .findUnique({
      where: { id: sid },
      select: { userId: true, idleExpires: true },
    })
    .catch(() => null);

  if (!session) return null;

  const now = BigInt(Date.now());
  if (session.idleExpires <= now) return null;

  return session.userId;
}

const COOKIE = 'vigri_nft_claim';

type ClaimState = { claimed: boolean; ts?: number };

function defaultState(): ClaimState {
  return { claimed: false };
}

async function readState(): Promise<ClaimState> {
  const raw = await getCookie(COOKIE);
  if (!raw) return defaultState();
  try {
    const p = JSON.parse(raw) as Partial<ClaimState>;
    return {
      claimed: !!p.claimed,
      ts: typeof p.ts === 'number' ? p.ts : undefined,
    };
  } catch {
    return defaultState();
  }
}

function writeState(s: ClaimState) {
  const res = NextResponse.json({ ok: true, ...s });
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

export async function GET() {
  const state = await readState();
  return NextResponse.json({ ok: true, ...state });
}

export async function POST(req: NextRequest) {
  const purchaseTs = Date.now();
  let state = await readState();
  if (!state.claimed) {
    state = { claimed: true, ts: purchaseTs };
  }

  // читаем userId/параметры, но больше НИЧЕГО не начисляем —
  // старую дробную логику purchase.buyer / referral.purchase.l1 отключили.
  try {
    const { searchParams } = new URL(req.url);
    const sessionUserId = await resolveSessionUserId(req);
    const userId = sessionUserId ?? searchParams.get('userId') ?? undefined;
    const _tier = (searchParams.get('tier') ?? 'Base').trim();
    const _eur = Number(searchParams.get('eur') ?? '0');

    void userId;
    void _tier;
    void _eur;
  } catch (e) {
    console.error('nft-claim parse error', e);
  }

  return writeState(state);
}
