// lib/cookieHelpers.ts
import { cookies } from 'next/headers';
import { getCookie as coreGetCookie } from './cookies';

/** Re-export unified safe getter so all code uses the same implementation. */
export const getCookie = coreGetCookie;

/**
 * Set a JSON cookie.
 * Note: This helper is intended to be called from a server route/handler.
 * We keep cookies().set here, but silence TS typing differences across Next 15.
 */
export function setJsonCookie(name: string, obj: unknown) {
  // Some Next 15 typings mark cookies() as Promise-like; use a loose cast.
  // We only need .set at runtime, which is present in route handlers.
  // @ts-expect-error: Next 15 typing variance (ReadonlyRequestCookies vs ResponseCookies)
  cookies().set({
    name,
    value: JSON.stringify(obj),
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
}
