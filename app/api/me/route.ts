// app/api/auth/me/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';

const LUM_COOKIE = 'vigri_nfts';
const KYC_COOKIE = 'vigri_kyc';
const PROFILE_COOKIE = 'vigri_profile';
const isProd = process.env.NODE_ENV === 'production';
const THIRTY_DAYS = 60 * 60 * 24 * 30;

// simple cookie reader from header
function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.split('=');
    if (k && k.trim() === name) return decodeURIComponent(rest.join('=').trim());
  }
  return null;
}

function parseBool(v: string | null): boolean {
  if (!v) return false;
  const s = v.toLowerCase();
  return s === '1' || s === 'true' || s === 'yes';
}

function parseJson<T = unknown>(v: string | null): T | null {
  if (!v) return null;
  try {
    return JSON.parse(v) as T;
  } catch {
    return null;
  }
}

type Profile = {
  firstName?: string;
  lastName?: string;
  country?: string;
  language?: string;
  birthDate?: string; // ISO yyyy-mm-dd
  address?: string;
  phone?: string;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function sanitizeProfile(p: unknown): Profile {
  if (!isObject(p)) return {};
  const out: Profile = {};
  const put = (k: keyof Profile) => {
    if (typeof p[k] === 'string') out[k] = (p[k] as string).slice(0, 200);
  };
  put('firstName');
  put('lastName');
  put('country');
  put('language');
  put('birthDate');
  put('address');
  put('phone');
  return out;
}

// GET: return { ok, signedIn, kyc, lum, user, profile }
export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie');
  const sid = readCookie(cookieHeader, SESSION_COOKIE);

  // KYC: support both boolean and string statuses
  const kycRaw = readCookie(cookieHeader, KYC_COOKIE);
  let kyc: boolean | 'none' | 'pending' | 'approved' = parseBool(kycRaw);
  if (kycRaw === 'pending' || kycRaw === 'approved' || kycRaw === 'none') {
    kyc = kycRaw;
  }

  // LUM can be any JSON historically
  const lum = parseJson(readCookie(cookieHeader, LUM_COOKIE));

  // Profile stored as JSON in cookie
  const profile = sanitizeProfile(parseJson<Profile>(readCookie(cookieHeader, PROFILE_COOKIE)));

  let user: { id: string; email: string } | null = null;
  if (sid) {
    const session = await prisma.session
      .findUnique({
        where: { id: sid },
        select: { userId: true, idleExpires: true },
      })
      .catch(() => null);

    const now = BigInt(Date.now());
    if (session && session.idleExpires > now) {
      const u = await prisma.user.findUnique({
        where: { id: session.userId },
        select: { id: true, email: true },
      });
      if (u) user = u;
    }
  }

  return NextResponse.json({
    ok: true,
    signedIn: !!user,
    kyc,
    lum,
    user,
    profile,
  });
}

// POST: accept { lum } and/or { kyc } and/or { profile } and write cookies
export async function POST(req: Request) {
  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {
    // ignore malformed JSON
  }
  const body = isObject(bodyUnknown) ? bodyUnknown : {};

  // validate inputs
  const hasLum = Object.prototype.hasOwnProperty.call(body, 'lum');
  const kycIncoming = (body as { kyc?: unknown }).kyc;
  const isKycValid =
    kycIncoming === 'none' || kycIncoming === 'pending' || kycIncoming === 'approved';

  const profileIncoming = sanitizeProfile((body as { profile?: unknown }).profile);
  const hasProfile = Object.keys(profileIncoming).length > 0;

  if (!hasLum && !isKycValid && !hasProfile) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });

  // write LUM
  if (hasLum) {
    const lumVal = (body as { lum?: unknown }).lum;
    const serialized =
      typeof lumVal === 'string' ? lumVal : JSON.stringify(lumVal);
    res.cookies.set(LUM_COOKIE, serialized, {
      path: '/',
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
      maxAge: THIRTY_DAYS,
    });
  }

  // write KYC
  if (isKycValid) {
    res.cookies.set(KYC_COOKIE, String(kycIncoming), {
      path: '/',
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
      maxAge: THIRTY_DAYS,
    });
  }

  // write PROFILE (merge with existing)
  if (hasProfile) {
    const currentRaw = readCookie(req.headers.get('cookie'), PROFILE_COOKIE);
    const current = sanitizeProfile(parseJson<Profile>(currentRaw));
    const merged = { ...current, ...profileIncoming };
    res.cookies.set(PROFILE_COOKIE, JSON.stringify(merged), {
      path: '/',
      sameSite: 'lax',
      secure: isProd,
      httpOnly: false,
      maxAge: THIRTY_DAYS,
    });
  }

  return res;
}
