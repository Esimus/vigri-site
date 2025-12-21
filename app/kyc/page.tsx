// app/kyc/page.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';

type CountryZone = 'green' | 'grey' | 'red' | null;
type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';

type MeOk = {
  ok: true;
  signedIn: boolean;
  user: { id: string; email: string } | null;
  kycStatus: KycStatus;
  kycCountryZone: CountryZone;
  profileCompleted: boolean;
  countryBlocked: boolean;
  canBuyLowTier: boolean;
  canBuyHighTier: boolean;
  profile: {
    countryResidence?: string;
    countryCitizenship?: string;
    countryTax?: string;
  };
};

type MeFail = { ok: false; signedIn?: boolean; error?: string };
type MeResp = MeOk | MeFail;

type KycOk = { ok: true; status: KycStatus };
type KycFail = { ok: false; error?: string };
type KycResp = KycOk | KycFail;

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function hasOkFlag(v: unknown): v is { ok: boolean } {
  return isObject(v) && typeof (v as { ok?: unknown }).ok === 'boolean';
}
function isMeResp(v: unknown): v is MeResp {
  return hasOkFlag(v);
}
function isKycResp(v: unknown): v is KycResp {
  return hasOkFlag(v);
}

type PillTone = 'ok' | 'warn' | 'info';

function Pill({ tone, children }: { tone: PillTone; children: React.ReactNode }) {
  const cls =
    tone === 'ok'
      ? 'border-emerald-300/70 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/20 dark:text-emerald-100'
      : tone === 'warn'
        ? 'border-amber-300/70 bg-amber-50/80 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/20 dark:text-amber-100'
        : 'border-slate-300/70 bg-slate-50/80 text-slate-900 dark:border-[color:var(--border)] dark:bg-white/5 dark:text-[color:var(--fg)]';

  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] leading-none ${cls}`}>
      {children}
    </span>
  );
}

export default function KycPage() {
  const { t } = useI18n();

  const tr = useCallback(
    (key: string, fallback: string) => {
      const v = t(key);
      return v && v !== key ? v : fallback;
    },
    [t],
  );

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [signedIn, setSignedIn] = useState(false);
  const [profileCompleted, setProfileCompleted] = useState(false);
  const [zone, setZone] = useState<CountryZone>(null);
  const [kycStatus, setKycStatus] = useState<KycStatus>('none');

  const [countryCode, setCountryCode] = useState<string>('');

  const loadMe = useCallback(async () => {
    const res = await fetch('/api/me', { cache: 'no-store' });
    const raw: unknown = await res.json().catch(() => ({}));

    if (!res.ok || !isMeResp(raw) || !raw.ok) {
      setSignedIn(false);
      setProfileCompleted(false);
      setZone(null);
      setKycStatus('none');
      setCountryCode('');
      return;
    }

    setSignedIn(Boolean(raw.signedIn));
    setProfileCompleted(Boolean(raw.profileCompleted));
    setZone(raw.kycCountryZone ?? null);
    setKycStatus(raw.kycStatus ?? 'none');

    const cc =
      (raw.profile?.countryResidence ?? raw.profile?.countryCitizenship ?? raw.profile?.countryTax ?? '').toUpperCase();
    setCountryCode(cc);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setErr(null);
        await loadMe();
      } catch (e: unknown) {
        setErr(e instanceof Error ? e.message : tr('kyc.loadError', 'Failed to load KYC state.'));
      } finally {
        setLoading(false);
      }
    })();
  }, [loadMe, tr]);

  const zoneTone: PillTone = useMemo(() => {
    if (zone === 'red') return 'warn';
    if (zone === 'grey') return 'warn';
    if (zone === 'green') return 'ok';
    return 'info';
  }, [zone]);

  const zoneLabel = useMemo(() => {
    if (!zone) return tr('kyc.zoneUnknown', 'Unknown zone');
    if (zone === 'green') return tr('kyc.zoneGreen', 'Green');
    if (zone === 'grey') return tr('kyc.zoneGrey', 'Grey');
    return tr('kyc.zoneRed', 'Red');
  }, [zone, tr]);

  const submitKyc = useCallback(async () => {
    setBusy(true);
    setErr(null);

    try {
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ status: 'pending' satisfies KycStatus }),
      });

      const raw: unknown = await res.json().catch(() => ({}));
      if (!res.ok || !isKycResp(raw) || !raw.ok) {
        setErr(tr('kyc.submitError', 'Failed to submit KYC.'));
        return;
      }

      setKycStatus(raw.status);
      await loadMe();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : tr('kyc.submitError', 'Failed to submit KYC.'));
    } finally {
      setBusy(false);
    }
  }, [loadMe, tr]);

  if (loading) {
    return (
      <main className="max-w-3xl mx-auto p-6">
        <div className="card p-5 text-sm">{tr('kyc.loading', 'Loading...')}</div>
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto p-6 space-y-4">
      <div className="card p-5 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('kyc.title', 'KYC')}</div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Pill tone={signedIn ? 'ok' : 'warn'}>
                {signedIn ? tr('kyc.signedIn', 'Signed in') : tr('kyc.notSignedIn', 'Not signed in')}
              </Pill>

              <Pill tone={zoneTone}>
                {countryCode ? `${countryCode} · ${zoneLabel}` : zoneLabel}
              </Pill>

              <Pill tone={kycStatus === 'approved' ? 'ok' : kycStatus === 'pending' ? 'warn' : 'info'}>
                {tr('kyc.status', 'Status')}: <span className="ml-1 font-medium">{kycStatus}</span>
              </Pill>
            </div>
          </div>
        </div>

        {!signedIn && (
          <div className="rounded-2xl border border-amber-300/70 bg-amber-50/80 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/20 dark:text-amber-100 p-4 text-sm">
            <div className="font-medium">{tr('kyc.needSignIn', 'Please sign in to continue.')}</div>
            <div className="mt-2 text-xs opacity-80">{tr('kyc.needSignInHint', 'Open Dashboard and sign in, then return here.')}</div>
            <div className="mt-3">
              <Link href="/dashboard" className="underline text-sm">
                {tr('kyc.goDashboard', 'Go to Dashboard')}
              </Link>
            </div>
          </div>
        )}

        {signedIn && zone === 'red' && (
          <div className="rounded-2xl border border-rose-300/70 bg-rose-50/80 text-rose-900 dark:border-rose-500/35 dark:bg-rose-950/20 dark:text-rose-100 p-4 text-sm">
            {tr('kyc.redBlocked', 'KYC is not available for your current zone via this flow.')}
          </div>
        )}

        {signedIn && zone !== 'red' && !profileCompleted && (
          <div className="rounded-2xl border border-amber-300/70 bg-amber-50/80 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/20 dark:text-amber-100 p-4 text-sm">
            <div>{tr('kyc.profileRequired', 'Complete your Profile first (required fields), then come back to submit KYC.')}</div>
            <div className="mt-2">
              <Link href="/dashboard/profile" className="underline">
                {tr('kyc.goProfile', 'Go to Profile')}
              </Link>
            </div>
          </div>
        )}

        {signedIn && zone !== 'red' && profileCompleted && (
          <div className="space-y-3">
            <div className="card p-4 text-sm space-y-2">
              <div className="font-medium">{tr('kyc.stepsTitle', 'Process')}</div>
              <ol className="list-decimal pl-5 space-y-1 opacity-80">
                <li>{tr('kyc.step1', 'Submit KYC request')}</li>
                <li>{tr('kyc.step2', 'Upload documents and pass checks')}</li>
                <li>{tr('kyc.step3', 'Manual review → approval')}</li>
              </ol>
            </div>

            {kycStatus === 'none' && (
              <button type="button" className="btn btn-primary" onClick={submitKyc} disabled={busy}>
                {busy ? tr('kyc.submitting', 'Submitting...') : tr('kyc.submit', 'Submit KYC (set to pending)')}
              </button>
            )}

            {kycStatus === 'pending' && (
              <div className="rounded-2xl border border-amber-300/70 bg-amber-50/80 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/20 dark:text-amber-100 p-4 text-sm">
                {tr('kyc.pendingHint', 'Your request is pending review.')}
              </div>
            )}

            {kycStatus === 'approved' && (
              <div className="rounded-2xl border border-emerald-300/70 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/20 dark:text-emerald-100 p-4 text-sm">
                ✅ {tr('kyc.approvedHint', 'KYC approved.')}
              </div>
            )}

            {kycStatus === 'rejected' && (
              <div className="rounded-2xl border border-rose-300/70 bg-rose-50/80 text-rose-900 dark:border-rose-500/35 dark:bg-rose-950/20 dark:text-rose-100 p-4 text-sm">
                {tr('kyc.rejectedHint', 'KYC rejected.')}
              </div>
            )}
          </div>
        )}

        {err && <div className="text-sm text-red-600">{err}</div>}
      </div>

      <div className="text-sm">
        <Link href="/dashboard" className="underline">
          ← {tr('kyc.back', 'Back to Dashboard')}
        </Link>
      </div>
    </main>
  );
}
