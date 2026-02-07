// app/api/intake/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const Kind = z.enum(['club_pilot', 'ambassador', 'faq_question', 'other']);

const IntakeSchema = z.object({
  kind: Kind,

  // Contact
  contactName: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().max(254).optional(),
  phone: z.string().trim().max(64).optional(),
  telegram: z.string().trim().max(64).optional(),
  preferredLang: z.string().trim().max(16).optional(), // ru/en/et

  // Location
  country: z.string().trim().max(2).optional(), // ISO-2 (EE, etc.)
  region: z.string().trim().max(120).optional(),
  city: z.string().trim().max(120).optional(),

  // Content
  subject: z.string().trim().max(200).optional(),
  message: z.string().trim().min(1).max(4000).optional(),

  // Form-specific extra fields
  payload: z.unknown().optional(),

  // Privacy / consent
  consent: z.boolean(),
  privacyVersion: z.string().trim().max(64).optional(),

  // Source / marketing
  sourcePath: z.string().trim().max(200).optional(),
  referrer: z.string().trim().max(500).optional(),
  utmSource: z.string().trim().max(120).optional(),
  utmMedium: z.string().trim().max(120).optional(),
  utmCampaign: z.string().trim().max(200).optional(),

  // Optional caller-provided dedupe
  dedupeKey: z.string().trim().max(128).optional(),

  // Honeypot (must be empty)
  hp: z.string().optional(),
});

function jsonOk(data: Record<string, unknown> = {}, status = 200) {
  return NextResponse.json({ ok: true, ...data }, { status });
}

function jsonErr(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getClientIp(req: NextRequest): string | null {
  // Prefer proxy headers (Vercel/Nginx/etc.)
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() || null;
  const xri = req.headers.get('x-real-ip');
  if (xri) return xri.trim();
  return null;
}

function sha256(input: string): string {
  return crypto.createHash('sha256').update(input).digest('hex');
}

export async function POST(req: NextRequest) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return jsonErr('Invalid JSON body', 400);
  }

  const parsed = IntakeSchema.safeParse(body);
  if (!parsed.success) {
    return jsonErr('Invalid form payload', 400);
  }

  const data = parsed.data;

  // Honeypot check
  if (data.hp && data.hp.trim().length > 0) {
    return jsonErr('Rejected', 400);
  }

  if (!data.consent) {
    return jsonErr('Consent required', 400);
  }

  // Minimal message rule: require message OR payload with something meaningful
  const hasMessage = typeof data.message === 'string' && data.message.trim().length > 0;
  const hasPayload = typeof data.payload !== 'undefined' && data.payload !== null;
  if (!hasMessage && !hasPayload) {
    return jsonErr('Message or payload required', 400);
  }

  const ip = getClientIp(req);
  const salt = process.env.INTAKE_HASH_SALT ?? 'vigri-intake';
  const ipHash = ip ? sha256(`${salt}:${ip}`) : null;

  const userAgent = req.headers.get('user-agent') ?? null;

  // If caller didn't provide dedupeKey, we keep it null (no hard dedupe by default)
  // But we still compute a soft fingerprint (not stored) for future if needed.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const fingerprint = sha256(
    [
      data.kind,
      data.email ?? '',
      data.contactName ?? '',
      data.city ?? '',
      data.country ?? '',
      data.sourcePath ?? '',
      data.message ?? '',
      JSON.stringify(data.payload ?? null),
    ].join('|'),
  );

  try {
    const row = await prisma.formSubmission.create({
      data: {
        kind: data.kind,
        status: 'new',

        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        telegram: data.telegram,
        preferredLang: data.preferredLang,

        country: data.country,
        region: data.region,
        city: data.city,

        subject: data.subject,
        message: data.message,

        payload: (data.payload as Prisma.InputJsonValue | undefined) ?? undefined,

        consent: data.consent,
        privacyVersion: data.privacyVersion,

        sourcePath: data.sourcePath,
        referrer: data.referrer,
        utmSource: data.utmSource,
        utmMedium: data.utmMedium,
        utmCampaign: data.utmCampaign,

        userAgent,
        ipHash,
        dedupeKey: data.dedupeKey ?? null,

        internalNote: null,
      },
      select: { id: true },
    });

    return jsonOk({ id: row.id }, 201);
    } catch (e: unknown) {
    const err = e as { code?: string; message?: string };

    // Keep server logs for debugging; do not leak details to clients.
    console.error('Intake save failed:', err);

    if (err?.code === 'P2002') {
        return jsonErr('Duplicate submission', 409);
    }

    return jsonErr('Failed to save submission', 500);
    }
}
