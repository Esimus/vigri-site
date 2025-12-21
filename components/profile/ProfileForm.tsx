// components/profile/ProfileForm.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import type { Profile } from '@/lib/api';
import { api } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { AvatarUploader } from '@/components/profile/AvatarUploader';
import { PHONE_CODES, getDialByCountry, getIsoByDial, formatLocalByIso } from '@/constants/phoneCodes';
import { resolveAmlZone } from '@/constants/amlAnnexA';

/** Narrow utility types to avoid `any` */
type Empty = Record<string, never>;
type ApiOk<T extends object = Empty> = { ok: true } & T;
type ApiErr = { ok: false; error?: string };
type GetProfileResp = ApiOk<{ profile: Partial<Profile> & { phone?: string; country?: string } }> | ApiErr;
type SaveProfileResp = ApiOk | ApiErr;

type Mode = 'view' | 'edit';
type ProfileX = Profile & { isikukood?: string | null };

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

type CountryZone = 'green' | 'grey' | 'red' | null;
type KycStatus = 'none' | 'pending' | 'approved' | 'rejected';

type MeResp =
  | {
      ok: true;
      signedIn: boolean;
      kycStatus: KycStatus;
      kycCountryZone: CountryZone;
      profileCompleted: boolean;
      profile?: {
        countryResidence?: string;
        countryCitizenship?: string;
        countryTax?: string;
      };
    }
  | { ok: false; signedIn?: boolean; error?: string };

type KycResp = { ok: true; status: KycStatus } | { ok: false; error?: string };

function isMeResp(v: unknown): v is MeResp {
  return hasOkFlag(v);
}
function isKycResp(v: unknown): v is KycResp {
  return hasOkFlag(v);
}

type KycGetResp =
  | {
      ok: true;
      status: KycStatus;
      data: null | {
        pepDeclared: boolean | null;
        pepDetails: string | null;
        consent: boolean | null;
        passportNumber: string | null;
        passportCountry: string | null;
        passportIssuedAt: string | null;
        passportExpiresAt: string | null;
        passportIssuer: string | null;
        documentImage: string | null;
      };
    }
  | { ok: false; error?: string };

function isKycGetResp(v: unknown): v is KycGetResp {
  return hasOkFlag(v);
}

const EMPTY: ProfileX = {
  firstName: '',
  middleName: '',
  lastName: '',
  language: 'en',
  birthDate: '',
  phone: '',
  countryResidence: '',
  countryCitizenship: '',
  countryTax: '',
  addressStreet: '',
  addressRegion: '',
  addressCity: '',
  addressPostal: '',
  photo: null as unknown as Profile['photo'],
  isikukood: '',
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

function isProfileComplete(p: ProfileX): boolean {
  return Boolean(
    p.firstName &&
    p.lastName &&
    p.birthDate &&
    p.addressCity &&
    p.countryResidence &&
    p.countryCitizenship &&
    p.countryTax
  );
}

function isProfileEmpty(p: ProfileX): boolean {
  return !(
    p.firstName ||
    p.lastName ||
    p.birthDate ||
    p.addressCity ||
    p.countryResidence ||
    p.countryCitizenship ||
    p.countryTax
  );
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
  const { t, lang: uiLang } = useI18n();

  // Translation helper: fallback if i18n returns the key itself
  const tr = useCallback(
    (key: string, fallback: string) => {
      const v = t(key);
      return v && v !== key ? v : fallback;
    },
    [t],
  );

  const [mode, setMode] = useState<Mode>('view');

  const [data, setData] = useState<ProfileX>(EMPTY);
  const [initial, setInitial] = useState<ProfileX>(EMPTY);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);

  const [saved, setSaved] = useState(false);
  const [showSavedBanner, setShowSavedBanner] = useState(false);

  const [accountEmail, setAccountEmail] = useState<string | null>(null);

  const [kycBusy, setKycBusy] = useState(false);
  const [kycErr, setKycErr] = useState<string | null>(null);

  // KYC form (base)
  const [pepDeclared, setPepDeclared] = useState<boolean | null>(null);
  const [pepDetails, setPepDetails] = useState<string>('');
  const [kycConsent, setKycConsent] = useState<boolean>(false);

  // KYC form (extra for Gold/Platinum, non-EE)
  const [passportNumber, setPassportNumber] = useState<string>('');
  const [passportCountry, setPassportCountry] = useState<string>('');
  const [passportIssuedAt, setPassportIssuedAt] = useState<string>('');   // YYYY-MM-DD
  const [passportExpiresAt, setPassportExpiresAt] = useState<string>(''); // YYYY-MM-DD
  const [passportIssuer, setPassportIssuer] = useState<string>('');
  const [documentImage, setDocumentImage] = useState<string | null>(null);

  const [signedIn, setSignedIn] = useState(false);
  const [meProfileCompleted, setMeProfileCompleted] = useState(false);
  const [meZone, setMeZone] = useState<CountryZone>(null);
  const [meKycStatus, setMeKycStatus] = useState<KycStatus>('none');
  const [meCountryCode, setMeCountryCode] = useState<string>('');

  const loadMe = useCallback(async () => {
    const res = await fetch('/api/me', { cache: 'no-store' });
    const raw: unknown = await res.json().catch(() => ({}));

    if (!res.ok || !isMeResp(raw) || !raw.ok) {
      setSignedIn(false);
      setMeProfileCompleted(false);
      setMeZone(null);
      setMeKycStatus('none');
      setMeCountryCode('');
      return;
    }

    setSignedIn(Boolean(raw.signedIn));
    setMeProfileCompleted(Boolean(raw.profileCompleted));
    setMeZone(raw.kycCountryZone ?? null);
    setMeKycStatus(raw.kycStatus ?? 'none');

    const cc = (raw.profile?.countryResidence ?? raw.profile?.countryCitizenship ?? raw.profile?.countryTax ?? '').toUpperCase();
    setMeCountryCode(cc);
  }, []);

  const loadKycData = useCallback(async () => {
    try {
      const res = await fetch('/api/kyc', { cache: 'no-store' });
      const raw: unknown = await res.json().catch(() => ({}));
      if (!res.ok || !isKycGetResp(raw) || !raw.ok) return;

      const d = raw.data;
      if (!d) return;

      setPepDeclared(d.pepDeclared ?? null);
      setPepDetails(d.pepDetails ?? '');
      setKycConsent(d.consent === true);

      setPassportNumber(d.passportNumber ?? '');
      setPassportCountry(d.passportCountry ?? '');
      setPassportIssuedAt(d.passportIssuedAt ? String(d.passportIssuedAt).slice(0, 10) : '');
      setPassportExpiresAt(d.passportExpiresAt ? String(d.passportExpiresAt).slice(0, 10) : '');
      setPassportIssuer(d.passportIssuer ?? '');
      setDocumentImage(d.documentImage ?? null);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        setKycErr(null);
        await loadMe();
      } catch (e: unknown) {
        setKycErr(e instanceof Error ? e.message : tr('kyc.loadError', 'Failed to load KYC state.'));
      }
    })();
  }, [loadMe, tr]);

    useEffect(() => {
    if (!signedIn) return;
    void loadKycData();
  }, [signedIn, loadKycData]);

  const submitKyc = useCallback(async () => {
    setKycBusy(true);
    setKycErr(null);

    try {
      const res = await fetch('/api/kyc', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          status: 'pending' satisfies KycStatus,
          pepDeclared,
          pepDetails,
          consent: kycConsent,
          passportNumber,
          passportCountry,
          passportIssuedAt,
          passportExpiresAt,
          passportIssuer,
          documentImage,
        }),
      });

      const raw: unknown = await res.json().catch(() => ({}));
      if (!res.ok || !isKycResp(raw) || !raw.ok) {
        setKycErr(tr('kyc.submitError', 'Failed to submit KYC.'));
        return;
      }

      setMeKycStatus(raw.status);
      await loadMe();
      await loadKycData();
    } catch (e: unknown) {
      setKycErr(e instanceof Error ? e.message : tr('kyc.submitError', 'Failed to submit KYC.'));
    } finally {
      setKycBusy(false);
    }
      }, [
        loadMe,
        loadKycData,
        tr,
        pepDeclared,
        pepDetails,
        kycConsent,
        passportNumber,
        passportCountry,
        passportIssuedAt,
        passportExpiresAt,
        passportIssuer,
        documentImage,
      ]);

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

  const syncPhoneFromProfile = (p: ProfileX) => {
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

  const profileLoadedRef = useRef(false);

  useEffect(() => {
  if (profileLoadedRef.current) return;
  profileLoadedRef.current = true;

  (async () => {
    try {
      const raw = (await api.profile.get()) as unknown;

      if (isGetProfileResp(raw) && raw.ok) {
        setError(null);

        const prof = { ...EMPTY, ...raw.profile };

        const legacyCountry = (() => {
          const p = (raw as { profile?: unknown }).profile;
          return isObject(p) && typeof (p as { country?: unknown }).country === 'string'
            ? (p as { country: string }).country
            : undefined;
        })();

        if (!prof.countryResidence && legacyCountry) prof.countryResidence = legacyCountry;

        if (prof.birthDate) prof.birthDate = normalizeDate(prof.birthDate);
        if (!prof.language) prof.language = 'en';

        setData(prof);
        setInitial(prof);
        syncPhoneFromProfile(prof);

        setMode((prev) => (prev === 'edit' ? 'edit' : (isProfileEmpty(prof) ? 'edit' : 'view')));
      } else {
        setError(tr('profile.form.loadError', 'Failed to load profile.'));
        setMode((prev) => prev);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr('profile.form.loadError', 'Failed to load profile.'));
      setMode((prev) => prev);
    } finally {
      setLoading(false);
    }
  })();
}, [tr]);

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

  const setField = <K extends keyof ProfileX>(key: K, value: ProfileX[K]) => {
    setSaved(false);
    setData((d) => ({ ...d, [key]: value } as ProfileX));
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
      if (
        !data.firstName ||
        !data.lastName ||
        !data.birthDate ||
        !data.addressCity ||
        !data.countryResidence ||
        !data.countryCitizenship ||
        !data.countryTax ||
        (data.countryResidence === 'EE' && !data.isikukood)
      ) {

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

    const liveZone = useMemo(() => {
      const r = resolveAmlZone((data.countryResidence || '').trim());
      const c = resolveAmlZone((data.countryCitizenship || '').trim());
      const t = resolveAmlZone((data.countryTax || '').trim());

      const worst =
        r === 'red' || c === 'red' || t === 'red'
          ? 'red'
          : r === 'grey' || c === 'grey' || t === 'grey'
            ? 'grey'
            : r === 'green' || c === 'green' || t === 'green'
              ? 'green'
              : 'unknown';

      return worst === 'unknown' ? null : worst;
    }, [data.countryResidence, data.countryCitizenship, data.countryTax]);

    const effectiveZone = liveZone ?? meZone;

    const canSubmitKyc =
      signedIn &&
      effectiveZone !== 'red' &&
      meProfileCompleted &&
      meKycStatus === 'none' &&
      kycConsent === true &&
      pepDeclared !== null &&
      (pepDeclared === false || pepDetails.trim().length > 0) &&
      (data.countryResidence !== 'EE' || Boolean(data.isikukood));

  if (loading) {
    return (
      <div className="rounded-2xl border bg-[var(--card)] shadow p-4 text-sm">
        {tr('profile.form.loading', 'Loading...')}
      </div>
    );
  }

  const countryResidenceName = data.countryResidence ? safeCountryName(data.countryResidence, uiLang) : '';
  const countryCitizenshipName = data.countryCitizenship ? safeCountryName(data.countryCitizenship, uiLang) : '';
  const countryTaxName = data.countryTax ? safeCountryName(data.countryTax, uiLang) : '';
  const photoUrl = extractPhotoUrl(data.photo);

  // ===== Progress model =====
  // NOTE: middleName intentionally excluded (no reminders, not counted)
  const required = {
    firstName: Boolean(data.firstName),
    lastName: Boolean(data.lastName),
    birthDate: Boolean(data.birthDate),
    countryResidence: Boolean(data.countryResidence),
    countryCitizenship: Boolean(data.countryCitizenship),
    countryTax: Boolean(data.countryTax),
    addressCity: Boolean(data.addressCity),
  };

  const optional = {
    phone: Boolean(data.phone),
    photo: Boolean(photoUrl),
    addressStreet: Boolean(data.addressStreet),
    addressRegion: Boolean(data.addressRegion),
    addressPostal: Boolean(data.addressPostal),
  };

  const allFlags: boolean[] = [
    required.firstName,
    required.lastName,
    required.birthDate,
    required.countryResidence,
    required.countryCitizenship,
    required.countryTax,
    required.addressCity,
    optional.phone,
    optional.photo,
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
    countryCitizenship: !data.countryCitizenship,
    countryTax: !data.countryTax,
    addressStreet: !data.addressStreet,
    addressRegion: !data.addressRegion,
    addressPostal: !data.addressPostal,
  };

  const section = {
    avatarDone: optional.photo ? 1 : 0,
    avatarTotal: 1,

    personalDone: [required.firstName, required.lastName, required.birthDate, optional.phone].filter(Boolean).length,
    personalTotal: 4,

    countriesDone: [required.countryResidence, required.countryCitizenship, required.countryTax].filter(Boolean).length,
    countriesTotal: 3,

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
                      label={tr('profile.form.isikukood', 'Personal ID code (EE)')}
                      value={data.isikukood ? data.isikukood : '—'}
                      mono
                      nowrap
                    />
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
                      label={tr('profile.form.countryCitizenship', 'Citizenship / passport')}
                      value={countryCitizenshipName ? countryCitizenshipName : t('profile.form.missingValue')}
                      missing={miss.countryCitizenship}
                      nowrap
                      onMissingClick={() => goEditAndFocus('pf-countryCitizenship')}
                      missingText={t('profile.form.missing')}
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
                  {Boolean(data.countryResidence) && (
                    <button
                      type="button"
                      className="mt-1 text-xs underline opacity-70"
                      onClick={() => setField('countryResidence', '')}
                      disabled={saving}
                    >
                      {tr('common.clear', 'Clear')}
                    </button>
                  )}
                </div>

                <div className="min-w-0" id="pf-countryCitizenship">
                  <CountrySelect
                    label={tr('profile.form.countryCitizenship', 'Citizenship / passport')}
                    required
                    value={data.countryCitizenship ?? ''}
                    onChange={(code) => setField('countryCitizenship', code as Profile['countryCitizenship'])}
                    placeholder={tr('profile.form.hint.countryCitizenship', 'Select country')}
                    className="w-full"
                  />
                  {Boolean(data.countryCitizenship) && (
                    <button
                      type="button"
                      className="mt-1 text-xs underline opacity-70"
                      onClick={() => setField('countryCitizenship', '')}
                      disabled={saving}
                    >
                      {tr('common.clear', 'Clear')}
                    </button>
                  )}
                </div>

                <div className="min-w-0" id="pf-countryTax">
                  <CountrySelect
                    label={tr('profile.form.countryTax', 'Country of tax residence')}
                    required
                    value={data.countryTax ?? ''}
                    onChange={(code) => setField('countryTax', code as Profile['countryTax'])}
                    placeholder={tr('profile.form.hint.countryTax', 'Select country')}
                    className="w-full"
                  />
                  {Boolean(data.countryTax) && (
                    <button
                      type="button"
                      className="mt-1 text-xs underline opacity-70"
                      onClick={() => setField('countryTax', '')}
                      disabled={saving}
                    >
                      {tr('common.clear', 'Clear')}
                    </button>
                  )}
                </div>

                {data.countryResidence === 'EE' && (
                  <label className="label min-w-0">
                    <span>
                      <Req>{tr('profile.form.isikukood', 'Personal code (EE)')}</Req>
                    </span>
                    <input
                      id="pf-isikukood"
                      className="input w-full font-mono"
                      value={data.isikukood ?? ''}
                      onChange={(e) => setField('isikukood', e.target.value)}
                      disabled={saving}
                      inputMode="numeric"
                      placeholder="XXXXXXXXXXX"
                    />
                  </label>
                )}

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

        <div className="card p-4 text-sm space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium">KYC</div>

              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Pill tone={signedIn ? 'ok' : 'warn'}>
                  {signedIn ? tr('kyc.signedIn', 'Signed in') : tr('kyc.notSignedIn', 'Not signed in')}
                </Pill>

                <Pill tone={effectiveZone === 'green' ? 'ok' : effectiveZone === 'grey' || effectiveZone === 'red' ? 'warn' : 'info'}>
                  {meCountryCode ? `${meCountryCode} · ${effectiveZone ?? tr('kyc.zoneUnknown', 'Unknown zone')}` : (effectiveZone ?? tr('kyc.zoneUnknown', 'Unknown zone'))}
                </Pill>

                <Pill tone={meKycStatus === 'approved' ? 'ok' : meKycStatus === 'pending' ? 'warn' : 'info'}>
                  {tr('kyc.status', 'Status')}: <span className="ml-1 font-medium">{meKycStatus}</span>
                </Pill>
              </div>
            </div>

            {data.countryResidence ? (
              <Pill tone="info">
                {data.countryResidence.toUpperCase()} · {countryResidenceName}
              </Pill>
            ) : (
              <Pill tone="warn">{tr('profile.form.hint.countryResidence', 'Select country')}</Pill>
            )}
          </div>

          {!signedIn && (
            <div className="rounded-2xl border border-amber-300/70 bg-amber-50/80 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/20 dark:text-amber-100 p-4 text-sm">
              <div className="font-medium">{tr('kyc.needSignIn', 'Please sign in to continue.')}</div>
              <div className="mt-2 text-xs opacity-80">{tr('kyc.needSignInHint', 'Open Dashboard and sign in, then return here.')}</div>
            </div>
          )}

          {signedIn && effectiveZone === 'red' && (
            <div className="rounded-2xl border border-rose-300/70 bg-rose-50/80 text-rose-900 dark:border-rose-500/35 dark:bg-rose-950/20 dark:text-rose-100 p-4 text-sm">
              {tr('kyc.redBlocked', 'KYC is not available for your current zone via this flow.')}
            </div>
          )}

          {signedIn && effectiveZone !== 'red' && !meProfileCompleted && (
            <div className="rounded-2xl border border-amber-300/70 bg-amber-50/80 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/20 dark:text-amber-100 p-4 text-sm">
              <div>{tr('kyc.profileRequired', 'Complete your Profile first (required fields), then submit KYC.')}</div>
            </div>
          )}

          {signedIn && effectiveZone !== 'red' && meProfileCompleted && (
            <div className="space-y-3">
              {meKycStatus === 'none' || meKycStatus === 'rejected' ? (
                <div className="card p-4 text-sm space-y-2">
                  <div className="card p-4 text-sm space-y-3">
                    <div className="font-medium">{tr('kyc.formTitle', 'KYC details')}</div>

                    <div className="space-y-2">
                      <div className="text-xs opacity-70">
                        {tr(
                          'kyc.pepLabel',
                          'Are you (or close relatives) connected to government / politics / state-owned companies?',
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-3">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="pepDeclared"
                            className="accent-blue-600"
                            checked={pepDeclared === false}
                            onChange={() => setPepDeclared(false)}
                            disabled={kycBusy || meKycStatus !== 'none'}
                          />
                          <span className="text-sm">{tr('no', 'No')}</span>
                        </label>

                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name="pepDeclared"
                            className="accent-blue-600"
                            checked={pepDeclared === true}
                            onChange={() => setPepDeclared(true)}
                            disabled={kycBusy || meKycStatus !== 'none'}
                          />
                          <span className="text-sm">{tr('yes', 'Yes')}</span>
                        </label>
                      </div>

                      {pepDeclared === true && (
                        <label className="label">
                          <span className="text-xs opacity-70">
                            {tr('kyc.pepDetails', 'Please describe who and the role (country, position, dates).')}
                          </span>
                          <textarea
                            className="textarea w-full min-h-[96px]"
                            value={pepDetails}
                            onChange={(e) => setPepDetails(e.target.value)}
                            disabled={kycBusy || meKycStatus !== 'none'}
                          />
                        </label>
                      )}
                    </div>

                    <label className="inline-flex items-start gap-2">
                      <input
                        type="checkbox"
                        className="accent-blue-600"
                        checked={kycConsent}
                        onChange={(e) => setKycConsent(e.target.checked)}
                        disabled={kycBusy || meKycStatus !== 'none'}
                      />
                      <span className="text-sm">{tr('kyc.consent', 'I confirm the data is true and I consent to verification.')}</span>
                    </label>

                    {/* Passport & document (for everyone) */}
                    <div className="mt-2 rounded-2xl border border-[color:var(--border)] bg-[var(--card)] p-3 space-y-3">
                      <div className="text-sm font-medium">
                        {tr('kyc.passportTitle', 'Passport & document')}
                        <span className="ml-2 text-xs opacity-70">
                          {tr('kyc.passportHint', 'Required for verification.')}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-3">
                        <label className="label">
                          <span>{tr('kyc.passportNumber', 'Passport number')}</span>
                          <input
                            className="input w-full font-mono"
                            value={passportNumber}
                            onChange={(e) => setPassportNumber(e.target.value)}
                            disabled={kycBusy || meKycStatus !== 'none'}
                          />
                        </label>

                        <label className="label">
                          <span>{tr('kyc.passportCountry', 'Issuing country')}</span>
                          <input
                            className="input w-full font-mono"
                            placeholder="EE / DE / FR ..."
                            value={passportCountry}
                            onChange={(e) => setPassportCountry(e.target.value.toUpperCase())}
                            disabled={kycBusy || meKycStatus !== 'none'}
                          />
                        </label>

                        <label className="label">
                          <span>{tr('kyc.passportIssuedAt', 'Issued date')}</span>
                          <input
                            type="date"
                            className="input w-full font-mono"
                            value={passportIssuedAt}
                            onChange={(e) => setPassportIssuedAt(e.target.value)}
                            disabled={kycBusy || meKycStatus !== 'none'}
                          />
                        </label>

                        <label className="label">
                          <span>{tr('kyc.passportExpiresAt', 'Expiry date')}</span>
                          <input
                            type="date"
                            className="input w-full font-mono"
                            value={passportExpiresAt}
                            onChange={(e) => setPassportExpiresAt(e.target.value)}
                            disabled={kycBusy || meKycStatus !== 'none'}
                          />
                        </label>

                        <label className="label md:col-span-full">
                          <span>{tr('kyc.passportIssuer', 'Issued by')}</span>
                          <input
                            className="input w-full"
                            value={passportIssuer}
                            onChange={(e) => setPassportIssuer(e.target.value)}
                            disabled={kycBusy || meKycStatus !== 'none'}
                          />
                        </label>
                      </div>

                      <div className="pt-1">
                        <AvatarUploader
                          label={tr('kyc.documentUpload', 'Upload document image')}
                          value={documentImage}
                          onChange={setDocumentImage}
                          size={768}
                          maxKB={350}
                          note={tr('kyc.documentNote', 'Photo/scan. This is stored for verification.')}
                          uploadText={tr('common.upload', 'Upload')}
                          resetText={tr('common.reset', 'Reset')}
                          disabled={kycBusy || meKycStatus !== 'none'}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="font-medium">{tr('kyc.stepsTitle', 'Process')}</div>
                  <ol className="list-decimal pl-5 space-y-1 opacity-80">
                    <li>{tr('kyc.step1', 'Submit KYC request')}</li>
                    <li>{tr('kyc.step2', 'Upload documents and pass checks')}</li>
                    <li>{tr('kyc.step3', 'Manual review → approval')}</li>
                  </ol>

                  {meKycStatus === 'none' && (
                    <button type="button" className="btn btn-primary" onClick={submitKyc} disabled={!canSubmitKyc || kycBusy}>
                      {kycBusy ? tr('kyc.submitting', 'Submitting...') : tr('kyc.submit', 'Submit KYC (set to pending)')}
                    </button>
                  )}

                  {meKycStatus === 'rejected' && (
                    <div className="rounded-2xl border border-rose-300/70 bg-rose-50/80 text-rose-900 dark:border-rose-500/35 dark:bg-rose-950/20 dark:text-rose-100 p-4 text-sm">
                      {tr('kyc.rejectedHint', 'KYC rejected.')}
                    </div>
                  )}
                </div>
              ) : (
                // Read-only view for pending/approved
                <div className="card p-4 text-sm space-y-3">
                  <div className="font-medium">{tr('kyc.formTitle', 'KYC details')}</div>

                  <div className="space-y-2">
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      <div className="opacity-70">{tr('kyc.pepLabelShort', 'PEP (Politically exposed person)')}</div>
                      <div className="min-w-0">
                        {pepDeclared === null ? '—' : pepDeclared ? tr('yes', 'Yes') : tr('no', 'No')}
                      </div>

                      {pepDeclared === true && (
                        <>
                          <div className="opacity-70">{tr('kyc.pepDetails', 'Details')}</div>
                          <div className="min-w-0 break-words">{pepDetails || '—'}</div>
                        </>
                      )}

                      <div className="opacity-70">{tr('kyc.consentLabel', 'Data confirmation & consent')}</div>
                      <div>{kycConsent ? tr('yes', 'Yes') : tr('no', 'No')}</div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--card)] p-3 space-y-3">
                    <div className="text-sm font-medium">{tr('kyc.passportTitle', 'Passport & document')}</div>

                    <div className="grid grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(220px,1fr))] gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('kyc.passportNumber', 'Passport number')}</div>
                        <div className="mt-1 font-mono text-sm break-words">{passportNumber || '—'}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('kyc.passportCountry', 'Issuing country')}</div>
                        <div className="mt-1 font-mono text-sm break-words">{passportCountry || '—'}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('kyc.passportIssuedAt', 'Issued date')}</div>
                        <div className="mt-1 font-mono text-sm break-words">{passportIssuedAt || '—'}</div>
                      </div>

                      <div className="min-w-0">
                        <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('kyc.passportExpiresAt', 'Expiry date')}</div>
                        <div className="mt-1 font-mono text-sm break-words">{passportExpiresAt || '—'}</div>
                      </div>

                      <div className="min-w-0 md:col-span-full">
                        <div className="text-[11px] uppercase tracking-wide opacity-60">{tr('kyc.passportIssuer', 'Issued by')}</div>
                        <div className="mt-1 text-sm break-words">{passportIssuer || '—'}</div>
                      </div>
                    </div>

                    <div className="text-xs">
                      <span className="opacity-70">{tr('kyc.documentShort', 'Document')}:</span>{' '}
                      <span className="ml-1">{documentImage ? tr('kyc.documentUploaded', 'Document uploaded') : '—'}</span>
                    </div>
                  </div>

                  {meKycStatus === 'pending' && (
                    <div className="rounded-2xl border border-amber-300/70 bg-amber-50/80 text-amber-900 dark:border-amber-500/35 dark:bg-amber-950/20 dark:text-amber-100 p-4 text-sm">
                      {tr('kyc.pendingHint', 'Your request is pending review.')}
                    </div>
                  )}

                  {meKycStatus === 'approved' && (
                    <div className="rounded-2xl border border-emerald-300/70 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/20 dark:text-emerald-100 p-4 text-sm">
                      ✅ {tr('kyc.approvedHint', 'KYC approved.')}
                      <div className="mt-2 text-xs opacity-80">{tr('kyc.gdprHint', 'Need to delete/rectify data? Email support@vigri.ee (subject: GDPR request).')}</div>
                    </div>
                  )}
                </div>
              )}

              {kycErr && <div className="text-sm text-red-600">{kycErr}</div>}
            </div>
          )}

          {kycErr && <div className="text-sm text-red-600">{kycErr}</div>}
      </div>
    </div>
  );
}
