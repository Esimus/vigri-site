// components/DashboardKycBanner.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';

type KycState = 'none' | 'pending' | 'approved' | 'loading';

type MeOk = {
  ok: true;
  kyc: boolean | 'none' | 'pending' | 'approved';
  lum: unknown;
};
type MeFail = { ok: false; error?: string };
type MeResp = MeOk | MeFail;

function mapKyc(v: MeResp): KycState {
  if (!v.ok) return 'none';
  if (v.kyc === true || v.kyc === 'approved') return 'approved';
  if (v.kyc === 'pending') return 'pending';
  return 'none';
}

// helper: fallback to readable text if a key is missing
const tr = (t: (k: string) => string, k: string, fb: string) => {
  const v = t(k);
  return v === k ? fb : v;
};

export default function DashboardKycBanner() {
  const { t } = useI18n();
  const [kyc, setKyc] = useState<KycState>('loading');

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = (await api.me()) as MeResp;
      if (!alive) return;
      setKyc(mapKyc(r));
    })();
    return () => { alive = false; };
  }, []);

  // hide banner when approved or still loading
  if (kyc === 'approved' || kyc === 'loading') return null;

  const text   = tr(t, 'kyc.banner.text',  'KYC status');
  const hint   = tr(t, 'kyc.banner.hint',  'Some features are limited until verification.');
  const start  = tr(t, 'kyc.banner.start', 'Start KYC');
  const status = tr(t, `kyc.status.${kyc}`, kyc); // uses flat keys like "kyc.status.none"

  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
      <div>
        {/* readable fallbacks if translations are missing */}
        ⚠ {text}: <b>{status}</b>. {hint}
      </div>
      <Link href="/dashboard/profile#kyc" className="btn btn-outline ml-3">
        {start}
      </Link>
    </div>
  );
}
