// app/api/auth/logout/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { SESSION_COOKIE, COOKIE_OPTIONS_EXPIRE_NOW } from '@/lib/session';

const APP_BASE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://vigri.ee';

export const runtime = 'nodejs';

// tiny cookie parser from the header (no deps)
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

// POST → clear session + redirect to "/"
// 303 "See Other" converts POST → GET on the target URL
export async function POST(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const sid = readCookie(cookieHeader, SESSION_COOKIE);

    if (sid) {
      // best-effort: remove session in DB (ignore if already deleted)
      await prisma.session.delete({ where: { id: sid } }).catch(() => {});
    }

    const redirectUrl = new URL('/', APP_BASE_URL);
    const res = NextResponse.redirect(redirectUrl, 303);
    res.cookies.set(SESSION_COOKIE, '', COOKIE_OPTIONS_EXPIRE_NOW);
    return res;
  } catch (e) {
    console.error('logout POST error', e);
    const redirectUrl = new URL('/', APP_BASE_URL);
    const res = NextResponse.redirect(redirectUrl, 303);
    res.cookies.set(SESSION_COOKIE, '', COOKIE_OPTIONS_EXPIRE_NOW);
    return res;
  }
}

// GET → clear session + redirect to "/"
export async function GET(req: Request) {
  try {
    const cookieHeader = req.headers.get('cookie');
    const sid = readCookie(cookieHeader, SESSION_COOKIE);

    if (sid) {
      await prisma.session.delete({ where: { id: sid } }).catch(() => {});
    }

    const redirectUrl = new URL('/', APP_BASE_URL);
    const res = NextResponse.redirect(redirectUrl);
    res.cookies.set(SESSION_COOKIE, '', COOKIE_OPTIONS_EXPIRE_NOW);
    return res;
  } catch (e) {
    console.error('logout GET error', e);
    const redirectUrl = new URL('/', APP_BASE_URL);
    const res = NextResponse.redirect(redirectUrl);
    res.cookies.set(SESSION_COOKIE, '', COOKIE_OPTIONS_EXPIRE_NOW);
    return res;
  }
}
