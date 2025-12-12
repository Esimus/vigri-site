// app/dashboard/profile/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StepBar } from '@/components/ui/StepBar';
import { ProfileForm } from '@/components/profile/ProfileForm';

// UI status for badges/progress (3 states)
type KycState = 'none' | 'pending' | 'approved';

// Raw status that comes from /api/me (DB enum)
type KycStatusApi = 'none' | 'pending' | 'approved' | 'rejected';

type MeOk = {
  ok: true;
  signedIn: boolean;
  kyc: KycStatusApi;       // from /api/me
  kycStatus?: KycStatusApi;
  profileCompleted?: boolean;
  lum: unknown;
  user?: { id: string; email: string } | null;
};

type MeFail = { ok: false; error?: string };
type MeResp = MeOk | MeFail;

function isMeOk(r: unknown): r is MeOk {
  return typeof r === 'object' && r !== null && (r as { ok?: unknown }).ok === true;
}

export default function ProfilePage() {
  const { t } = useI18n();

  const [kyc, setKyc] = useState<KycState>('none');
  const [lum, setLum] = useState(false);
  const [busy, setBusy] = useState(false);

  // Read current state
  const reloadMe = async () => {
    const r = (await api.me()) as MeResp;
    if (isMeOk(r)) {
      const status = r.kyc; // KycStatusApi
      let mapped: KycState = 'none';

      if (status === 'approved') {
        mapped = 'approved';
      } else if (status === 'pending' || status === 'rejected') {
        // for now "rejected" is shown like "pending" in UI
        mapped = 'pending';
      }

      setKyc(mapped);
      setLum(Boolean(r.lum));
    }
  };

  useEffect(() => {
    void reloadMe();
  }, []);

  const toggleLum = async () => {
    setBusy(true);
    try {
      const resp = await api.setLum(!lum); // API returns { ok: true } only
      if ((resp as { ok?: boolean }).ok) {
        setLum(!lum);
        // опционально можно перечитать me: await reloadMe();
      }
    } finally {
      setBusy(false);
    }
  };

  // Map KYC to progress step: 0 none, 2 pending, 3 approved (3 steps total)
  const progressCurrent = kyc === 'approved' ? 3 : kyc === 'pending' ? 2 : 0;

  return (
    <div className="space-y-4">
      <div className="card p-4 text-sm space-y-3">
        {/* KYC row */}
        <div className="flex flex-wrap items-center gap-2">
          <div>
            {t('kyc.status')}:&nbsp;
            <StatusBadge status={kyc}>{t(`kyc.status.${kyc}`)}</StatusBadge>
          </div>

          {kyc !== 'approved' && (
            <a href="/kyc" className="underline ml-2">
              {t('kyc.banner.start')}
            </a>
          )}
        </div>

        {/* Visual step progress */}
        <div className="pt-1">
          <StepBar
            steps={[t('kyc.step.start'), t('kyc.step.submit'), t('kyc.step.review')]}
            current={progressCurrent}
          />
        </div>

        {/* LUM toggle */}
        <div className="flex items-center gap-3">
          <div>
            {t('profile.status.lum')}: <b>{lum ? t('common.enabled') : t('common.disabled')}</b>
          </div>
          <button
            className="rounded-xl border px-3 py-1 text-xs"
            onClick={toggleLum}
            disabled={busy}
          >
            {lum ? t('profile.lum.disable') : t('profile.lum.enable')}
          </button>
        </div>
      </div>

      <ProfileForm />
    </div>
  );
}
