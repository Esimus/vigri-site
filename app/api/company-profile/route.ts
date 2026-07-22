// app/api/company-profile/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';

type CompanyProfilePayload = {
  companyName?: string;
  registryCode?: string;
  vatNumber?: string;
  country?: string;
  legalAddress?: string;
  contactPerson?: string;
  contactEmail?: string;
  website?: string;
  sponsorshipPurpose?: string;
};

type DbSession = {
  userId: string;
  idleExpires: bigint;
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
  return typeof v === 'string' ? v.trim().slice(0, n) : undefined;
}

function sanitizeCompanyProfile(p: unknown): CompanyProfilePayload {
  if (!isObject(p)) return {};
  const src = p as CompanyProfilePayload;

  const out: CompanyProfilePayload = {
    companyName: clip(src.companyName),
    registryCode: clip(src.registryCode, 64),
    vatNumber: clip(src.vatNumber, 64),
    country: clip(src.country, 2)?.toUpperCase(),
    legalAddress: clip(src.legalAddress, 500),
    contactPerson: clip(src.contactPerson),
    contactEmail: clip(src.contactEmail, 254),
    website: clip(src.website, 300),
    sponsorshipPurpose: clip(src.sponsorshipPurpose, 1000),
  };

  return Object.fromEntries(
    Object.entries(out).filter(([, v]) => v !== undefined),
  ) as CompanyProfilePayload;
}

function validateCompanyProfile(p: CompanyProfilePayload): string | null {
  if (!p.companyName) return 'company_name_required';
  if (!p.registryCode) return 'registry_code_required';
  if (!p.country || p.country.length !== 2) return 'country_required';
  if (!p.contactPerson) return 'contact_person_required';

  if (p.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(p.contactEmail)) {
    return 'invalid_contact_email';
  }

  return null;
}

async function requireSession(req: Request): Promise<{ userId: string } | null> {
  const sid = readCookie(req.headers.get('cookie'), SESSION_COOKIE);
  if (!sid) return null;

  const session = (await prisma.session
    .findUnique({
      where: { id: sid },
      select: { userId: true, idleExpires: true },
    })
    .catch(() => null)) as DbSession | null;

  if (!session) return null;

  const now = BigInt(Date.now());
  if (session.idleExpires <= now) return null;

  return { userId: session.userId };
}

export async function GET(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      accountType: true,
      companyProfile: true,
    },
  });

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    accountType: user.accountType,
    companyProfile: user.companyProfile ?? {},
  });
}

export async function POST(req: Request) {
  const session = await requireSession(req);
  if (!session) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {
    // ignore malformed JSON
  }

  const body = isObject(bodyUnknown) ? bodyUnknown : {};
  const companyProfile = sanitizeCompanyProfile(body.companyProfile);
  const validationError = validateCompanyProfile(companyProfile);

  if (validationError) {
    return NextResponse.json({ ok: false, error: validationError }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, accountType: true },
  });

  if (!existing) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });
  }

  if (existing.accountType !== 'company') {
    return NextResponse.json({ ok: false, error: 'company_account_required' }, { status: 403 });
  }

  await prisma.companyProfile.upsert({
    where: { userId: session.userId },
    create: {
      userId: session.userId,
      companyName: companyProfile.companyName!,
      registryCode: companyProfile.registryCode!,
      vatNumber: companyProfile.vatNumber ?? null,
      country: companyProfile.country!,
      legalAddress: companyProfile.legalAddress ?? null,
      contactPerson: companyProfile.contactPerson!,
      contactEmail: companyProfile.contactEmail ?? null,
      website: companyProfile.website ?? null,
      sponsorshipPurpose: companyProfile.sponsorshipPurpose ?? null,
    },
    update: {
      companyName: companyProfile.companyName!,
      registryCode: companyProfile.registryCode!,
      vatNumber: companyProfile.vatNumber ?? null,
      country: companyProfile.country!,
      legalAddress: companyProfile.legalAddress ?? null,
      contactPerson: companyProfile.contactPerson!,
      contactEmail: companyProfile.contactEmail ?? null,
      website: companyProfile.website ?? null,
      sponsorshipPurpose: companyProfile.sponsorshipPurpose ?? null,
    },
  });

  return NextResponse.json({ ok: true });
}