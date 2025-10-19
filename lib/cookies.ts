// lib/cookies.ts
import { cookies } from 'next/headers';

/** Safe cookie getter that works across Next 15 typings. */
export function getCookie(name: string): string | null {
  // In some Next versions cookies() may be typed as a Promise; use optional access
  const jar = cookies() as unknown as { get?: (n: string) => { value?: string } | undefined };
  const v = jar.get?.(name)?.value;
  return v ?? null;
}
