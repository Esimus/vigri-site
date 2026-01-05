// components/rewards/ReferralBanner.tsx
'use client';

import { useEffect, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';

type BoundInviter = { id: string; email: string | null } | null;

type CheckResp =
  | { ok: true; exists: boolean; user: unknown | null }
  | { ok: false; error: string };

type BindResp = { ok: boolean; boundTo?: string; error?: string };

type InviteeMetaResp =
  | { ok: true; createdAt: string; emailVerified: boolean; emailVerifiedAt: string | null }
  | { ok: false; error: string };

function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export function ReferralBanner(props: {
  userId: string | null;
  refCookie: string | null;
  boundInviter: BoundInviter; // if not null => DB has referrerId
}) {
  const { t } = useI18n();
  const { userId, refCookie, boundInviter } = props;

  const hasBound = !!boundInviter?.id;

  const [email, setEmail] = useState('');
  const [checkStatus, setCheckStatus] = useState<
    'idle' | 'checking' | 'found' | 'notfound' | 'fail'
  >('idle');
  const [checkMsg, setCheckMsg] = useState<string>('');

  const [bindStatus, setBindStatus] = useState<'idle' | 'doing' | 'ok' | 'fail'>('idle');
  const [bindMsg, setBindMsg] = useState<string>('');

  const [inviteeMeta, setInviteeMeta] = useState<{ emailVerifiedAt: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadMeta() {
      setInviteeMeta(null);
      if (!userId) return;

      try {
        const r = await fetch(
          `/api/referral/invitee-meta?userId=${encodeURIComponent(userId)}`,
          { cache: 'no-store' },
        );
        const j: unknown = await r.json().catch(() => null);
        if (cancelled) return;

        const data = j as InviteeMetaResp;
        if (!r.ok || !data || !data.ok) return;

        setInviteeMeta({ emailVerifiedAt: data.emailVerifiedAt });
      } catch {
        // ignore
      }
    }

    void loadMeta();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  async function bindFromCookie() {
    if (!userId) return;

    setBindStatus('doing');
    setBindMsg('');

    try {
      const r = await fetch(
        `/api/referral/bind?userId=${encodeURIComponent(userId)}`,
        { method: 'POST' },
      );
      const j: unknown = await r.json().catch(() => ({}));
      const data = j as BindResp;

      if (!r.ok || !data.ok) {
        setBindStatus('fail');
        setBindMsg(data.error ?? 'bind_failed');
        return;
      }

      setBindStatus('ok');
      setBindMsg('ok');
      window.location.reload();
    } catch {
      setBindStatus('fail');
      setBindMsg('bind_failed');
    }
  }

  async function checkInviterEmail() {
    const val = email.trim().toLowerCase();
    setCheckMsg('');

    if (!val || !val.includes('@')) {
      setCheckStatus('fail');
      setCheckMsg(t('refBanner.badEmail'));
      return;
    }

    setCheckStatus('checking');
    try {
      const r = await fetch(
        `/api/referral/check-inviter-email?email=${encodeURIComponent(val)}`,
        { cache: 'no-store' },
      );
      const j: unknown = await r.json().catch(() => null);
      const data = j as CheckResp;

      if (!r.ok || !data || !data.ok) {
        setCheckStatus('fail');
        setCheckMsg(t('refBanner.checkFailed'));
        return;
      }

      if (data.exists) {
        setCheckStatus('found');
        setCheckMsg('');
      } else {
        setCheckStatus('notfound');
        setCheckMsg(t('refBanner.userNotFound'));
      }
    } catch {
      setCheckStatus('fail');
      setCheckMsg(t('refBanner.checkFailed'));
    }
  }

  async function bindByEmail() {
    if (!userId) return;

    const val = email.trim().toLowerCase();
    setBindStatus('doing');
    setBindMsg('');

    try {
      const r = await fetch(
        `/api/referral/bind-by-email?userId=${encodeURIComponent(userId)}`,
        {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ email: val }),
        },
      );
      const j: unknown = await r.json().catch(() => ({}));
      const data = j as BindResp;

      if (!r.ok || !data.ok) {
        setBindStatus('fail');
        setBindMsg(data.error ?? 'bind_failed');
        return;
      }

      setBindStatus('ok');
      setBindMsg('ok');
      window.location.reload();
    } catch {
      setBindStatus('fail');
      setBindMsg('bind_failed');
    }
  }

  return (
    <div className="card p-5">
      {/* If DB referrerId exists -> show DB state and ignore cookie completely */}
      {hasBound ? (
        <>
          <h2 className="text-sm font-semibold mb-2">{t('refBanner.referrerConfirmedTitle')}</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="card p-3">
              <div className="text-[11px] opacity-60">{t('refBanner.referrerId')}</div>
              <div className="text-sm font-medium mt-1 font-mono break-all">
                {boundInviter?.id ?? '—'}
              </div>
            </div>

            <div className="card p-3">
              <div className="text-[11px] opacity-60">{t('refBanner.createdAt')}</div>
              <div className="text-sm font-medium mt-1">
                {fmtDate(inviteeMeta?.emailVerifiedAt ?? null)}
              </div>
            </div>
          </div>
        </>
      ) : refCookie ? (
        <>
          <h2 className="text-sm font-semibold mb-2">{t('refBanner.cookieDetectedTitle')}</h2>

          <div className="text-xs opacity-70 mb-3">
            {t('refBanner.cookieLinePrefix')} <code>vigri_ref</code> ={' '}
            <span className="font-mono">{refCookie}</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 mb-3">
            <div className="card p-3">
              <div className="text-[11px] opacity-60">{t('refBanner.createdAt')}</div>
              <div className="text-sm font-medium mt-1">
                {fmtDate(inviteeMeta?.emailVerifiedAt ?? null)}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              disabled={!userId || bindStatus === 'doing'}
              onClick={bindFromCookie}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm transition',
                !userId || bindStatus === 'doing'
                  ? 'opacity-60 cursor-not-allowed'
                  : 'hover:bg-black/5 active:scale-[0.99]',
              )}
            >
              {bindStatus === 'doing'
                ? t('refBanner.confirming')
                : t('refBanner.confirm')}
            </button>

            {bindStatus !== 'idle' && (
              <div className={cn('text-sm', bindStatus === 'ok' ? 'text-emerald-700' : 'text-rose-700')}>
                {bindMsg}
              </div>
            )}
          </div>

          {!userId && (
            <div className="text-[11px] opacity-60 mt-2">{t('refBanner.signInHint')}</div>
          )}
        </>
      ) : (
        <>
          <h2 className="text-sm font-semibold mb-2">{t('refBanner.inviterMissingTitle')}</h2>
          <div className="text-xs opacity-70 mb-3">{t('refBanner.inviterMissingHint')}</div>

          <div className="grid grid-cols-1 sm:grid-cols-1 gap-3 mb-3">
            <div className="card p-3">
              <div className="text-[11px] opacity-60">{t('refBanner.createdAt')}</div>
              <div className="text-sm font-medium mt-1">
                {fmtDate(inviteeMeta?.emailVerifiedAt ?? null)}
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setCheckStatus('idle');
                setCheckMsg('');
              }}
              placeholder={t('refBanner.emailPlaceholder')}
              className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
              disabled={!userId}
            />

            <button
              className={cn(
                'btn btn-outline transition-transform duration-150 active:scale-95',
                (!userId || checkStatus === 'checking') &&
                  'opacity-60 cursor-not-allowed active:scale-100',
              )}
              onClick={checkInviterEmail}
              disabled={!userId || checkStatus === 'checking'}
            >
              {checkStatus === 'checking' ? t('refBanner.checking') : t('refBanner.check')}
            </button>
          </div>

          {checkMsg && <div className="text-xs text-rose-700 mt-2">{checkMsg}</div>}

          {checkStatus === 'found' && (
            <div className="mt-3">
              <div className="flex items-center gap-3">
                <button
                  className={cn('btn btn-outline', bindStatus === 'doing' ? 'opacity-60 cursor-not-allowed' : '')}
                  onClick={bindByEmail}
                  disabled={bindStatus === 'doing'}
                >
                  {bindStatus === 'doing' ? t('refBanner.confirming') : t('refBanner.confirm')}
                </button>

                {bindStatus !== 'idle' && (
                  <div className={cn('text-sm', bindStatus === 'ok' ? 'text-emerald-700' : 'text-rose-700')}>
                    {bindMsg}
                  </div>
                )}
              </div>
            </div>
          )}

          {!userId && <div className="text-[11px] opacity-60 mt-2">{t('refBanner.signInHint')}</div>}
        </>
      )}
    </div>
  );
}
