// lib/cookieHelpers.ts
import { cookies } from 'next/headers';

export function getCookie(name: string): string | undefined {
  return cookies().get(name)?.value;
}
export function setJsonCookie(name: string, obj: unknown) {
  cookies().set({
    name,
    value: JSON.stringify(obj),
    path: '/',
    sameSite: 'lax',
    httpOnly: false,
    maxAge: 60 * 60 * 24 * 30,
  });
}
