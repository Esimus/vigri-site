// lib/cookies.ts
import { cookies } from 'next/headers';

export async function getCookie(name: string): Promise<string | null> {
  const store = await cookies();
  const v = store.get(name)?.value;
  return v ?? null;
}
