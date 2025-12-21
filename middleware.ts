// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Captures ?ref=<code> and stores it in a cookie for later use.
// MVP: <code> = userId of inviter. Later we will switch to referralCode.
export function middleware(req: NextRequest) {
  const url = new URL(req.url);
  const ref = url.searchParams.get('ref');

  if (!ref) {
    return NextResponse.next();
  }

  // Optionally clean the URL by removing ?ref=...
  url.searchParams.delete('ref');

  const res = NextResponse.redirect(url, { status: 302 });
  res.cookies.set({
    name: 'vigri_ref',
    value: ref,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,       // readable on client if needed
    maxAge: 60 * 60 * 24 * 90, // 90 days
  });
  return res;
}

// Apply to all pages
export const config = {
  matcher: ['/:path*'],
};
