// app/page.tsx
import { headers } from 'next/headers';
import HomeClient from './HomeClient';

type MeUser = { email: string } | null;

type HeaderLike = { get(name: string): string | null };

function baseUrlFromHeaders(h: HeaderLike) {
  const proto = h.get('x-forwarded-proto') ?? 'https';
  const host = h.get('x-forwarded-host') ?? h.get('host');
  if (!host) return null;
  return `${proto}://${host}`;
}

async function fetchMe(): Promise<MeUser> {
  const h = await headers();
  const base = baseUrlFromHeaders(h);
  if (!base) return null;

  try {
    const r = await fetch(`${base}/api/me`, {
      cache: 'no-store',
      headers: {
        cookie: h.get('cookie') ?? '',
      },
    });

    const j = await r.json().catch(() => null);
    if (r.ok && j?.ok && j?.user?.email) {
      return { email: String(j.user.email) };
    }
    return null;
  } catch {
    return null;
  }
}

export default async function Page() {
  const me = await fetchMe();
  return <HomeClient initialMe={me} />;
}
