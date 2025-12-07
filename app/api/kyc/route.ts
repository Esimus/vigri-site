// app/api/kyc/route.ts
import { NextResponse } from 'next/server';
import { getCookie } from '@/lib/cookies';

type Kyc = 'none' | 'pending' | 'approved' | 'rejected';

// Read current KYC status from cookie (or 'none' if absent)
export async function GET() {
  const raw = await getCookie('vigri_kyc');
  const status = (raw as Kyc | null) ?? 'none';
  return NextResponse.json({ ok: true, status });
}

// Update KYC status (simple demo endpoint that stores to cookie)
export async function POST(req: Request) {
  let bodyUnknown: unknown = {};
  try {
    bodyUnknown = await req.json();
  } catch {
    // ignore malformed JSON
  }
  const next = (bodyUnknown as { status?: Kyc }).status ?? 'pending';

  const res = NextResponse.json({ ok: true, status: next });
  res.cookies.set({
    name: 'vigri_kyc',
    value: next,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
