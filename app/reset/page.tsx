// app/reset/page.tsx
'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';

type ResetResp = { ok: boolean; error?: 'weak_password' | 'invalid_token' | string };

export default function ResetPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useI18n();

  // read token from query (backend uses only token)
  const token = sp.get('token') || '';

  // tiny i18n helper with fallback
  const tf = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };

  const [pass, setPass] = useState('');
  const [pass2, setPass2] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  const canSubmit = Boolean(token) && pass.length >= 8 && pass === pass2 && !loading;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!canSubmit) return;

    setLoading(true);
    try {
      const r = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: pass }),
      });
      const j = (await r.json().catch(() => ({ ok: false }))) as ResetResp;

      if (!r.ok || !j.ok) {
        const code = j.error;
        setErr(
          code === 'weak_password'
            ? tf('auth.error_password', 'Password must be at least 8 characters')
            : code === 'invalid_token'
            ? tf('reset.invalid', 'Link is invalid or expired. Request a new one.')
            : tf('auth.error_generic', 'Something went wrong. Try again.')
        );
        setLoading(false);
        return;
      }

      // success
      setOk(true);
      // redirect to login after short delay
      setTimeout(() => {
        router.replace('/?auth=login');
      }, 800);
    } catch {
      setErr(tf('auth.error_generic', 'Something went wrong. Try again.'));
      setLoading(false);
    }
  }

  // basic guard: if no token in query
  if (!token) {
    return (
      <main className="min-h-[60vh] grid place-items-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-lg font-semibold mb-2">
            {tf('reset.title', 'Reset password')}
          </div>
          <div className="text-sm text-zinc-600">
            {tf('reset.missing', 'The link is incomplete. Please use the link from your email.')}
          </div>
          <div className="mt-4">
            <Link href="/" className="btn btn-outline text-sm">
              {tf('back_home', 'Back to home')}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-[60vh] grid place-items-center px-4">
      <div className="max-w-md w-full rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="text-lg font-semibold mb-4">
          {tf('reset.title', 'Reset password')}
        </div>

        {ok ? (
          <div className="rounded-lg border border-green-200 bg-green-50 text-green-800 px-3 py-2 text-sm">
            {tf('reset.ok', 'Password updated. You can sign in now.')}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-xs text-zinc-600 mb-1">
                {tf('auth.password', 'Password')}
              </label>
              <input
                type="password"
                minLength={8}
                required
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
                autoComplete="new-password"
              />
              {pass.length > 0 && pass.length < 8 && (
                <div className="mt-1 text-xs text-red-600">
                  {tf('auth.error_password', 'Password must be at least 8 characters')}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs text-zinc-600 mb-1">
                {tf('password_confirm', 'Repeat password')}
              </label>
              <input
                type="password"
                minLength={8}
                required
                className="w-full border rounded-md px-3 py-2 text-sm"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
                autoComplete="new-password"
              />
              {pass2.length > 0 && pass !== pass2 && (
                <div className="mt-1 text-xs text-red-600">
                  {tf('password_mismatch', 'Passwords do not match')}
                </div>
              )}
            </div>

            {err && <div className="text-sm text-red-600">{err}</div>}

            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full btn btn-primary justify-center disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? tf('auth.loading', 'Please wait…') : tf('reset.submit', 'Set new password')}
            </button>

            <div className="text-xs text-zinc-600">
              {tf('reset.hint', 'After saving, you will be redirected to the sign-in form.')}
            </div>
          </form>
        )}

        <div className="mt-4">
          <Link href="/" className="btn btn-outline text-sm">
            {tf('back_home', 'Back to home')}
          </Link>
        </div>
      </div>
    </main>
  );
}
