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
  const stepLabels = [t('kyc.step.start'), t('kyc.step.submit'), t('kyc.step.review')];

  return (
    <div className="space-y-4">
      <div className="card p-4 text-sm space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div>
            {t('kyc.status')}:&nbsp;&nbsp;
            <StatusBadge status={kyc}>{t(`kyc.status.${kyc}`)}</StatusBadge>
          </div>
        </div>

        <div className="pt-1">
          {/* Mobile: compact stepper with tiny labels under circles */}
          <div className="md:hidden">
            {/* Top row: circles + lines */}
            <div className="flex items-center w-full">
              {/* Step 1 */}
              <div
                className={
                  'h-6 w-6 rounded-full grid place-items-center text-[11px] font-semibold ' +
                  (progressCurrent >= 1
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-500/40 text-zinc-200')
                }
              >
                1
              </div>

              {/* Line 1 */}
              <div
                className={
                  'h-[2px] flex-1 mx-2 rounded-full ' +
                  (progressCurrent >= 2 ? 'bg-emerald-600/70' : 'bg-zinc-500/30')
                }
                aria-hidden
              />

              {/* Step 2 */}
              <div
                className={
                  'h-6 w-6 rounded-full grid place-items-center text-[11px] font-semibold ' +
                  (progressCurrent >= 2
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-500/40 text-zinc-200')
                }
              >
                2
              </div>

              {/* Line 2 */}
              <div
                className={
                  'h-[2px] flex-1 mx-2 rounded-full ' +
                  (progressCurrent >= 3 ? 'bg-emerald-600/70' : 'bg-zinc-500/30')
                }
                aria-hidden
              />

              {/* Step 3 */}
              <div
                className={
                  'h-6 w-6 rounded-full grid place-items-center text-[11px] font-semibold ' +
                  (progressCurrent >= 3
                    ? 'bg-emerald-600 text-white'
                    : 'bg-zinc-500/40 text-zinc-200')
                }
              >
                3
              </div>
            </div>

            {/* Bottom row: tiny labels */}
            <div className="relative mt-2 h-2 text-[10px] leading-none opacity-70">
              <div className="absolute left-[12px] -translate-x-1/2 max-w-[90px] truncate text-center">
                {stepLabels[0]}
              </div>

              <div className="absolute left-1/2 -translate-x-1/2 max-w-[90px] truncate text-center">
                {stepLabels[1]}
              </div>

              <div className="absolute left-[calc(100%-12px)] -translate-x-1/2 max-w-[90px] truncate text-center">
                {stepLabels[2]}
              </div>
            </div>
          </div>

          {/* Desktop: full labels */}
          <div className="hidden md:block">
            <StepBar
              steps={[t('kyc.step.start'), t('kyc.step.submit'), t('kyc.step.review')]}
              current={progressCurrent}
            />
          </div>
        </div>
      </div>
      <ProfileForm />
    </div>
  );
}
