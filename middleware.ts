// middleware.ts
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Captures ?ref=<code> on non-API routes and stores it in a cookie.
export function middleware(req: NextRequest) {
  const url = new URL(req.url);

  // Never touch API / Next internals
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/_next')) {
    return NextResponse.next();
  }

  const ref = url.searchParams.get('ref');
  if (!ref) return NextResponse.next();

  url.searchParams.delete('ref');

  const res = NextResponse.redirect(url, { status: 302 });
  res.cookies.set({
    name: 'vigri_ref',
    value: ref,
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}

export const config = {
  matcher: ['/:path*'],
};
