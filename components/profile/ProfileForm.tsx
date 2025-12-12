// components/profile/ProfileForm.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import type { Profile } from '@/lib/api';
import { api } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { AvatarUploader } from '@/components/profile/AvatarUploader';
import { PHONE_CODES, getDialByCountry, getIsoByDial, formatLocalByIso } from '@/constants/phoneCodes';

/** Narrow utility types to avoid `any` */
type Empty = Record<string, never>;
type ApiOk<T extends object = Empty> = { ok: true } & T;
type ApiErr = { ok: false; error?: string };
type GetProfileResp = ApiOk<{ profile: Partial<Profile> & { phone?: string; country?: string } }> | ApiErr;
type SaveProfileResp = ApiOk | ApiErr;

type Mode = 'view' | 'edit';

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}
function hasOkFlag(v: unknown): v is { ok: boolean } {
  return isObject(v) && typeof (v as { ok?: unknown }).ok === 'boolean';
}
function isGetProfileResp(v: unknown): v is GetProfileResp {
  if (!hasOkFlag(v)) return false;
  if (v.ok) {
    const p = (v as { profile?: unknown }).profile;
    return isObject(p);
  }
  return true;
}
function isSaveProfileResp(v: unknown): v is SaveProfileResp {
  return hasOkFlag(v);
}

const EMPTY: Profile = {
  firstName: '',
  middleName: '',
  lastName: '',
  language: 'en',
  birthDate: '',
  phone: '',
  countryResidence: '',
  countryTax: '',
  addressStreet: '',
  addressRegion: '',
  addressCity: '',
  addressPostal: '',
  photo: null as unknown as Profile['photo'],
};

function Req({ children }: { children: ReactNode }) {
  return <span className="after:content-['*'] after:text-red-600 after:ml-1">{children}</span>;
}

function normalizeDate(v?: string): string {
  if (!v) return '';
  v = v.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const d = m[1]!.padStart(2, '0');
    const mo = m[2]!.padStart(2, '0');
    const y = m[3]!;
    return `${y}-${mo}-${d}`;
  }
  return v.slice(0, 10);
}

function splitPhone(full?: string): { code: string; local: string } {
  const s = (full || '').trim();
  if (!s) return { code: '', local: '' };

  const found = PHONE_CODES
    .slice()
    .sort((a, b) => b.dial.length - a.dial.length)
    .find(({ dial }) => s.startsWith(dial + ' ') || s.startsWith(dial));

  if (found) {
    const rest = s.startsWith(found.dial + ' ') ? s.slice(found.dial.length + 1) : s.slice(found.dial.length);
    return { code: found.dial, local: rest.trim() };
  }

  const m = s.match(/^(\+\d{1,4})\s*(.*)$/);
  if (m) return { code: m[1] ?? '', local: (m[2] ?? '').trim() };

  return { code: '', local: s };
}

function isProfileComplete(p: Profile): boolean {
  return Boolean(p.firstName && p.lastName && p.birthDate && p.addressCity && p.countryResidence);
}

function safeCountryName(code: string, lang: string): string {
  if (!code) return '';
  try {
    const IntlAny = Intl as unknown as {
      DisplayNames?: new (locales: string[], opts: { type: 'region' }) => { of: (v: string) => string | undefined };
    };
    if (!IntlAny.DisplayNames) return code;
    const dn = new IntlAny.DisplayNames([lang || 'en'], { type: 'region' });
    const name = dn.of(code);
    return typeof name === 'string' && name ? name : code;
  } catch {
    return code;
  }
}

function extractPhotoUrl(photo: unknown): string | null {
  if (!photo) return null;
  if (typeof photo === 'string') return photo;
  if (isObject(photo)) {
    const u =
      (photo as { url?: unknown; href?: unknown; src?: unknown }).url ??
      (photo as { url?: unknown; href?: unknown; src?: unknown }).href ??
      (photo as { url?: unknown; href?: unknown; src?: unknown }).src;
    return typeof u === 'string' && u ? u : null;
  }
  return null;
}

function languageLabel(code: string, tr: (k: string, fb: string) => string): string {
  const c = (code || 'en').toLowerCase();
  if (c === 'ru') return tr('lang.ru', 'Russian');
  if (c === 'et') return tr('lang.et', 'Estonian');
  return tr('lang.en', 'English');
}

type PillTone = 'ok' | 'warn' | 'info';

function Pill({ tone, children }: { tone: PillTone; children: ReactNode }) {
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

function ViewRow({
  label,
  value,
  missing,
  mono,
  nowrap,
  onMissingClick,
  missingText = 'Missing',
}: {
  label: ReactNode;
  value: ReactNode;
  missing?: boolean;
  mono?: boolean;
  nowrap?: boolean;
  onMissingClick?: () => void;
  missingText?: string;
}) {
  return (
    <div
      className={[
        'grid grid-cols-[1fr_auto] items-start gap-4 rounded-xl border px-3 py-2',
        missing
          ? 'border-amber-300/70 bg-amber-50/60 dark:border-amber-500/35 dark:bg-amber-950/15'
          : 'border-[color:color-mix(in_srgb,var(--border)_70%,transparent)] bg-[color:color-mix(in_srgb,var(--card)_92%,transparent)]',
      ].join(' ')}
    >
      <span className="text-xs opacity-70 min-w-0">{label}</span>

      <div className="min-w-0 text-right">
        <div
          className={[
            mono ? 'font-mono' : '',
            nowrap ? 'whitespace-nowrap overflow-hidden text-ellipsis' : 'break-words',
            'text-sm',
            missing ? 'opacity-80 italic' : '',
          ].join(' ')}
        >
          {value}
        </div>

        {missing && (
          <div className="mt-1 flex justify-end">
            {onMissingClick ? (
              <button
                type="button"
                onClick={onMissingClick}
                className="inline-flex"
                title={missingText}
                aria-label={missingText}
              >
                <Pill tone="warn">{missingText}</Pill>
              </button>
            ) : (
              <Pill tone="warn">{missingText}</Pill>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function clamp01(n: number): number {
  if (Number.isNaN(n)) return 0;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}

export function ProfileForm() {
  const { t } = useI18n();

  // Translation helper: fallback if i18n returns the key itself
  const tr = (key: string, fallback: string) => {
    const v = t(key);
    return v && v !== key ? v : fallback;
  };

  const [mode, setMode] = useState<Mode>('edit');

  const [data, setData] = useState<Profile>(EMPTY);
  const [initial, setInitial] = useState<Profile>(EMPTY);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [showSavedBanner, setShowSavedBanner] = useState(false);

  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  // phone UI
  const [phoneCode, setPhoneCode] = useState<string>('');
  const [phoneLocalRaw, setPhoneLocalRaw] = useState<string>('');
  const [phoneLocalMasked, setPhoneLocalMasked] = useState<string>('');

  // "jump to missing" target
  const [focusId, setFocusId] = useState<string | null>(null);

  const phoneIso = useMemo(() => {
    if (data.countryResidence) return data.countryResidence;
    const iso = getIsoByDial(phoneCode);
    return iso || '';
  }, [data.countryResidence, phoneCode]);

  const syncPhoneFromProfile = (p: Profile) => {
    const parts = splitPhone(p.phone);
    const iso = p.countryResidence || getIsoByDial(parts.code);
    const dial = parts.code || (p.countryResidence ? getDialByCountry(p.countryResidence) : '');
    setPhoneCode(dial || '');
    setPhoneLocalRaw(parts.local);
    setPhoneLocalMasked(formatLocalByIso(iso || p.countryResidence, parts.local));
  };

  const goEditAndFocus = (id: string) => {
    setError(null);
    setSaved(false);
    setFocusId(id);
    setMode('edit');
  };

  // After switching to edit: scroll/focus target
  useEffect(() => {
    if (mode !== 'edit' || !focusId) return;

    const id = focusId;
    const timer = window.setTimeout(() => {
      const el = document.getElementById(id);
      if (!el) return;

      el.scrollIntoView({ behavior: 'smooth', block: 'center' });

      const focusable =
        el instanceof HTMLInputElement || el instanceof HTMLSelectElement || el instanceof HTMLTextAreaElement
          ? el
          : (el.querySelector('input,select,textarea,button') as HTMLElement | null);

      focusable?.focus?.();
    }, 60);

    return () => window.clearTimeout(timer);
  }, [mode, focusId]);

  // LOAD PROFILE ONCE
  useEffect(() => {
    (async () => {
      try {
        const raw = (await api.profile.get()) as unknown;

        if (isGetProfileResp(raw) && raw.ok) {
          setError(null);

          const prof = { ...EMPTY, ...raw.profile };

          // legacy `country` fallback if present
          const legacyCountry = (() => {
            const p = (raw as { profile?: unknown }).profile;
            return isObject(p) && typeof (p as { country?: unknown }).country === 'string'
              ? (p as { country: string }).country
              : undefined;
          })();
          if (!prof.countryResidence && legacyCountry) {
            prof.countryResidence = legacyCountry;
          }

          if (prof.birthDate) prof.birthDate = normalizeDate(prof.birthDate);
          if (!prof.language) prof.language = 'en';

          setData(prof);
          setInitial(prof);

          syncPhoneFromProfile(prof);

          setMode(isProfileComplete(prof) ? 'view' : 'edit');
        } else {
          setError(tr('profile.form.loadError', 'Failed to load profile.'));
          setMode('edit');
        }
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : tr('profile.form.loadError', 'Failed to load profile.'));
        setMode('edit');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // LOAD ACCOUNT EMAIL ONCE (from /api/me)
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/me', { cache: 'no-store' });
        const raw: unknown = await res.json().catch(() => ({}));
        if (!res.ok || !hasOkFlag(raw) || !raw.ok) return;

        const maybeUser = isObject((raw as { user?: unknown }).user) ? (raw as { user?: unknown }).user : null;
        const email =
          maybeUser && typeof (maybeUser as { email?: unknown }).email === 'string'
            ? ((maybeUser as { email?: string }).email ?? null)
            : null;

        if (email) setAccountEmail(email);
      } catch {
        // ignore
      }
    })();
  }, []);

  // When residence changes: set dial & re-mask
  useEffect(() => {
    if (!data.countryResidence) return;
    const dial = getDialByCountry(data.countryResidence);
    setPhoneCode(dial || '');
    setPhoneLocalMasked(formatLocalByIso(data.countryResidence, phoneLocalRaw));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.countryResidence]);

  // Auto-hide banner
  useEffect(() => {
    if (!showSavedBanner) return;
    const timer = setTimeout(() => setShowSavedBanner(false), 3000);
    return () => clearTimeout(timer);
  }, [showSavedBanner]);

  const onChange =
    (key: keyof Profile) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setSaved(false);
      let val = e.target.value;
      if (key === 'birthDate') val = normalizeDate(val);
      setData((d) => ({ ...d, [key]: val } as Profile));
    };

  const setField = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setSaved(false);
    setData((d) => ({ ...d, [key]: value } as Profile));
  };

  // phone handlers
  const onPhoneCodeChange = (v: string) => {
    setSaved(false);
    setPhoneCode(v);
    const iso = data.countryResidence || getIsoByDial(v);
    setPhoneLocalMasked(formatLocalByIso(iso, phoneLocalRaw));
  };
  const onPhoneLocalChange = (v: string) => {
    setSaved(false);
    const digits = v.replace(/\D+/g, '');
    setPhoneLocalRaw(digits);
    setPhoneLocalMasked(formatLocalByIso(phoneIso, digits));
  };

  const onReset = () => {
    setData(initial);
    syncPhoneFromProfile(initial);
    setSaved(false);
    setError(null);
  };

  const onCancelEdit = () => {
    setData(initial);
    syncPhoneFromProfile(initial);
    setError(null);
    setSaved(false);
    setMode(isProfileComplete(initial) ? 'view' : 'edit');
  };

  const onStartEdit = () => {
    setError(null);
    setSaved(false);
    setMode('edit');
    syncPhoneFromProfile(data);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      if (!data.firstName || !data.lastName || !data.birthDate || !data.addressCity || !data.countryResidence) {
        setError(tr('profile.form.saveError', 'Failed to save profile.') + ' (required fields missing)');
        setSaving(false);
        return;
      }

      const local = phoneLocalMasked.trim();
      const composedPhone = (phoneCode ? phoneCode.trim() + (local ? ' ' : '') : '') + local;

      const payload: Profile = { ...data, birthDate: normalizeDate(data.birthDate), phone: composedPhone };

      const raw = (await api.profile.save(payload)) as unknown;

      if (isSaveProfileResp(raw) && raw.ok) {
        setData(payload);
        setInitial(payload);

        setSaved(true);
        setShowSavedBanner(true);

        setMode('view');
        setFocusId(null);
      } else {
        setError(tr('profile.form.saveError', 'Failed to save profile.'));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr('profile.form.saveError', 'Failed to save profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border bg-[var(--card)] shadow p-4 text-sm">
        {tr('profile.form.loading', 'Loading...')}
      </div>
    );
  }

  const lang = (data.language || 'en').toLowerCase();
  const countryResidenceName = data.countryResidence ? safeCountryName(data.countryResidence, lang) : '';
  const countryTaxName = data.countryTax ? safeCountryName(data.countryTax, lang) : '';
  const photoUrl = extractPhotoUrl(data.photo);

  // ===== Progress model =====
  // NOTE: middleName intentionally excluded (no reminders, not counted)
  const required = {
    firstName: Boolean(data.firstName),
    lastName: Boolean(data.lastName),
    birthDate: Boolean(data.birthDate),
    countryResidence: Boolean(data.countryResidence),
    addressCity: Boolean(data.addressCity),
  };

  const optional = {
    phone: Boolean(data.phone),
    photo: Boolean(photoUrl),
    countryTax: Boolean(data.countryTax),
    addressStreet: Boolean(data.addressStreet),
    addressRegion: Boolean(data.addressRegion),
    addressPostal: Boolean(data.addressPostal),
  };

  const allFlags: boolean[] = [
    required.firstName,
    required.lastName,
    required.birthDate,
    required.countryResidence,
    required.addressCity,
    optional.phone,
    optional.photo,
    optional.countryTax,
    optional.addressStreet,
    optional.addressRegion,
    optional.addressPostal,
  ];

  const filledCount = allFlags.filter(Boolean).length;
  const totalCount = allFlags.length;
  const progress = clamp01(totalCount ? filledCount / totalCount : 0);

  const completeRequired = isProfileComplete(data);

  const miss = {
    photo: !photoUrl,
    phone: !data.phone,
    countryTax: !data.countryTax,
    addressStreet: !data.addressStreet,
    addressRegion: !data.addressRegion,
    addressPostal: !data.addressPostal,
  };

  const section = {
    avatarDone: optional.photo ? 1 : 0,
    avatarTotal: 1,

    personalDone: [required.birthDate, Boolean(data.language), optional.phone].filter(Boolean).length,
    personalTotal: 3,

    countriesDone: [required.countryResidence, optional.countryTax].filter(Boolean).length,
    countriesTotal: 2,

    addressDone: [optional.addressStreet, optional.addressRegion, required.addressCity, optional.addressPostal].filter(Boolean).length,
    addressTotal: 4,
  };

  return (
    <div className="space-y-3">
      {showSavedBanner && (
        <div className="rounded-2xl border border-emerald-300/70 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/20 dark:text-emerald-100 px-4 py-2 text-xs flex items-center justify-between">
          <span className="font-medium">{tr('profile.form.saved', 'Profile saved')}</span>
          <span className="opacity-70">{tr('profile.form.savedHint', 'All changes have been stored.')}</span>
        </div>
      )}

      {/* ===== VIEW MODE ===== */}
      {mode === 'view' && (
        <div className="card p-5 space-y-5 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('profile.form.title', 'Profile')}</div>

                <Pill tone={completeRequired ? 'ok' : 'warn'}>
                  {completeRequired ? t('profile.form.filled') : tr('profile.form.needs', 'Needs attention')}
                </Pill>

                <Pill tone="info">
                  {t('profile.form.progress')} {filledCount} {tr('profile.form.progressOf', 'of')} {totalCount}
                </Pill>
              </div>

              <div className="text-lg font-semibold leading-tight break-words mt-1">
                {[data.firstName, data.middleName, data.lastName].filter(Boolean).join(' ') || tr('profile.form.title', 'Profile')}
              </div>

              <div className="text-xs opacity-60 mt-1">
                {saved ? tr('profile.form.saved', 'Saved') : t('profile.form.viewHint')}
              </div>

              <div className="mt-3">
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${Math.round(progress * 100)}%` }} />
                </div>
              </div>
            </div>

            <div className="shrink-0 flex items-center gap-2">
              <button type="button" className="btn btn-outline" onClick={onStartEdit}>
                {t('common.edit')}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-5 items-start">
            {/* Avatar + email */}
            <div className="w-full md:w-[220px] shrink-0 space-y-3">
              <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('profile.form.photoLabel', 'Photo')}</div>
                  <Pill tone={section.avatarDone === section.avatarTotal ? 'ok' : 'warn'}>
                    {section.avatarDone}/{section.avatarTotal}
                  </Pill>
                </div>

                <div className="flex items-center justify-center">
                  {photoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={photoUrl}
                      alt={tr('profile.form.photoLabel', 'Photo')}
                      className="h-[160px] w-[160px] rounded-2xl object-cover border border-[color:var(--border)]"
                    />
                  ) : (
                    <div className="h-[160px] w-[160px] rounded-2xl border border-amber-300/70 bg-amber-50/60 dark:border-amber-500/35 dark:bg-amber-950/15 flex flex-col items-center justify-center text-xs">
                      <div className="opacity-80">{tr('profile.form.noPhoto', 'No photo')}</div>
                      <div className="mt-2">
                        <button type="button" onClick={() => goEditAndFocus('pf-photo')} className="inline-flex">
                          <Pill tone="warn">{tr('profile.form.addPhoto', 'Add photo')}</Pill>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {accountEmail && (
                <div className="card p-3 text-xs space-y-1">
                  <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('accountEmailLabel', 'Account email')}</div>
                  <div className="font-mono text-sm break-all">{accountEmail}</div>
                  <div className="text-[11px] opacity-50">{tr('accountEmailHint', 'Email cannot be changed here.')}</div>
                </div>
              )}
            </div>

            {/* Details */}
            <div className="flex-1 min-w-0 space-y-4">
              <div className="grid grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] gap-3">
                <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-wide opacity-60">{t('profile.form.personal')}</div>
                    <Pill tone={section.personalDone === section.personalTotal ? 'ok' : 'warn'}>
                      {section.personalDone}/{section.personalTotal}
                    </Pill>
                  </div>

                  <div className="space-y-2">
                    <ViewRow label={tr('profile.form.birthDate', 'Birth date')} value={data.birthDate || '—'} mono nowrap />
                    <ViewRow
                      label={tr('profile.form.languagePreferred', 'Language')}
                      value={languageLabel(data.language || 'en', tr)}
                      nowrap
                    />
                    <ViewRow
                      label={tr('profile.form.phone', 'Phone')}
                      value={data.phone ? data.phone : t('profile.form.missingValue')}
                      mono
                      missing={miss.phone}
                      nowrap
                      onMissingClick={() => goEditAndFocus('pf-phone-local')}
                      missingText={t('profile.form.missing')}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--card)] p-4 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-wide opacity-60">{t('profile.form.countries')}</div>
                    <Pill tone={section.countriesDone === section.countriesTotal ? 'ok' : 'warn'}>
                      {section.countriesDone}/{section.countriesTotal}
                    </Pill>
                  </div>

                  <div className="space-y-2">
                    <ViewRow
                      label={tr('profile.form.countryResidence', 'Residence')}
                      value={countryResidenceName || '—'}
                      nowrap
                    />
                    <ViewRow
                      label={tr('profile.form.countryTax', 'Tax')}
                      value={countryTaxName ? countryTaxName : t('profile.form.missingValue')}
                      missing={miss.countryTax}
                      nowrap
                      onMissingClick={() => goEditAndFocus('pf-countryTax')}
                      missingText={t('profile.form.missing')}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--card)] p-4 shadow-sm md:col-span-full space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('profile.form.address', 'Address')}</div>
                    <Pill tone={section.addressDone === section.addressTotal ? 'ok' : 'warn'}>
                      {section.addressDone}/{section.addressTotal}
                    </Pill>
                  </div>

                  <div className="space-y-2">
                    <ViewRow
                      label={tr('profile.form.addressStreet', 'Street')}
                      value={data.addressStreet ? data.addressStreet : t('profile.form.missingValue')}
                      missing={miss.addressStreet}
                      onMissingClick={() => goEditAndFocus('pf-addressStreet')}
                      missingText={t('profile.form.missing')}
                    />
                    <ViewRow
                      label={tr('profile.form.addressRegion', 'Region')}
                      value={data.addressRegion ? data.addressRegion : t('profile.form.missingValue')}
                      missing={miss.addressRegion}
                      onMissingClick={() => goEditAndFocus('pf-addressRegion')}
                      missingText={t('profile.form.missing')}
                    />
                    <ViewRow label={tr('profile.form.addressCity', 'City')} value={data.addressCity || '—'} nowrap />
                    <ViewRow
                      label={tr('profile.form.addressPostal', 'Postal')}
                      value={data.addressPostal ? data.addressPostal : t('profile.form.missingValue')}
                      mono
                      missing={miss.addressPostal}
                      nowrap
                      onMissingClick={() => goEditAndFocus('pf-addressPostal')}
                      missingText={t('profile.form.missing')}
                    />
                  </div>
                </div>
              </div>

              {error && <div className="text-red-600 text-xs">{error}</div>}
            </div>
          </div>
        </div>
      )}

      {/* ===== EDIT MODE (unchanged) ===== */}
      {mode === 'edit' && (
        <form onSubmit={onSubmit} className="card p-5 space-y-6 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('profile.form.editTitle', 'Edit profile')}</div>
              <div className="text-xs opacity-60 mt-1">
                {t('profile.form.editHint')}
              </div>
            </div>

            {isProfileComplete(initial) && (
              <div className="shrink-0">
                <button type="button" className="btn btn-outline" onClick={onCancelEdit} disabled={saving}>
                  {t('common.cancel')}
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col md:flex-row items-start gap-6">
            <div className="w-full md:w-[220px] shrink-0">
              <div className="card p-3 space-y-4" id="pf-photo">
                <AvatarUploader
                  label={tr('profile.form.photoLabel', 'Photo')}
                  value={data.photo ?? null}
                  onChange={(v) => setField('photo', v as Profile['photo'])}
                  maxKB={120}
                  size={160}
                  note={tr('profile.form.photoNote', 'JPG/PNG, up to 120 KB')}
                  uploadText={tr('profile.form.upload', 'Upload')}
                  resetText={tr('common.reset', 'Reset')}
                />
              </div>

              {accountEmail && (
                <div className="card p-3 text-xs space-y-1">
                  <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('accountEmailLabel', 'Account email')}</div>
                  <div className="font-mono text-sm break-all">{accountEmail}</div>
                  <div className="text-[11px] opacity-50">{tr('accountEmailHint', 'Email cannot be changed here.')}</div>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] gap-3 min-w-0">
                <label className="label min-w-0">
                  <span>
                    <Req>{tr('profile.form.firstName', 'First name')}</Req>
                  </span>
                  <input
                    id="pf-firstName"
                    className="input w-full"
                    value={data.firstName ?? ''}
                    onChange={onChange('firstName')}
                    disabled={saving}
                  />
                </label>

                <label className="label min-w-0">
                  <span>{tr('profile.form.middleName', 'Middle name')}</span>
                  <input
                    id="pf-middleName"
                    className="input w-full"
                    value={data.middleName ?? ''}
                    onChange={onChange('middleName')}
                    disabled={saving}
                  />
                </label>

                <label className="label min-w-0">
                  <span>
                    <Req>{tr('profile.form.lastName', 'Last name')}</Req>
                  </span>
                  <input
                    id="pf-lastName"
                    className="input w-full"
                    value={data.lastName ?? ''}
                    onChange={onChange('lastName')}
                    disabled={saving}
                  />
                </label>

                <label className="label min-w-0">
                  <span>
                    <Req>{tr('profile.form.birthDate', 'Birth date')}</Req>
                  </span>
                  <div className="space-y-1 w-full">
                    <input
                      id="pf-birthDate"
                      type="date"
                      className="input font-mono w-full"
                      placeholder="YYYY-MM-DD"
                      inputMode="numeric"
                      pattern="\d{4}-\d{2}-\d{2}"
                      value={data.birthDate ?? ''}
                      onChange={onChange('birthDate')}
                      disabled={saving}
                    />
                    <span className="form-help">{tr('profile.form.birthDateFormat', 'Format')}: YYYY-MM-DD</span>
                  </div>
                </label>

                <div className="min-w-0" id="pf-countryResidence">
                  <CountrySelect
                    label={tr('profile.form.countryResidence', 'Country of residence')}
                    required
                    value={data.countryResidence ?? ''}
                    onChange={(code) => setField('countryResidence', code as Profile['countryResidence'])}
                    placeholder={tr('profile.form.hint.countryResidence', 'Select country')}
                    className="w-full"
                  />
                </div>

                <div className="min-w-0" id="pf-countryTax">
                  <CountrySelect
                    label={tr('profile.form.countryTax', 'Country of tax residence')}
                    value={data.countryTax ?? ''}
                    onChange={(code) => setField('countryTax', code as Profile['countryTax'])}
                    placeholder={tr('profile.form.hint.countryTax', 'Select country')}
                    className="w-full"
                  />
                </div>

                <label className="label md:col-span-full min-w-0">
                  <span>{tr('profile.form.addressStreet', 'Street')}</span>
                  <input
                    id="pf-addressStreet"
                    className="input w-full"
                    placeholder={tr('profile.form.placeholder.street', 'Street / house / apartment')}
                    value={data.addressStreet ?? ''}
                    onChange={onChange('addressStreet')}
                    disabled={saving}
                  />
                </label>

                <label className="label min-w-0">
                  <span>{tr('profile.form.addressRegion', 'Region')}</span>
                  <input
                    id="pf-addressRegion"
                    className="input w-full"
                    placeholder={tr('profile.form.placeholder.region', 'Region')}
                    value={data.addressRegion ?? ''}
                    onChange={onChange('addressRegion')}
                    disabled={saving}
                  />
                </label>

                <label className="label min-w-0">
                  <span>
                    <Req>{tr('profile.form.addressCity', 'City')}</Req>
                  </span>
                  <input
                    id="pf-addressCity"
                    className="input w-full"
                    placeholder={tr('profile.form.placeholder.city', 'City')}
                    value={data.addressCity ?? ''}
                    onChange={onChange('addressCity')}
                    disabled={saving}
                  />
                </label>
              </div>

              <div className="mt-3 space-y-3 min-w-0">
                <div className="grid grid-cols-1 lg:[grid-template-columns:minmax(160px,220px)_1fr] gap-3 min-w-0">
                  <label className="label min-w-0">
                    <span>{tr('profile.form.addressPostal', 'Postal code')}</span>
                    <input
                      id="pf-addressPostal"
                      className="input w-full"
                      placeholder={tr('profile.form.placeholder.postal', 'Postal code')}
                      value={data.addressPostal ?? ''}
                      onChange={onChange('addressPostal')}
                      maxLength={20}
                      disabled={saving}
                    />
                  </label>

                  <label className="label min-w-0">
                    <span>{tr('profile.form.phone', 'Phone')}</span>
                    <div className="flex min-w-0 w-full gap-2 flex-nowrap">
                      <select
                        id="pf-phone-code"
                        className="select w-[84px] lg:w-[96px] basis-[84px] lg:basis-[96px] shrink-0 truncate"
                        value={phoneCode}
                        onChange={(e) => onPhoneCodeChange(e.target.value)}
                        data-empty={phoneCode === ''}
                        disabled={saving}
                      >
                        <option value="">{tr('profile.form.phoneCode', 'Code')}</option>
                        {PHONE_CODES.map((pc) => (
                          <option key={`${pc.code}-${pc.dial}`} value={pc.dial}>
                            {pc.label}
                          </option>
                        ))}
                      </select>

                      <input
                        id="pf-phone-local"
                        className="input flex-1 min-w-0 w-full"
                        placeholder={tr('profile.form.placeholder.phone', 'Phone number')}
                        value={phoneLocalMasked}
                        onChange={(e) => onPhoneLocalChange(e.target.value)}
                        maxLength={200}
                        disabled={saving}
                      />
                    </div>
                  </label>

                  <div className="min-w-0" id="pf-language">
                    <label className="label min-w-0">
                      <span>{tr('profile.form.languagePreferred', 'Preferred language')}</span>
                      <div className="space-y-1 w-full">
                        <select
                          className="select w-full"
                          value={data.language ?? 'en'}
                          onChange={onChange('language')}
                          disabled={saving}
                        >
                          <option value="en">{tr('lang.en', 'English')}</option>
                          <option value="ru">{tr('lang.ru', 'Russian')}</option>
                          <option value="et">{tr('lang.et', 'Estonian')}</option>
                        </select>
                        <span className="form-help">{tr('profile.form.languageHelp', 'Used for notifications and UI.')}</span>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {saved && <span className="text-emerald-600 text-xs">{tr('profile.form.saved', 'Saved')}</span>}
              {error && <span className="text-red-600 text-xs">{error}</span>}
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={onReset} className="btn btn-outline" disabled={saving}>
                {tr('common.reset', 'Reset')}
              </button>

              {isProfileComplete(initial) && (
                <button type="button" onClick={onCancelEdit} className="btn btn-outline" disabled={saving}>
                  {tr('common.cancel', 'Cancel')}
                </button>
              )}

              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? tr('profile.form.saving', 'Saving...') : tr('profile.form.save', 'Save')}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
