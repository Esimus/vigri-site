// app/kyc/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

type Kyc = 'none' | 'pending' | 'approved';
type KycOk = { ok: true; status: Kyc };
type KycFail = { ok: false; error?: string };
type KycResp = KycOk | KycFail;

export default function KycPage() {
  const [status, setStatus] = useState<Kyc>('none');
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const r = (await api.kyc.get()) as KycResp;
        if (r.ok) {
          setStatus(r.status);
        } else {
          setErr('Failed to load KYC status');
        }
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : 'Failed to load KYC status');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const act = async (action: 'start' | 'approve' | 'reset') => {
    setErr(null);
    try {
      if (action === 'start') await api.kyc.start();
      else if (action === 'approve') await api.kyc.approve();
      else await api.kyc.reset();

      const r = (await api.kyc.get()) as KycResp;
      if (r.ok) setStatus(r.status);
      else setErr('Failed to refresh status');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Action failed');
    }
  };

  if (loading) return <main className="max-w-xl mx-auto p-8">Loading…</main>;

  return (
    <main className="max-w-xl mx-auto p-8 space-y-4">
      <h1 className="text-2xl font-semibold">KYC</h1>
      <p className="text-sm opacity-70">
        Status: <b>{status}</b>
      </p>

      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li>Start: provide personal info</li>
        <li>Submit: document &amp; liveness</li>
        <li>Review → Approval</li>
      </ol>

      {status === 'none' && (
        <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => act('start')}>
          Start KYC (mock → pending)
        </button>
      )}

      {status === 'pending' && (
        <div className="space-x-2">
          <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => act('approve')}>
            Submit &amp; Approve (mock)
          </button>
          <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => act('reset')}>
            Cancel
          </button>
        </div>
      )}

      {status === 'approved' && (
        <div className="space-x-2">
          <span className="text-sm">✅ KYC approved.</span>
          <button className="rounded-xl border px-3 py-2 text-sm" onClick={() => act('reset')}>
            Reset (mock)
          </button>
        </div>
      )}

      {err && <div className="text-sm text-red-600">{err}</div>}

      <div className="text-sm">
        <Link href="/dashboard" className="underline">
          ← Back to Dashboard
        </Link>
      </div>
    </main>
  );
}
