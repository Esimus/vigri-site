// app/dashboard/rewards/page.tsx
'use client';

import { useEffect, useState } from 'react';

type MeResp = { ok: boolean; user?: { id: string; email?: string | null; name?: string | null } };

type BalanceResp = {
  ok: boolean;
  balanceEchoUe: number;
  participationScoreUe: number;
  balanceEcho: number;
  participationScore: number;
};

type LogItem = {
  id: string;
  kind: 'referral' | 'purchase' | 'activity' | 'bonus' | 'revoke' | string;
  action: string;
  amountUe: number;
  amount: number;
  bucket?: 'soul' | 'mind' | 'base' | 'heart' | null;
  sourceId?: string | null;
  refUserId?: string | null;
  meta?: Record<string, unknown> | null;
  createdAt: string;
};
type LogResp = { ok: boolean; items: LogItem[]; nextCursor: string | null };

type RefStats = {
  ok: boolean;
  user: { id: string; name: string | null; email: string | null };
  inviter: { id: string; name: string | null; email: string | null } | null;
  referrals: Array<{ id: string; name: string | null; email: string | null; createdAt: string }>;
  count: number;
};

type LevelUser = { id: string; email: string | null; createdAt: string };
type LevelsResp = {
  ok: true;
  userId: string;
  L1: { count: number; users: LevelUser[] };
  L2: { count: number; users: LevelUser[] };
  L3: { count: number; users: LevelUser[] };
};

type OkResp = { ok: true };
type BindResp = { ok: boolean; boundTo?: string; error?: string };

function isRefStats(x: unknown): x is RefStats {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return o.ok === true && typeof o.user === 'object' && typeof o.count === 'number';
}
function isLevels(x: unknown): x is LevelsResp {
  if (typeof x !== 'object' || x === null) return false;
  const o = x as Record<string, unknown>;
  return o.ok === true && typeof o.userId === 'string' && typeof o.L1 === 'object' && typeof o.L2 === 'object' && typeof o.L3 === 'object';
}
function isOkResp(v: unknown): v is OkResp {
  return typeof v === 'object' && v !== null && (v as Record<string, unknown>).ok === true;
}
function isBindResp(v: unknown): v is BindResp {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  const okIsBool = typeof o.ok === 'boolean';
  const boundOk = !('boundTo' in o) || typeof o.boundTo === 'string';
  const errOk = !('error' in o) || typeof o.error === 'string';
  return okIsBool && boundOk && errOk;
}

function formatEcho(n: number) {
  return n.toLocaleString(undefined, { maximumFractionDigits: 4 });
}
function cn(...xs: Array<string | false | null | undefined>) {
  return xs.filter(Boolean).join(' ');
}
function kindColor(kind: string) {
  switch (kind) {
    case 'referral': return 'bg-emerald-100 text-emerald-800';
    case 'purchase': return 'bg-indigo-100 text-indigo-800';
    case 'activity': return 'bg-sky-100 text-sky-800';
    case 'bonus':    return 'bg-amber-100 text-amber-800';
    case 'revoke':   return 'bg-rose-100 text-rose-800';
    default:         return 'bg-gray-100 text-gray-800';
  }
}
function displayName(x: { name: string | null; email: string | null; id: string }) {
  if (x.name && x.name.trim().length > 0) return x.name;
  if (x.email && x.email.includes('@')) return x.email.split('@')[0];
  return x.id.slice(0, 10) + '…';
}

// escape for RegExp (MDN)
function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(new RegExp(`(?:^|; )${escapeRegex(name)}=([^;]*)`));
  return m && typeof m[1] === 'string' ? decodeURIComponent(m[1]) : null;
}

export default function RewardsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [balance, setBalance] = useState<BalanceResp | null>(null);
  const [log, setLog] = useState<LogItem[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const [baseUrl, setBaseUrl] = useState<string>('');
  const [refCookie, setRefCookie] = useState<string | null>(null);

  const [bindStatus, setBindStatus] = useState<'idle' | 'doing' | 'ok' | 'fail'>('idle');
  const [bindMsg, setBindMsg] = useState<string>('');

  const [refStats, setRefStats] = useState<RefStats | null>(null);

  // levels
  const [levels, setLevels] = useState<LevelsResp | null>(null);
  const [showL1, setShowL1] = useState(false);
  const [showL2, setShowL2] = useState(false);
  const [showL3, setShowL3] = useState(false);

  const [devBuyStatus, setDevBuyStatus] = useState<'idle' | 'doing' | 'ok' | 'fail'>('idle');

  async function devBuy(tier: string) {
    setDevBuyStatus('doing');
    try {
      const r = await fetch(`/api/nft/claim?tier=${encodeURIComponent(tier)}`, { method: 'POST' });
      const j: unknown = await r.json().catch(() => ({}));
      if (!r.ok || !isOkResp(j)) {
        setDevBuyStatus('fail');
        return;
      }
      setDevBuyStatus('ok');
      setBindStatus('idle'); // trigger reload
    } catch {
      setDevBuyStatus('fail');
    } finally {
      setTimeout(() => setDevBuyStatus('idle'), 1000);
    }
  }

  // resolve me and detect cookie
  useEffect(() => {
    let cancelled = false;
    async function resolveUser() {
      const sp = new URLSearchParams(window.location.search);
      const override = sp.get('userId');
      if (override) {
        setUserId(override);
      } else {
        try {
          const r = await fetch('/api/me', { cache: 'no-store' });
          const j = (await r.json()) as MeResp;
          if (!cancelled && j.ok && j.user?.id) setUserId(j.user.id);
        } catch { /* ignore */ }
      }
      setBaseUrl(window.location.origin);
      setRefCookie(readCookie('vigri_ref'));
    }
    resolveUser();

    const onVis = () => setRefCookie(readCookie('vigri_ref'));
    document.addEventListener('visibilitychange', onVis);
    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  // auto-bind from referral cookie
  useEffect(() => {
    let cancelled = false;

    async function autoBindIfNeeded() {
      try {
        const ref = readCookie('vigri_ref');
        if (!ref) return;

        const s = await fetch('/api/referral/stats', { cache: 'no-store' });
        const raw: unknown = await s.json().catch(() => ({}));
        if (!s.ok) return;
        if (isRefStats(raw) && raw.inviter) return;

        await fetch('/api/referral/bind', { method: 'POST' }).catch(() => {});
        if (cancelled) return;

        window.location.reload();
      } catch {
        // ignore
      }
    }

    void autoBindIfNeeded();
    return () => { cancelled = true; };
  }, []);

  // load data
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!userId) { setLoading(false); return; }
      setLoading(true);
      setErr(null);
      try {
        const [bRes, lRes, sRes, levRes] = await Promise.all([
          fetch(`/api/echo/balance?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' }),
          fetch(`/api/echo/log?userId=${encodeURIComponent(userId)}&limit=50`, { cache: 'no-store' }),
          fetch(`/api/referral/stats?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' }),
          fetch(`/api/referral/levels?userId=${encodeURIComponent(userId)}`, { cache: 'no-store' }),
        ]);

        const bJson = (await bRes.json()) as BalanceResp & { ok: boolean };
        const lJson = (await lRes.json()) as LogResp;

        let sJson: RefStats | null = null;
        if (sRes.ok) {
          const raw = await sRes.json().catch(() => null);
          if (isRefStats(raw)) sJson = raw;
        }

        let levJson: LevelsResp | null = null;
        if (levRes.ok) {
          const rawLev = await levRes.json().catch(() => null);
          if (isLevels(rawLev)) levJson = rawLev;
        }

        if (!cancelled) {
          if (!bJson.ok) throw new Error('balance_error');
          if (!lJson.ok) throw new Error('log_error');
          setBalance(bJson);
          setLog(lJson.items);
          setRefStats(sJson);
          setLevels(levJson);
          setLoading(false);
        }
      } catch (e: unknown) {
        if (!cancelled) {
          const msg = e instanceof Error ? e.message : 'load_error';
          setErr(msg);
          setLoading(false);
        }
      }
    }
    load();
    return () => { cancelled = true; };
  }, [userId, bindStatus]);

  const referralUrl = userId ? `${baseUrl}/?ref=${encodeURIComponent(userId)}` : '';

  async function handleBind() {
    if (!userId) return;
    setBindStatus('doing');
    setBindMsg('');
    try {
      const r = await fetch(`/api/referral/bind?userId=${encodeURIComponent(userId)}`, { method: 'POST' });
      const j: unknown = await r.json().catch(() => ({}));
      if (!r.ok || !isBindResp(j) || !j.ok) {
        setBindStatus('fail');
        setBindMsg(isBindResp(j) && j.error ? j.error : 'bind_failed');
      } else {
        setBindStatus('ok');
        setBindMsg(j.boundTo ? `bound to ${j.boundTo}` : 'bound');
      }
    } catch {
      setBindStatus('fail');
      setBindMsg('bind_failed');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">Rewards</h1>
        </div>
        {!userId && (
          <div className="text-xs opacity-70">
            Dev: add <code>?userId=...</code> to preview a specific user
          </div>
        )}
      </div>

      {/* Summary */}
      <div className="rounded-2xl border p-5 bg-white/60 backdrop-blur-md">
        {loading ? (
          <div className="animate-pulse text-sm opacity-60">Loading…</div>
        ) : err ? (
          <div className="text-sm text-rose-700">Failed to load: {err}</div>
        ) : !userId ? (
          <div className="text-sm opacity-70">Sign in to see your rewards.</div>
        ) : balance ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border p-4 bg-white/70">
              <div className="text-xs opacity-60">Echo balance</div>
              <div className="text-2xl font-semibold mt-1">
                {formatEcho(balance.balanceEcho)} <span className="text-base font-normal opacity-70">echo</span>
              </div>
              <div className="text-[11px] opacity-60 mt-1">{balance.balanceEchoUe.toLocaleString()} uecho</div>
            </div>
            <div className="rounded-xl border p-4 bg-white/70">
              <div className="text-xs opacity-60">Participation score</div>
              <div className="text-2xl font-semibold mt-1">
                {formatEcho(balance.participationScore)} <span className="text-base font-normal opacity-70">echo</span>
              </div>
              <div className="text-[11px] opacity-60 mt-1">{balance.participationScoreUe.toLocaleString()} uecho</div>
            </div>
            <div className="rounded-xl border p-4 bg-white/70">
              <div className="text-xs opacity-60">User</div>
              {refStats?.user ? (
                <>
                  <div className="text-base font-semibold mt-1">{displayName(refStats.user)}</div>
                  <div className="text-[11px] opacity-60 break-all mt-1">{refStats.user.email ?? '—'}</div>
                  <div className="text-[11px] opacity-40 break-all mt-1">{refStats.user.id}</div>
                </>
              ) : (
                <div className="text-sm opacity-70 mt-1">{userId}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm opacity-70">No data.</div>
        )}
      </div>

      {/* Inviter */}
      {refStats?.inviter && (
        <div className="rounded-2xl border p-5 bg-white/60 backdrop-blur-md">
          <h2 className="text-sm font-semibold mb-2">Invited by</h2>
          <div className="flex items-start justify-between">
            <div>
              <div className="text-base font-medium">{displayName(refStats.inviter)}</div>
              {refStats.inviter.email && <div className="text-[11px] opacity-60">{refStats.inviter.email}</div>}
              <div className="text-[11px] opacity-40 break-all">{refStats.inviter.id}</div>
            </div>
          </div>
        </div>
      )}

      {/* My referral link */}
      <div className="rounded-2xl border p-5 bg-white/60 backdrop-blur-md">
        <h2 className="text-sm font-semibold mb-2">My referral link</h2>
        {!userId ? (
          <div className="text-sm opacity-70">Sign in to get your referral link.</div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="text-sm break-all rounded-xl border px-3 py-2 bg-white/70">{referralUrl || '...'}</div>
            <div className="text-xs opacity-70">
              Anyone who opens this link will get a <code>vigri_ref</code> cookie for 90 days.
            </div>
            <div>
              <button
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-black/5 active:scale-[0.99] transition"
                onClick={() => referralUrl && navigator.clipboard.writeText(referralUrl)}
              >
                Copy link
              </button>
            </div>
          </div>
        )}
      </div>

      {userId && (
        <div className="rounded-2xl border p-5 bg-white/60 backdrop-blur-md">
          <h2 className="text-sm font-semibold mb-2">DEV · Simulate purchase</h2>
          <div className="flex flex-wrap gap-8">
            <div className="space-y-2">
              <div className="text-xs opacity-60">Base</div>
              <button
                disabled={devBuyStatus === 'doing'}
                onClick={() => devBuy('Base')}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50"
              >
                Buy Base
              </button>
            </div>
            <div className="space-y-2">
              <div className="text-xs opacity-60">Gold</div>
              <button
                disabled={devBuyStatus === 'doing'}
                onClick={() => devBuy('Gold')}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50"
              >
                Buy Gold
              </button>
            </div>
            <div className="space-y-2">
              <div className="text-xs opacity-60">Platinum</div>
              <button
                disabled={devBuyStatus === 'doing'}
                onClick={() => devBuy('Platinum')}
                className="rounded-lg border px-3 py-1.5 text-sm hover:bg-black/5 disabled:opacity-50"
              >
                Buy Platinum
              </button>
            </div>
          </div>
          {devBuyStatus === 'doing' && <div className="mt-2 text-xs opacity-70">Processing…</div>}
          {devBuyStatus === 'ok' && <div className="mt-2 text-xs text-emerald-700">Done.</div>}
          {devBuyStatus === 'fail' && <div className="mt-2 text-xs text-rose-700">Failed.</div>}
        </div>
      )}

      {/* DEV: bind referral from cookie */}
      {userId && refCookie && (
        <div className="rounded-2xl border p-5 bg-white/60 backdrop-blur-md">
          <h2 className="text-sm font-semibold mb-2">Referral cookie detected</h2>
          <div className="text-xs opacity-70 mb-2">
            Cookie <code>vigri_ref</code> = <span className="font-mono">{refCookie}</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              disabled={bindStatus === 'doing'}
              onClick={handleBind}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-sm transition',
                bindStatus === 'doing' ? 'opacity-60 cursor-not-allowed' : 'hover:bg-black/5 active:scale-[0.99]'
              )}
            >
              {bindStatus === 'doing' ? 'Binding…' : 'Bind now'}
            </button>
            {bindStatus !== 'idle' && (
              <div
                className={cn(
                  'text-sm',
                  bindStatus === 'ok' ? 'text-emerald-700' : bindStatus === 'fail' ? 'text-rose-700' : 'opacity-70'
                )}
              >
                {bindMsg}
              </div>
            )}
          </div>
          <div className="text-[11px] opacity-60 mt-2">
            DEV only: this binds your account to the inviter stored in cookie.
          </div>
        </div>
      )}

      {/* Referral levels */}
      {levels && (
        <div className="rounded-2xl border p-5 bg-white/60 backdrop-blur-md">
          <h2 className="text-sm font-semibold mb-3">Referral levels</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-xl border p-4 bg-white/70">
              <div className="text-xs opacity-60">Level 1</div>
              <div className="text-2xl font-semibold mt-1">{levels.L1.count}</div>
              <button
                className="mt-2 rounded-lg border px-2 py-1 text-xs hover:bg-black/5"
                onClick={() => setShowL1((v) => !v)}
              >
                {showL1 ? 'Hide list' : 'Show last 25'}
              </button>
              {showL1 && (
                <ul className="mt-2 max-h-60 overflow-auto divide-y">
                  {levels.L1.users.map(u => (
                    <li key={u.id} className="py-2 text-xs">
                      <div className="font-medium">{u.email ?? u.id.slice(0, 10) + '…'}</div>
                      <div className="opacity-60 break-all">{u.id}</div>
                      <div className="opacity-60">{new Date(u.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border p-4 bg-white/70">
              <div className="text-xs opacity-60">Level 2</div>
              <div className="text-2xl font-semibold mt-1">{levels.L2.count}</div>
              <button
                className="mt-2 rounded-lg border px-2 py-1 text-xs hover:bg-black/5"
                onClick={() => setShowL2((v) => !v)}
              >
                {showL2 ? 'Hide list' : 'Show last 25'}
              </button>
              {showL2 && (
                <ul className="mt-2 max-h-60 overflow-auto divide-y">
                  {levels.L2.users.map(u => (
                    <li key={u.id} className="py-2 text-xs">
                      <div className="font-medium">{u.email ?? u.id.slice(0, 10) + '…'}</div>
                      <div className="opacity-60 break-all">{u.id}</div>
                      <div className="opacity-60">{new Date(u.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="rounded-xl border p-4 bg-white/70">
              <div className="text-xs opacity-60">Level 3</div>
              <div className="text-2xl font-semibold mt-1">{levels.L3.count}</div>
              <button
                className="mt-2 rounded-lg border px-2 py-1 text-xs hover:bg-black/5"
                onClick={() => setShowL3((v) => !v)}
              >
                {showL3 ? 'Hide list' : 'Show last 25'}
              </button>
              {showL3 && (
                <ul className="mt-2 max-h-60 overflow-auto divide-y">
                  {levels.L3.users.map(u => (
                    <li key={u.id} className="py-2 text-xs">
                      <div className="font-medium">{u.email ?? u.id.slice(0, 10) + '…'}</div>
                      <div className="opacity-60 break-all">{u.id}</div>
                      <div className="opacity-60">{new Date(u.createdAt).toLocaleString()}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Echo history */}
      <div className="rounded-2xl border p-5 bg-white/60 backdrop-blur-md">
        <h2 className="text-sm font-semibold">Echo history</h2>
        {loading ? (
          <div className="mt-3 space-y-2">
            <div className="h-5 w-2/3 bg-black/5 rounded animate-pulse" />
            <div className="h-5 w-1/2 bg-black/5 rounded animate-pulse" />
            <div className="h-5 w-3/4 bg-black/5 rounded animate-pulse" />
          </div>
        ) : log && log.length > 0 ? (
          <ul className="mt-3 divide-y">
            {log.map((row) => {
              const isMinus = row.amount < 0;
              const when = new Date(row.createdAt);
              return (
                <li key={row.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium', kindColor(row.kind))}>
                        {row.kind}
                      </span>
                      <span className="text-xs opacity-70">{row.action}</span>
                    </div>
                    <div className="text-xs opacity-60 mt-1">{when.toLocaleString()}</div>
                    {(row.bucket || row.refUserId || row.sourceId) && (
                      <div className="text-[11px] opacity-60 mt-1 space-x-2">
                        {row.bucket && <span>bucket: {row.bucket}</span>}
                        {row.refUserId && <span>refUser: {row.refUserId}</span>}
                        {row.sourceId && <span>source: {row.sourceId}</span>}
                      </div>
                    )}
                  </div>
                  <div className={cn('shrink-0 text-right text-sm font-semibold', isMinus ? 'text-rose-700' : 'text-emerald-700')}>
                    {isMinus ? '-' : '+'}{formatEcho(Math.abs(row.amount))} <span className="font-normal opacity-70">echo</span>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm opacity-70 mt-3">No records yet.</div>
        )}
      </div>
    </div>
  );
}
