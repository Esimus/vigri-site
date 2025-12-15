// app/api/me/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';
import { resolveAmlZone } from '@/constants/amlAnnexA';
import type {
  Session,
  User,
  UserProfile,
  KycStatus,
  CountryZone as DbCountryZone,
} from '@prisma/client';

export const runtime = 'nodejs';

type KycState = KycStatus;
type CountryZone = DbCountryZone;

type DbSession = Pick<Session, 'userId' | 'idleExpires'>;
type DbUserWithProfile = User & { profile: UserProfile | null };

type Profile = {
  firstName?: string;
  middleName?: string;
  lastName?: string;
  language?: string;
  birthDate?: string;
  phone?: string;
  isikukood?: string;

  countryResidence?: string;
  countryCitizenship?: string;
  countryTax?: string;

  addressStreet?: string;
  addressRegion?: string;
  addressCity?: string;
  addressPostal?: string;

  photo?: string; // dataURL (small, capped)
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function readCookie(header: string | null, name: string): string | null {
  if (!header) return null;
  const parts = header.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.split('=');
    if (k && k.trim() === name) {
      return decodeURIComponent(rest.join('=').trim());
    }
  }
  return null;
}

function clip(v: unknown, n = 200): string | undefined {
  return typeof v === 'string' ? v.slice(0, n) : undefined;
}
function clipLong(v: unknown, n = 200_000): string | undefined {
  return typeof v === 'string' ? v.slice(0, n) : undefined;
}

function sanitizeProfile(p: unknown): Profile {
  if (!isObject(p)) return {};
  const src = p as Profile;
  const out: Profile = {};

  out.firstName = clip(src.firstName);
  out.middleName = clip(src.middleName);
  out.lastName = clip(src.lastName);
  out.language = clip(src.language, 5);
  out.birthDate = clip(src.birthDate, 10);
  out.phone = clip(src.phone, 64);
  out.isikukood = clip(src.isikukood, 32);

  out.countryResidence = clip(src.countryResidence, 2);
  out.countryCitizenship = clip(src.countryCitizenship, 2);
  out.countryTax = clip(src.countryTax, 2);

  out.addressStreet = clip(src.addressStreet);
  out.addressRegion = clip(src.addressRegion);
  out.addressCity = clip(src.addressCity);
  out.addressPostal = clip(src.addressPostal, 20);

  // allow small dataURL avatar (client ensures size)
  out.photo = clipLong(src.photo, 200_000);

  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== undefined)) as Profile;
}

function mapProfileFromDb(p: UserProfile | null): Profile {
  if (!p) return {};

  return sanitizeProfile({
    firstName: p.firstName,
    middleName: p.middleName ?? undefined,
    lastName: p.lastName,
    birthDate: p.birthDate ? p.birthDate.toISOString().slice(0, 10) : undefined,
    phone: p.phone ?? undefined,
    isikukood: p.isikukood ?? undefined,

    countryResidence: p.countryResidence ?? undefined,
    countryCitizenship: p.countryCitizenship ?? undefined,
    countryTax: p.countryTax ?? undefined,

    addressStreet: p.addressStreet ?? undefined,
    addressRegion: p.addressRegion ?? undefined,
    addressCity: p.addressCity ?? undefined,
    addressPostal: p.addressPostal ?? undefined,
    language: p.language ?? undefined,
    photo: p.photo ?? undefined,
  });
}

function profileToDbData(p: Profile): Omit<UserProfile, 'userId' | 'createdAt' | 'updatedAt'> {
  let birthDate: Date | null = null;
  if (p.birthDate) {
    const d = new Date(p.birthDate);
    if (!Number.isNaN(d.getTime())) {
      birthDate = d;
    }
  }

  return {
    firstName: p.firstName ?? '',
    middleName: p.middleName ?? null,
    lastName: p.lastName ?? '',
    birthDate,
    phone: p.phone ?? null,
    isikukood:
      (p.countryResidence ?? '').toUpperCase() === 'EE' &&
      (p.countryCitizenship ?? '').toUpperCase() === 'EE' &&
      (p.countryTax ?? '').toUpperCase() === 'EE'
        ? (p.isikukood ?? null)
        : null,

    countryResidence: p.countryResidence ?? null,
    countryCitizenship: p.countryCitizenship ?? null,
    countryTax: p.countryTax ?? null,

    addressStreet: p.addressStreet ?? null,
    addressRegion: p.addressRegion ?? null,
    addressCity: p.addressCity ?? null,
    addressPostal: p.addressPostal ?? null,
    language: p.language ?? null,
    photo: p.photo ?? null,   
  };
}

function isProfileCompleted(p?: {
  firstName?: string | null;
  lastName?: string | null;
  birthDate?: Date | string | null;
  countryResidence?: string | null;
  countryCitizenship?: string | null;
  countryTax?: string | null;
  addressCity?: string | null;
  language?: string | null;
}) {
  if (!p) return false;
  return Boolean(
    p.firstName &&
      p.lastName &&
      p.birthDate &&
      p.countryResidence &&
      p.countryCitizenship &&
      p.countryTax &&
      p.addressCity &&
      p.language,
  );
}

function resolveCountryZone(country: string | null | undefined): CountryZone | null {
  const z = resolveAmlZone(country);
  if (z === 'unknown') return null;
  return z; // 'green' | 'grey' | 'red'
}

function worstZone(a: CountryZone | null, b: CountryZone | null): CountryZone | null {
  if (a === 'red' || b === 'red') return 'red';
  if (a === 'grey' || b === 'grey') return 'grey';
  if (a === 'green' || b === 'green') return 'green';
  return null;
}

function resolveZoneFromProfile(p: {
  countryResidence?: string | null;
  countryCitizenship?: string | null;
  countryTax?: string | null;
}): CountryZone | null {
  const zRes = resolveCountryZone(p.countryResidence ?? null);
  const zCit = resolveCountryZone(p.countryCitizenship ?? null);
  const zTax = resolveCountryZone(p.countryTax ?? null);
  return worstZone(worstZone(zRes, zCit), zTax);
}

// GET: everything from the database
export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const sid = readCookie(cookieHeader, SESSION_COOKIE);

    let userSummary: { id: string; email: string } | null = null;
    let profile: Profile = {};

    let kycStatus: KycState = 'none';
    let kycCountryZone: CountryZone | null = null;
    let profileCompleted = false;
    let countryBlocked = false;
    let canBuyLowTier = false;
    let canBuyHighTier = false;

    if (sid) {
      const session = (await prisma.session
        .findUnique({
          where: { id: sid },
          select: { userId: true, idleExpires: true },
        })
        .catch(() => null)) as DbSession | null;

      if (session) {
        const now = BigInt(Date.now());
        if (session.idleExpires > now) {
          const user = (await prisma.user
            .findUnique({
              where: { id: session.userId },
              include: { profile: true },
            })
            .catch(() => null)) as DbUserWithProfile | null;

          if (user) {
            userSummary = { id: user.id, email: user.email };
            profile = mapProfileFromDb(user.profile);

            kycStatus = user.kycStatus;

            const liveZone = resolveZoneFromProfile({
              countryResidence: profile.countryResidence ?? null,
              countryCitizenship: profile.countryCitizenship ?? null,
              countryTax: profile.countryTax ?? null,
            });

            // Snapshot must be used only after KYC has started.
            // Before KYC: follow live profile zone so UI + DB don't desync.
            const zone =
              user.kycStatus === 'none'
                ? liveZone
                : (user.kycCountryZone ?? liveZone);

            kycCountryZone = zone;

            profileCompleted = isProfileCompleted({
              firstName: profile.firstName ?? null,
              lastName: profile.lastName ?? null,
              birthDate: profile.birthDate ?? null,
              countryResidence: profile.countryResidence ?? null,
              countryCitizenship: profile.countryCitizenship ?? null,
              countryTax: profile.countryTax ?? null,
              addressCity: profile.addressCity ?? null,
              language: profile.language ?? null,
            });

            countryBlocked = zone === 'red';
            canBuyLowTier = profileCompleted && !countryBlocked;
            canBuyHighTier = canBuyLowTier && kycStatus === 'approved';
          }
        }
      }
    }

    return NextResponse.json({
      ok: true,
      signedIn: !!userSummary,
      user: userSummary,
      kyc: kycStatus, // legacy field for the current UI
      kycStatus,
      kycCountryZone,
      profileCompleted,
      countryBlocked,
      canBuyLowTier,
      canBuyHighTier,
      profile,
    });
  } catch (err) {
    console.error('/api/me error', err);
    return NextResponse.json(
      {
        ok: false,
        signedIn: false,
        error: 'internal_error',
      },
      { status: 200 },
    );
  }
}

// POST: profile -> UserProfile
export async function POST(req: Request) {
  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {
    // ignore malformed JSON
  }

  type MePostBody = { profile?: unknown };
  const body: MePostBody = isObject(bodyUnknown) ? (bodyUnknown as MePostBody) : {};

  const profileIncoming = sanitizeProfile(body.profile);
  const hasProfile = Object.keys(profileIncoming).length > 0;

  if (!hasProfile) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
  }

  const cookieHeader = req.headers.get('cookie');
  const res = NextResponse.json({ ok: true });

  let sessionUserId: string | null = null;
  if (cookieHeader) {
    const sid = readCookie(cookieHeader, SESSION_COOKIE);
    if (sid) {
      const session = (await prisma.session
        .findUnique({
          where: { id: sid },
          select: { userId: true, idleExpires: true },
        })
        .catch(() => null)) as DbSession | null;

      if (session) {
        const now = BigInt(Date.now());
        if (session.idleExpires > now) {
          sessionUserId = session.userId;
        }
      }
    }
  }

  if (sessionUserId) {
    const dbData = profileToDbData(profileIncoming);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: sessionUserId },
        include: { profile: true },
      });

      if (!user) return;

      const prev = user.profile;

      const prevCit = prev?.countryCitizenship ?? null;
      const prevRes = prev?.countryResidence ?? null;
      const prevTax = prev?.countryTax ?? null;

      const nextCit = dbData.countryCitizenship ?? null;
      const nextRes = dbData.countryResidence ?? null;
      const nextTax = dbData.countryTax ?? null;

      const countriesChanged =
        prevCit !== nextCit || prevRes !== nextRes || prevTax !== nextTax;

      const nextZone = resolveZoneFromProfile({
        countryCitizenship: nextCit,
        countryResidence: nextRes,
        countryTax: nextTax,
      });

      await tx.user.update({
        where: { id: sessionUserId },
        data: {
          // всегда держим в синхроне с анкетой
          kycCountryZone: nextZone,

          // анти-мошенничество: сменил страну после KYC → KYC заново
          ...(countriesChanged && user.kycStatus !== 'none' ? { kycStatus: 'none' as KycStatus } : {}),

          profile: {
            upsert: {
              create: dbData,
              update: dbData,
            },
          },
        },
      });
    });
  }
  return res;
}
