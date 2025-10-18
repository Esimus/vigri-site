import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { grant } = await req.json().catch(() => ({ grant: false as boolean }));
  const res = NextResponse.json({ ok: true, invited: !!grant });
  res.cookies.set({
    name: 'vigri_founding_invited',
    value: grant ? '1' : '',
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: grant ? 60 * 60 * 24 * 7 : 0,
  });
  return res;
}
