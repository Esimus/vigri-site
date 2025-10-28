// app/dashboard/rewards/page.tsx
'use client';

import { useI18n } from '@/hooks/useI18n';

export default function RewardsPage() {
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Rewards</h1>
      <p className="text-sm opacity-70">{t('rewards.soon')}</p>
      <div className="rounded-2xl border p-4 bg-white/50 text-sm">
        {t('rewards.stub')}
      </div>
    </div>
  );
}
