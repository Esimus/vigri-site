// components/DashboardKycBanner.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';

type KycState = 'none' | 'pending' | 'approved' | 'loading';

type AccountType = 'person' | 'company';

type MeOk = {
  ok: true;
  kyc: boolean | 'none' | 'pending' | 'approved';
  accountType?: AccountType;
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
  const [accountType, setAccountType] = useState<AccountType>('person');

  useEffect(() => {
    let alive = true;
    (async () => {
      const r = (await api.me()) as MeResp;
      if (!alive) return;
      setKyc(mapKyc(r));
      setAccountType(r.ok && r.accountType === 'company' ? 'company' : 'person');
    })();
    return () => { alive = false; };
  }, []);

  // hide banner when approved or still loading
  if (kyc === 'approved' || kyc === 'loading') return null;

  const isCompany = accountType === 'company';

  const text = isCompany
    ? tr(t, 'kyb.banner.text', 'Company verification')
    : tr(t, 'kyc.banner.text', 'KYC status');

  const hint = isCompany
    ? tr(t, 'kyb.banner.hint', 'Some corporate features are limited until company verification.')
    : tr(t, 'kyc.banner.hint', 'Some features are limited until verification.');

  const start = isCompany
    ? tr(t, 'kyb.banner.start', 'Open company profile')
    : tr(t, 'kyc.banner.start', 'Start KYC');

  const status = tr(t, `kyc.status.${kyc}`, kyc);
  const href = isCompany ? '/dashboard/profile' : '/dashboard/profile#kyc';

  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 text-sm flex items-center justify-between">
      <div>
        {/* readable fallbacks if translations are missing */}
        ⚠ {text}: <b>{status}</b>. {hint}
      </div>
      <Link href={href} className="btn btn-outline ml-3">
        {start}
      </Link>
    </div>
  );
}
