'use client';

import { useEffect, useState } from 'react';

type Me = { signedIn: boolean; kyc: 'none' | 'pending' | 'approved' };

export default function useMe() {
  const [data, setData] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store' });
        if (!r.ok) throw new Error('Failed to load /api/me');
        const json = (await r.json()) as Me;
        if (alive) setData(json);
      } catch (e) {
        if (alive) setError(e as Error);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  return { data, loading, error };
}
