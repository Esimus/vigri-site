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
  kyc: KycStatusApi; // from /api/me
  kycStatus?: KycStatusApi;
  profileCompleted?: boolean;
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

  const reloadMe = async () => {
    const r = (await api.me()) as MeResp;
    if (isMeOk(r)) {
      const status = r.kyc;
      const mapped: KycState =
        status === 'approved' ? 'approved' : status === 'pending' || status === 'rejected' ? 'pending' : 'none';
      setKyc(mapped);
    }
  };

  useEffect(() => {
    void reloadMe();
  }, []);

  const progressCurrent = kyc === 'approved' ? 3 : kyc === 'pending' ? 2 : 0;

  return (
    <div className="space-y-4">
      <div className="card p-4 text-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            {t('kyc.status')}:&nbsp;
            <StatusBadge status={kyc}>{t(`kyc.status.${kyc}`)}</StatusBadge>
          </div>
        </div>

        <div className="pt-1">
          <StepBar
            steps={[t('kyc.step.start'), t('kyc.step.submit'), t('kyc.step.review')]}
            current={progressCurrent}
          />
        </div>
      </div>
      <ProfileForm />
    </div>
  );
}
