'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';

type KycState = 'none' | 'pending' | 'approved' | 'loading';

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
      const r = await api.me();
      if (!alive || !r?.ok) {
        setKyc('none');
        return;
      }
      // api.me() returns boolean kyc → map to flat keys: kyc.status.none/approved
      const kycBool = Boolean((r as any)?.kyc);
      setKyc(kycBool ? 'approved' : 'none');
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
      <Link href="/kyc" className="btn btn-outline ml-3">{start}</Link>
    </div>
  );
}
