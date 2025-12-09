// components/AuthModal.tsx
'use client';

import { useEffect, useRef, useState, useCallback, type FormEvent } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';

type Mode = 'login' | 'signup' | 'forgot' | 'reset' | null;

type ApiOk = { ok: true };
type ApiFail = { ok: false; error?: string };
type ApiResp = ApiOk | ApiFail;

function hasOk(v: unknown): v is ApiResp {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.ok === 'boolean';
}
function getErrorCode(v: unknown): string | undefined {
  if (typeof v !== 'object' || v === null) return undefined;
  const r = v as Record<string, unknown>;
  return typeof r.error === 'string' ? r.error : undefined;
}

export default function AuthModal() {
  const { t } = useI18n();
  const sp = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  const tf = (k: string, fb: string) => {
    const v = t(k);
    return v === k ? fb : v;
  };

  const mode = (sp.get('auth') as Mode) ?? null;
  const isSignup = mode === 'signup';
  const isForgot = mode === 'forgot';
  const isReset = mode === 'reset';
  const resetToken = sp.get('token')?.trim() || null;

  const open = mode === 'login' || isSignup || isForgot || isReset;

  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  const [forgotSent, setForgotSent] = useState(false);
  const [resetDone, setResetDone] = useState(false);

  const [acceptTerms, setAcceptTerms] = useState(false);
  const [acceptTouched, setAcceptTouched] = useState(false);

  const panelRef = useRef<HTMLDivElement | null>(null);
  const firstInputRef = useRef<HTMLInputElement | null>(null);
  const prevFocusRef = useRef<HTMLElement | null>(null);
  const titleId = 'auth-modal-title';

  const [emailTouched, setEmailTouched] = useState(false);
  const [passTouched, setPassTouched] = useState(false);
  const [confirmTouched, setConfirmTouched] = useState(false);

  const isEmailValid = (() => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;
    return re.test(email.trim());
  })();
  const isPassValid = pass.trim().length >= 8;
  const isConfirmValid =
    (isSignup || isReset) ? (confirm === pass && confirm.trim().length >= 8) : true;
  const confirmMismatch =
    (isSignup || isReset) && confirmTouched && confirm.length > 0 && confirm !== pass;

  const passTooShort = pass.length > 0 && pass.length < 8;
  const passHelp =
    pass.length === 0
      ? tf(
          'auth.password_rules',
          'Use at least 8 characters. Letters, numbers, and symbols !@#$%^&*_-'
        )
      : passTooShort
      ? tf('auth.password_too_short', 'Minimum 8 characters')
      : '';

  const requiresAccept = isSignup;
  const isAcceptValid = !requiresAccept || acceptTerms;

  const canSubmitAuth =
    isEmailValid &&
    isPassValid &&
    isConfirmValid &&
    isAcceptValid &&
    !loading &&
    !isReset &&
    !isForgot;
  const canSubmitForgot = isEmailValid && !loading && isForgot;
  const canSubmitReset = isPassValid && isConfirmValid && !loading && isReset && !!resetToken;

  const setMode = useCallback(
    (m: Exclude<Mode, null> | null) => {
      const params = new URLSearchParams(sp.toString());
      if (m) params.set('auth', m);
      else params.delete('auth');
      if (m !== 'reset') params.delete('token');
      const href = params.size ? `${pathname}?${params}` : pathname;
      router.replace(href, { scroll: false });
    },
    [sp, pathname, router]
  );

  const close = useCallback(() => setMode(null), [setMode]);

  useEffect(() => {
    if (!open) return;
    prevFocusRef.current =
      (typeof document !== 'undefined'
        ? (document.activeElement as HTMLElement)
        : null) || null;

    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onEsc);

    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;

    const supportsGutter =
      typeof CSS !== 'undefined' &&
      typeof CSS.supports === 'function' &&
      CSS.supports('scrollbar-gutter: stable');

    if (!supportsGutter) {
      const sbw = window.innerWidth - document.documentElement.clientWidth;
      if (sbw > 0) document.body.style.paddingRight = `${sbw}px`;
    }
    document.body.style.overflow = 'hidden';

    setTimeout(() => {
      if (firstInputRef.current) firstInputRef.current.focus();
      else panelRef.current?.focus();
    }, 0);

    const trap = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !panelRef.current) return;
      const sel = [
        'a[href]',
        'button:not([disabled])',
        'textarea:not([disabled])',
        'input:not([disabled])',
        'select:not([disabled])',
        '[tabindex]:not([tabindex="-1"])',
      ].join(',');
      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(sel)
      ).filter((el) => el.offsetParent !== null);
      if (focusables.length === 0) return;
      const first = focusables[0] as HTMLElement | undefined;
      const last = focusables[focusables.length - 1] as HTMLElement | undefined;
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey) {
        if (active === first || !panelRef.current.contains(active)) {
          e.preventDefault();
          if (last) last.focus();
        }
      } else {
        if (active === last || !panelRef.current.contains(active)) {
          e.preventDefault();
          if (first) first.focus();
        }
      }
    };
    document.addEventListener('keydown', trap, true);

    return () => {
      document.removeEventListener('keydown', onEsc);
      document.removeEventListener('keydown', trap, true);
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;

      if (prevFocusRef.current) {
        try {
          prevFocusRef.current.focus();
        } catch {}
      }

      setEmail('');
      setPass('');
      setConfirm('');
      setErr(null);
      setCanResend(false);
      setResending(false);
      setForgotSent(false);
      setResetDone(false);
      setLoading(false);
      setEmailTouched(false);
      setPassTouched(false);
      setConfirmTouched(false);
      setAcceptTerms(false);
      setAcceptTouched(false);
    };
  }, [open, close]);

  if (!open) return null;

  const title = isSignup
    ? tf('auth.signup_title', 'Create account')
    : isForgot
    ? tf('auth.forgot_title', 'Reset password')
    : isReset
    ? tf('auth.reset_title', 'Set a new password')
    : tf('auth.login_title', 'Sign in');

  const submitLabel = isSignup
    ? tf('auth.signup_submit', 'Create account')
    : isForgot
    ? tf('auth.forgot_submit', 'Send reset link')
    : isReset
    ? tf('auth.reset_submit', 'Save new password')
    : tf('auth.login_submit', 'Continue');

  const altLinkLabel =
    mode === 'signup'
      ? tf('auth.have_account', 'Have an account? Sign in')
      : mode === 'login'
      ? tf('auth.no_account', "Don't have an account? Create one")
      : tf('auth.back_to_login', 'Back to sign in');

  async function resendVerify() {
    setResending(true);
    try {
      await fetch('/api/auth/request-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      window.location.replace('/?verify=sent');
    } finally {
      setResending(false);
    }
  }

  async function onSubmitAuth(e: FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    setPassTouched(true);
    if (isSignup) {
      setConfirmTouched(true);
      setAcceptTouched(true);
    }
    setErr(null);
    setCanResend(false);

    if (!canSubmitAuth) return;

    setLoading(true);
    try {
      const url = isSignup ? '/api/auth/signup' : '/api/auth/login';
      const r = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass }),
      });
      const j: unknown = await r.json().catch(() => ({} as unknown));

      if (!r.ok || !hasOk(j) || !j.ok) {
        if (r.status === 429 || getErrorCode(j) === 'rate_limited') {
          const ra = parseInt(r.headers.get('Retry-After') ?? '0', 10);
          const n = Number.isFinite(ra) && ra > 0 ? ra : 60;
          setErr(
            tf(
              'auth.rate_limited',
              'Too many attempts. Please wait {n} seconds and try again.'
            ).replace('{n}', String(n))
          );
          setLoading(false);
          return;
        }

        const code = getErrorCode(j);
        if (code === 'email_unverified') setCanResend(true);

        setErr(
          code === 'email_taken'
            ? tf('auth.email_taken', 'Email is already registered')
            : code === 'weak_password'
            ? tf('auth.error_password', 'Password must be at least 8 characters')
            : code === 'email_unverified'
            ? tf('auth.email_unverified', 'Please verify your email to sign in.')
            : code === 'invalid_creds'
            ? tf('auth.error_invalid', 'Invalid email or password')
            : tf('auth.error_generic', 'Something went wrong. Try again.')
        );
        setLoading(false);
        return;
      }

      if (isSignup) {
        window.location.replace('/?verify=sent');
      } else {
        // === THE ONLY CHANGE: set one-shot post-login flag ===
        try {
          sessionStorage.setItem('vigri_postlogin', '1');
        } catch {}
        window.location.replace('/dashboard');
      }
    } catch {
      setErr(tf('auth.error_generic', 'Something went wrong. Try again.'));
      setLoading(false);
    }
  }

  async function onSubmitForgot(e: FormEvent) {
    e.preventDefault();
    setEmailTouched(true);
    setErr(null);
    if (!canSubmitForgot) return;

    setLoading(true);
    try {
      await fetch('/api/auth/request-reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setForgotSent(true);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitReset(e: FormEvent) {
    e.preventDefault();
    setPassTouched(true);
    setConfirmTouched(true);
    setErr(null);
    if (!canSubmitReset) return;

    setLoading(true);
    try {
      const r = await fetch('/api/auth/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: resetToken, password: pass }),
      });
      const j: unknown = await r.json().catch(() => ({} as unknown));

      if (!r.ok || !hasOk(j) || !j.ok) {
        const code = getErrorCode(j);
        setErr(
          code === 'weak_password'
            ? tf('auth.error_password', 'Password must be at least 8 characters')
            : code === 'invalid_token'
            ? tf('verify_invalid', 'Link is invalid or expired. Request a new email.')
            : tf('auth.error_generic', 'Something went wrong. Try again.')
        );
        setLoading(false);
        return;
      }

      setResetDone(true);
    } catch {
      setErr(tf('auth.error_generic', 'Something went wrong. Try again.'));
    } finally {
      setLoading(false);
    }
  }

  const emailInput = (
    <div>
      <label className="label">
        {tf('auth.email', 'Email')}
      </label>
      <input
        ref={firstInputRef}
        type="email"
        required
        className="input"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onBlur={() => setEmailTouched(true)}
        autoComplete={isSignup ? 'email' : 'username'}
        aria-invalid={emailTouched && !isEmailValid}
        aria-describedby="auth-email-help"
      />
      {emailTouched && !isEmailValid && (
        <div id="auth-email-help" className="form-error">
          {tf('auth.error_email', 'Please enter a valid email')}
        </div>
      )}
    </div>
  );

  const passwordInput = (
    <div>
      <label className="label">
        {tf('auth.password', 'Password')}
      </label>
      <div className="relative">
        <input
          type={showPass ? 'text' : 'password'}
          required
          minLength={8}
          className="input pr-10 appearance-none"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
          onBlur={() => setPassTouched(true)}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          aria-invalid={passTouched && !isPassValid}
          aria-describedby="auth-pass-help"
        />
        <button
          type="button"
          onClick={() => setShowPass((v) => !v)}
          className="absolute inset-y-0 right-2 flex items-center px-2 text-zinc-500 hover:text-zinc-700
                     focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-opacity-30 rounded-md"
          aria-label={
            showPass
              ? tf('auth.hide_password', 'Hide password')
              : tf('auth.show_password', 'Show password')
          }
          tabIndex={0}
        >
          {showPass ? (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.29 20.29 0 0 1 5.06-5.94" />
              <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
              <path d="M3 3l18 18" />
              <path d="M10.73 5.08A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.29 20.29 0 0 1-2.56 3.57" />
            </svg>
          )}
        </button>
      </div>
      {passHelp && (
        <p
          id="auth-pass-help"
          className={`mt-1 text-xs ${passTooShort ? 'text-red-600' : 'text-zinc-500'}`}
        >
          {passHelp}
        </p>
      )}
      {mode === 'login' && (
        <div className="mt-2 text-right">
          <button
            type="button"
            onClick={() => setMode('forgot')}
            className="text-xs text-zinc-600 hover:text-zinc-900 hover:underline"
          >
            {tf('auth.forgot', 'Forgot password?')}
          </button>
        </div>
      )}
    </div>
  );

  const confirmInput =
    isSignup || isReset ? (
      <div>
        <label className="label">
          {tf('auth.password_confirm', 'Repeat password')}
        </label>
        <div className="relative">
          <input
            type={showPass ? 'text' : 'password'}
            required
            minLength={8}
            className="input pr-10 appearance-none"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onBlur={() => setConfirmTouched(true)}
            autoComplete="new-password"
            aria-invalid={confirmTouched && !isConfirmValid}
            aria-describedby="auth-pass-confirm-help"
          />
          <button
            type="button"
            onClick={() => setShowPass((v) => !v)}
            className="absolute inset-y-0 right-2 flex items-center px-2 text-zinc-500 hover:text-zinc-700
                       focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-opacity-30 rounded-md"
            aria-label={
              showPass
                ? tf('auth.hide_password', 'Hide password')
                : tf('auth.show_password', 'Show password')
            }
            tabIndex={0}
          >
            {showPass ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a20.29 20.29 0 0 1 5.06-5.94" />
                <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                <path d="M3 3l18 18" />
                <path d="M10.73 5.08A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a20.29 20.29 0 0 1-2.56 3.57" />
              </svg>
            )}
          </button>
        </div>
        <div
          id="auth-pass-confirm-help"
          className={`mt-1 text-xs ${confirmMismatch ? 'text-red-600' : 'text-zinc-500'}`}
        >
          {confirmMismatch
            ? tf('auth.password_mismatch', 'Passwords do not match')
            : tf('auth.password_confirm_hint', 'Repeat your password to avoid mistakes')}
        </div>
      </div>
    ) : null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px]" onClick={close} aria-hidden />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          tabIndex={-1}
          className="w-full max-w-sm overflow-hidden rounded-3xl
                      card backdrop-blur-sm
                      shadow-2xl ring-1 ring-black/40 dark:ring-white/10
                      outline-none"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800/60 bg-[color:var(--card)]">
            <div id={titleId} className="text-lg font-semibold">
              {title}
            </div>
            <button
              onClick={close}
              className="rounded-lg p-2.5 text-zinc-500 hover:bg-zinc-100/70 dark:hover:bg-zinc-800/60
                         focus:outline-none focus:ring-2 focus:ring-[var(--brand-600)] focus:ring-opacity-30"
              aria-label="Close"
              type="button"
            >
              ✕
            </button>
          </div>

          {isForgot ? (
            <form onSubmit={onSubmitForgot} className="px-5 py-5 space-y-4">
              {forgotSent ? (
                <>
                  <div className="rounded-lg px-3 py-2 text-sm bg-blue-50 text-blue-700">
                    {tf(
                      'auth.reset_info',
                      'If this email is registered, we’ve sent a password reset link. Please check your inbox and Spam. The link is valid for 1 hour.'
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setMode('login')} className="btn btn-primary">
                      {tf('auth.back_to_login', 'Back to sign in')}
                    </button>
                    <button type="button" onClick={close} className="btn">
                      {tf('back_home', 'Back to home')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {emailInput}
                  {err && <div className="text-sm text-red-600">{err}</div>}
                  <button
                    type="submit"
                    disabled={!canSubmitForgot}
                    className="w-full btn btn-primary justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? tf('auth.loading', 'Please wait…') : submitLabel}
                  </button>
                  <div className="text-xs text-center text-zinc-600 dark:text-zinc-400">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="hover:underline"
                    >
                      {altLinkLabel}
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : isReset ? (
            <form onSubmit={onSubmitReset} className="px-5 py-5 space-y-4">
              {!resetDone ? (
                <>
                  {passwordInput}
                  {confirmInput}
                  {err && <div className="text-sm text-red-600">{err}</div>}
                  <button
                    type="submit"
                    disabled={!canSubmitReset}
                    className="w-full btn btn-primary justify-center disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {loading ? tf('auth.loading', 'Please wait…') : submitLabel}
                  </button>
                  <div className="text-xs text-center text-zinc-600 dark:text-zinc-400">
                    <button
                      type="button"
                      onClick={() => setMode('login')}
                      className="hover:underline"
                    >
                      {tf('auth.back_to_login', 'Back to sign in')}
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="rounded-lg px-3 py-2 text-sm bg-green-50 text-green-700">
                    {tf('auth.reset_done', 'Password has been changed. You can sign in now.')}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setMode('login')} className="btn btn-primary">
                      {tf('auth.back_to_login', 'Back to sign in')}
                    </button>
                    <button type="button" onClick={close} className="btn">
                      {tf('back_home', 'Back to home')}
                    </button>
                  </div>
                </>
              )}
            </form>
          ) : (
            <form onSubmit={onSubmitAuth} className="px-5 py-5 space-y-4">
              {emailInput}
              {passwordInput}
              {confirmInput}

              {isSignup && (
                <div className="space-y-1">
                  <div className="flex items-start gap-2">
                    <input
                      id="auth-accept"
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-zinc-400 bg-white
                                  accent-[color:var(--brand-600)]
                                  focus:ring-[var(--brand-600)] focus:ring-opacity-40"
                      checked={acceptTerms}
                      onChange={(e) => setAcceptTerms(e.target.checked)}
                      onBlur={() => setAcceptTouched(true)}
                    />
                    <label
                      htmlFor="auth-accept"
                      className="text-xs text-zinc-600 dark:text-zinc-400"
                    >
                      {tf(
                        'auth.accept_terms',
                        'I confirm that I have read and agree to the Vigri Terms of Use and Privacy Policy.'
                      )}{' '}
                      <a
                        href="/terms"
                        className="underline hover:no-underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {tf('nav.terms', 'Terms of Use')}
                      </a>{' '}
                      {tf('auth.and', 'and')}{' '}
                      <a
                        href="/privacy"
                        className="underline hover:no-underline"
                        target="_blank"
                        rel="noreferrer"
                      >
                        {tf('nav.privacy', 'Privacy Policy')}
                      </a>
                      .
                    </label>
                  </div>
                  {acceptTouched && !isAcceptValid && (
                    <p className="text-xs text-red-600">
                      {tf(
                        'auth.accept_required',
                        'You must agree to the terms to continue.'
                      )}
                    </p>
                  )}
                </div>
              )}

              {err && (
                <div className="text-sm text-red-600">
                  {err}
                  {canResend && (
                    <div className="mt-2">
                      <button
                        type="button"
                        onClick={resendVerify}
                        disabled={resending}
                        className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm
                                   bg-white/70 hover:bg-white/90 border border-red-300 text-red-700
                                   disabled:opacity-60 disabled:cursor-not-allowed"
                      >
                        {resending ? (
                          <svg
                            className="mr-2 h-4 w-4 animate-spin"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                              opacity="0.25"
                            />
                            <path
                              d="M22 12a10 10 0 0 1-10 10"
                              stroke="currentColor"
                              strokeWidth="4"
                              fill="none"
                            />
                          </svg>
                        ) : null}
                        {tf('auth.resend', 'Send again')}
                      </button>
                    </div>
                  )}
                </div>
              )}
              <button
                type="submit"
                disabled={!canSubmitAuth}
                className="w-full btn btn-primary justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? tf('auth.loading', 'Please wait…') : submitLabel}
              </button>
              <div className="text-xs text-center text-zinc-600 dark:text-zinc-400">
                {mode === 'signup' ? (
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="hover:underline"
                  >
                    {altLinkLabel}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setMode('signup')}
                    className="hover:underline"
                  >
                    {altLinkLabel}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
