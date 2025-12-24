// components/CookieConsent.tsx
'use client';

import { useMemo, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';
import {
  defaultConsent,
  setConsentCookieClient,
  ConsentState,
} from '@/lib/cookieConsent';

/** Minimal fallback strings (EN) so the banner renders even without i18n */
const fallback: Record<string, string> = {
  'common.cookies.title': 'This website uses cookies',
  'common.cookies.body':
    'We use cookies to improve the user experience. By using our site you agree to the use of cookies in accordance with our Cookie Policy.',
  'common.cookies.required': 'Necessary',
  'common.cookies.required_desc':
    'Required for the website to function properly. This category cannot be disabled.',
  'common.cookies.analytics': 'Analytics',
  'common.cookies.analytics_desc': 'Helps us understand how the website is used.',
  'common.cookies.marketing': 'Targeting/Marketing',
  'common.cookies.marketing_desc': 'Used to deliver relevant ads or measure campaigns.',
  'common.cookies.functional': 'Functional',
  'common.cookies.functional_desc': 'Remembers choices and improves functionality.',
  'common.cookies.unclassified': 'Unclassified',
  'common.cookies.unclassified_desc': 'Cookies that are being classified.',
  'common.cookies.accept_all': 'Accept all',
  'common.cookies.reject_all': 'Reject all',
  'common.cookies.save': 'Save selection',
  'common.cookies.read_more': 'Read more',
  'common.cookies.footer_hint':
    'You can change your choice later in your browser settings.',
};

/** Normalize i18n hook result to a translator function */
function normalizeT(i18n: unknown): (key: string) => string {
  if (typeof i18n === 'function') {
    return i18n as (k: string) => string;
  }
  if (
    i18n &&
    typeof i18n === 'object' &&
    typeof (i18n as { t?: unknown }).t === 'function'
  ) {
    return (i18n as { t: (k: string) => string }).t;
  }
  return (key: string) => fallback[key] ?? key;
}

/** Fire DOM event so the app can react (e.g., init analytics after consent) */
function notifyConsentChange(state: ConsentState) {
  window.dispatchEvent(
    new CustomEvent<ConsentState>('vigri:cookie-consent', { detail: state }),
  );
}

function Category(props: {
  label: string;
  description: string;
  checked?: boolean;
  disabled?: boolean;
  onChange?: (v: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-neutral-800 p-3">
      <input
        type="checkbox"
        className="mt-1 h-4 w-4"
        checked={props.checked}
        disabled={props.disabled}
        onChange={(e) => props.onChange?.(e.target.checked)}
      />
      <div>
        <div className="text-sm font-medium">
          {props.label}
          {props.disabled ? ' • ' : ''}
          {props.disabled ? (
            <span className="text-[11px] text-neutral-400">(always on)</span>
          ) : null}
        </div>
        <div className="text-xs text-neutral-300">{props.description}</div>
      </div>
    </label>
  );
}

export default function CookieConsent() {
  // Unconditional hook call satisfies react-hooks rules
  const i18n = useI18n();
  const t = normalizeT(i18n);

  const [state, setState] = useState<ConsentState>(() => defaultConsent());
  const [open, setOpen] = useState(true);

  const allOptionalOn = useMemo(
    () =>
      state.categories.analytics &&
      state.categories.marketing &&
      state.categories.functional &&
      state.categories.unclassified,
    [state],
  );

  function setCat<K extends keyof ConsentState['categories']>(k: K, v: boolean) {
    if (k === 'necessary') return; // not toggleable
    setState((s) => ({ ...s, categories: { ...s.categories, [k]: v } }));
  }

  function acceptAll() {
    const next: ConsentState = {
      ...state,
      ts: Math.floor(Date.now() / 1000),
      categories: {
        ...state.categories,
        analytics: true,
        marketing: true,
        functional: true,
        unclassified: true,
      },
    };
    setConsentCookieClient(next);
    notifyConsentChange(next);
    setOpen(false);
  }

  function rejectAll() {
    const next = defaultConsent();
    setConsentCookieClient(next);
    notifyConsentChange(next);
    setOpen(false);
  }

  function saveSelection() {
    const next: ConsentState = { ...state, ts: Math.floor(Date.now() / 1000) };
    setConsentCookieClient(next);
    notifyConsentChange(next);
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 p-4">
      <div className="w-full sm:max-w-md rounded-2xl bg-neutral-900 text-neutral-400 shadow-2xl">
        <div className="p-5">
          <div className="mb-3 text-lg font-semibold">{t('common.cookies.title')}</div>
        <p className="text-sm text-neutral-500">{t('common.cookies.body')}</p>

          <div className="mt-4 space-y-2">
            <Category
              label={t('common.cookies.required')}
              description={t('common.cookies.required_desc')}
              checked
              disabled
            />
            <Category
              label={t('common.cookies.analytics')}
              description={t('common.cookies.analytics_desc')}
              checked={state.categories.analytics}
              onChange={(v) => setCat('analytics', v)}
            />
            <Category
              label={t('common.cookies.marketing')}
              description={t('common.cookies.marketing_desc')}
              checked={state.categories.marketing}
              onChange={(v) => setCat('marketing', v)}
            />
            <Category
              label={t('common.cookies.functional')}
              description={t('common.cookies.functional_desc')}
              checked={state.categories.functional}
              onChange={(v) => setCat('functional', v)}
            />
            <Category
              label={t('common.cookies.unclassified')}
              description={t('common.cookies.unclassified_desc')}
              checked={state.categories.unclassified}
              onChange={(v) => setCat('unclassified', v)}
            />
          </div>

          <div className="mt-5 flex flex-col sm:flex-row gap-2">
            <button
              onClick={rejectAll}
              className="w-full sm:w-auto rounded-xl border border-neutral-700 px-4 py-2 text-sm hover:bg-neutral-800"
            >
              {t('common.cookies.reject_all')}
            </button>
            <button
              onClick={saveSelection}
              className="w-full sm:w-auto rounded-xl border border-brand-600 text-brand-50 bg-brand-600 px-4 py-2 text-sm hover:opacity-90"
            >
              {t('common.cookies.save')}
            </button>
            <button
              onClick={acceptAll}
              className="w-full sm:w-auto rounded-xl border border-neutral-700 px-4 py-2 text-sm font-medium hover:opacity-90
                        bg-zinc-200 text-neutral-900
                        dark:bg-zinc-800 dark:text-neutral-50 dark:border-zinc-400"
            >
              {t('common.cookies.accept_all')}
            </button>
          </div>

          <div className="mt-3">
            <a
              href="/privacy"
              className="text-xs underline text-neutral-300 hover:text-neutral-100"
            >
              {t('common.cookies.read_more')}
            </a>
          </div>
        </div>

        <div className="px-5 pb-4 text-[11px] text-neutral-400">
          {t('common.cookies.footer_hint')}
          {allOptionalOn ? '' : ' '}
        </div>
      </div>
    </div>
  );
}
