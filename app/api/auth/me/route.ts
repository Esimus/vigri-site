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

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

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
  try { return JSON.parse(v) as T; } catch { return null; }
}

type Profile = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  language?: string;
  birthDate?: string;
  phone?: string;

  countryResidence?: string;
  countryTax?: string;

  addressStreet?: string;
  addressRegion?: string;
  addressCity?: string;
  addressPostal?: string;

  photo?: string; // dataURL (small, capped)
};

function clip(v: unknown, n = 200): string | undefined {
  return typeof v === 'string' ? v.slice(0, n) : undefined;
}
function clipLong(v: unknown, n = 200_000): string | undefined {
  return typeof v === 'string' ? v.slice(0, n) : undefined;
}

function sanitizeProfile(p: unknown): Profile {
  if (!isObject(p)) return {};
  const out: Profile = {};
  out.firstName        = clip(p.firstName);
  out.middleName       = clip(p.middleName);
  out.lastName         = clip(p.lastName);
  out.language         = clip(p.language, 5);
  out.birthDate        = clip(p.birthDate, 10);
  out.phone            = clip(p.phone, 64);

  out.countryResidence = clip(p.countryResidence, 2);
  out.countryTax       = clip(p.countryTax, 2);

  out.addressStreet    = clip(p.addressStreet);
  out.addressRegion    = clip(p.addressRegion);
  out.addressCity      = clip(p.addressCity);
  out.addressPostal    = clip(p.addressPostal, 20);

  // allow small dataURL avatar (client ensures size)
  out.photo            = clipLong(p.photo, 200_000);

  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as Profile;
}

// GET
export async function GET(req: Request) {
  const cookieHeader = req.headers.get('cookie');
  const sid = readCookie(cookieHeader, SESSION_COOKIE);

  const kycRaw = readCookie(cookieHeader, KYC_COOKIE);
  let kyc: boolean | 'none' | 'pending' | 'approved' = parseBool(kycRaw);
  if (kycRaw === 'pending' || kycRaw === 'approved' || kycRaw === 'none') kyc = kycRaw;

  const lum = parseJson(readCookie(cookieHeader, LUM_COOKIE));
  const profile = sanitizeProfile(parseJson<Profile>(readCookie(cookieHeader, PROFILE_COOKIE)));

  let user: { id: string; email: string } | null = null;
  if (sid) {
    const session = await prisma.session.findUnique({
      where: { id: sid }, select: { userId: true, idleExpires: true },
    }).catch(() => null);
    const now = BigInt(Date.now());
    if (session && session.idleExpires > now) {
      const u = await prisma.user.findUnique({
        where: { id: session.userId }, select: { id: true, email: true },
      });
      if (u) user = u;
    }
  }

  return NextResponse.json({ ok: true, signedIn: !!user, kyc, lum, user, profile });
}

// POST
export async function POST(req: Request) {
  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {
    // ignore malformed JSON
  }

  type MePostBody = { lum?: unknown; kyc?: unknown; profile?: unknown };
  const body: MePostBody = isObject(bodyUnknown) ? (bodyUnknown as MePostBody) : {};

  const hasLum = typeof body.lum !== 'undefined';
  const kycIncoming = body.kyc as unknown;
  const isKycValid = kycIncoming === 'none' || kycIncoming === 'pending' || kycIncoming === 'approved';

  const profileIncoming = sanitizeProfile(body.profile);
  const hasProfile = Object.keys(profileIncoming).length > 0;

  if (!hasLum && !isKycValid && !hasProfile) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });

  if (hasLum) {
    const serialized = typeof body.lum === 'string' ? body.lum : JSON.stringify(body.lum);
    res.cookies.set('vigri_nfts', serialized, { path: '/', sameSite: 'lax', secure: isProd, httpOnly: false, maxAge: THIRTY_DAYS });
  }

  if (isKycValid) {
    res.cookies.set('vigri_kyc', String(kycIncoming), { path: '/', sameSite: 'lax', secure: isProd, httpOnly: false, maxAge: THIRTY_DAYS });
  }

  if (hasProfile) {
    const currentRaw = readCookie(req.headers.get('cookie'), PROFILE_COOKIE);
    const current = sanitizeProfile(parseJson<Profile>(currentRaw));
    const merged = { ...current, ...profileIncoming };
    res.cookies.set(PROFILE_COOKIE, JSON.stringify(merged), { path: '/', sameSite: 'lax', secure: isProd, httpOnly: false, maxAge: THIRTY_DAYS });
  }

  return res;
}
