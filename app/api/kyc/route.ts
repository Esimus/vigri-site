import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

type Kyc = 'none' | 'pending' | 'approved';

export async function GET() {
  const status = (cookies().get('vigri_kyc')?.value as Kyc) ?? 'none';
  return NextResponse.json({ ok: true, status });
}

export async function POST(req: Request) {
  const { action } = await req.json().catch(() => ({} as { action?: string }));
  let status: Kyc;

  switch (action) {
    case 'start':   status = 'pending';  break;
    case 'approve': status = 'approved'; break;
    case 'reset':   status = 'none';     break;
    default:
      return NextResponse.json({ ok: false, error: 'Invalid action' }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, status });
  res.cookies.set({
    name: 'vigri_kyc',
    value: status,
    httpOnly: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
