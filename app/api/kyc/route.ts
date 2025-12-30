// app/api/kyc/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCookie } from '@/lib/cookies';
import { SESSION_COOKIE } from '@/lib/session';
import { resolveAmlZone } from '@/constants/amlAnnexA';
import type { UserProfile, KycStatus, CountryZone as DbCountryZone } from '@prisma/client';

export const runtime = 'nodejs';

type DbSession = { userId: string; idleExpires: bigint };

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function getString(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null;
}
function getBool(v: unknown): boolean | null {
  return typeof v === 'boolean' ? v : null;
}
function getDate(v: unknown): Date | null {
  const s = getString(v);
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function resolveCountryZone(country: string | null | undefined): DbCountryZone | null {
  const c = typeof country === 'string' ? country.trim().toUpperCase() : '';
  const z = resolveAmlZone(c);
  if (z === 'unknown') return null;
  return z; // 'green' | 'grey' | 'red'
}

function worstZone(zones: Array<DbCountryZone | null>): DbCountryZone | null {
  let hasGreen = false;

  for (const z of zones) {
    if (z === 'red') return 'red';
    if (z === 'grey') return 'grey';
    if (z === 'green') hasGreen = true;
  }

  return hasGreen ? 'green' : null;
}

function isProfileCompleted(p: UserProfile | null): boolean {
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

async function requireSession(): Promise<{ userId: string } | null> {
  const sessionId = await getCookie(SESSION_COOKIE);
  if (!sessionId) return null;

  const session = (await prisma.session
    .findUnique({
      where: { id: sessionId },
      select: { userId: true, idleExpires: true },
    })
    .catch(() => null)) as DbSession | null;

  if (!session) return null;

  const now = BigInt(Date.now());
  if (session.idleExpires <= now) return null;

  return { userId: session.userId };
}

// GET: read current KYC status + stored KYC data (requires session)
export async function GET() {
  const s = await requireSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  const user = await prisma.user
    .findUnique({
      where: { id: s.userId },
      select: {
        kycStatus: true,
        kycData: {
          select: {
            pepDeclared: true,
            pepDetails: true,
            consent: true,
            passportNumber: true,
            passportCountry: true,
            passportIssuedAt: true,
            passportExpiresAt: true,
            passportIssuer: true,
            documentImage: true,
          },
        },
      },
    })
    .catch(() => null);

  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  return NextResponse.json({ ok: true, status: user.kycStatus, data: user.kycData ?? null });
}

// POST: user can only submit KYC -> set status to 'pending'
// Also snapshots kycCountryZone (if not approved) to avoid later profile country edits bypassing AML.
export async function POST(req: Request) {
  const s = await requireSession();
  if (!s) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {
    // ignore malformed JSON
  }

  const body = isObject(bodyUnknown) ? bodyUnknown : {};

  const pepDeclared = getBool(body.pepDeclared);
  const pepDetails = getString(body.pepDetails);
  const consent = getBool(body.consent);

  const passportNumber = getString(body.passportNumber);
  const passportCountry = getString(body.passportCountry);
  const passportIssuedAt = getDate(body.passportIssuedAt);
  const passportExpiresAt = getDate(body.passportExpiresAt);
  const passportIssuer = getString(body.passportIssuer);

  const documentImage = getString(body.documentImage);

  const user = await prisma.user
    .findUnique({
      where: { id: s.userId },
      include: { profile: true },
    })
    .catch(() => null);

  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

  // If already approved, do not downgrade or rewrite the snapshot.
  if (user.kycStatus === 'approved') {
    return NextResponse.json({ ok: true, status: user.kycStatus });
  }

  // Base KYC fields required to submit (UI will enforce too)
  if (consent !== true) {
    return NextResponse.json({ ok: false, error: 'consent_required' }, { status: 400 });
  }
  if (pepDeclared === null) {
    return NextResponse.json({ ok: false, error: 'pep_required' }, { status: 400 });
  }
  if (pepDeclared === true && !pepDetails) {
    return NextResponse.json({ ok: false, error: 'pep_details_required' }, { status: 400 });
  }

  // Hard requirements before submit
  if (!isProfileCompleted(user.profile)) {
    return NextResponse.json({ ok: false, error: 'profile_required' }, { status: 400 });
  }

  // EE: personal code is required for Silver/Gold/Platinum flows (we require it at submit time too)
  if (user.profile?.countryResidence === 'EE' && !user.profile?.isikukood) {
    return NextResponse.json({ ok: false, error: 'isikukood_required' }, { status: 400 });
  }

  const zone = worstZone([
    resolveCountryZone(user.profile?.countryResidence ?? null),
    resolveCountryZone(user.profile?.countryCitizenship ?? null),
    resolveCountryZone(user.profile?.countryTax ?? null),
  ]);

  if (!zone) {
    return NextResponse.json({ ok: false, error: 'country_unknown' }, { status: 400 });
  }
  if (zone === 'red') {
    return NextResponse.json({ ok: false, error: 'country_blocked' }, { status: 403 });
  }

  // Always store the latest submitted KYC data (even if status is already pending)
  await prisma.kycData.upsert({
    where: { userId: s.userId },
    create: {
      userId: s.userId,
      pepDeclared,
      pepDetails,
      consent,
      passportNumber,
      passportCountry,
      passportIssuedAt,
      passportExpiresAt,
      passportIssuer,
      documentImage,
    },
    update: {
      pepDeclared,
      pepDetails,
      consent,
      passportNumber,
      passportCountry,
      passportIssuedAt,
      passportExpiresAt,
      passportIssuer,
      documentImage,
    },
  });

  // If pending already: idempotent (data already upserted above).
  if (user.kycStatus === 'pending') {
    return NextResponse.json({ ok: true, status: user.kycStatus });
  }

  // Submit: set pending + snapshot zone
  const next: KycStatus = 'pending';

  await prisma.user.update({
    where: { id: s.userId },
    data: {
      kycStatus: next,
      kycCountryZone: zone,
      kycUpdatedAt: new Date(),
    },
  });

  return NextResponse.json({ ok: true, status: next });
}
