// components/forms/IntakeForms.tsx
'use client';

import { useMemo, useState } from 'react';

type IntakeKind = 'club_pilot' | 'ambassador' | 'faq_question' | 'other';

type IntakeResponse =
  | { ok: true; id: string }
  | { ok: false; error: string };

const PRIVACY_VERSION = 'v1';

function getUtm(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  if (typeof window === 'undefined') return {};
  const p = new URLSearchParams(window.location.search);
  const utmSource = p.get('utm_source') ?? undefined;
  const utmMedium = p.get('utm_medium') ?? undefined;
  const utmCampaign = p.get('utm_campaign') ?? undefined;
  return { utmSource, utmMedium, utmCampaign };
}

async function submitIntake(payload: Record<string, unknown>): Promise<IntakeResponse> {
  const r = await fetch('/api/intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store',
    body: JSON.stringify(payload),
  });

    const j = (await r.json().catch(() => null)) as unknown;
    const obj = (j && typeof j === 'object' ? (j as Record<string, unknown>) : null);

    if (r.ok && obj?.ok === true && typeof obj?.id === 'string') return { ok: true, id: obj.id };
    return { ok: false, error: (typeof obj?.error === 'string' ? obj.error : 'Request failed') };
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="text-xs font-medium text-zinc-700">{label}</div>
      {children}
      {hint ? <div className="text-xs text-zinc-500">{hint}</div> : null}
    </div>
  );
}

function inputBase() {
  return 'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-brand/30';
}

function textAreaBase() {
  return 'w-full min-h-[110px] rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 outline-none focus:ring-2 focus:ring-brand/30';
}

function buildCommonMeta(kind: IntakeKind, preferredLang?: string) {
  const utm = getUtm();
  const sourcePath =
    typeof window !== 'undefined'
      ? `${window.location.pathname}${window.location.hash || ''}`
      : undefined;

  const referrer = typeof document !== 'undefined' ? document.referrer || undefined : undefined;

  return {
    kind,
    preferredLang,
    sourcePath,
    referrer,
    ...utm,
    privacyVersion: PRIVACY_VERSION,
    hp: '', // honeypot
  };
}

/**
 * Club pilot application form (stored as FormSubmission with kind=club_pilot).
 * Form-specific fields are placed into payload.
 */
export function ClubPilotForm({
  t,
  preferredLang,
}: {
  t: (key: string) => string;
  preferredLang?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeResponse | null>(null);

  const [clubName, setClubName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  const [contactName, setContactName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [phone, setPhone] = useState('');

  const [website, setWebsite] = useState('');
  const [socialLink, setSocialLink] = useState('');

  const [whyJoined, setWhyJoined] = useState('');
  const [consent, setConsent] = useState(false);

  const canSubmit = useMemo(() => {
    const hasContact = Boolean(email.trim() || telegram.trim() || phone.trim());
    return (
      clubName.trim().length > 1 &&
      country.trim().length > 1 &&
      city.trim().length > 1 &&
      contactName.trim().length > 1 &&
      hasContact &&
      whyJoined.trim().length > 10 &&
      consent &&
      !isSubmitting
    );
  }, [clubName, country, city, contactName, email, telegram, phone, whyJoined, consent, isSubmitting]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const hasContact = Boolean(email.trim() || telegram.trim() || phone.trim());
    if (!hasContact) {
      setResult({ ok: false, error: t('clubs_form_err_contact') });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...buildCommonMeta('club_pilot', preferredLang),

        consent: true,

        contactName: contactName.trim(),
        email: email.trim() || undefined,
        telegram: telegram.trim() || undefined,
        phone: phone.trim() || undefined,

        country: country.trim().toUpperCase(),
        city: city.trim(),
        region: undefined,

        subject: 'Club pilot application',
        message: whyJoined.trim(),

        payload: {
          clubName: clubName.trim(),
          contactRole: contactRole.trim() || undefined,
          website: website.trim() || undefined,
          links: {
            social: socialLink.trim() || undefined,
          },
          whyJoined: whyJoined.trim(),
        },
      };

      const r = await submitIntake(payload);
      setResult(r);

      if (r.ok) {
        // reset only the "content" fields; keep country/city to reduce friction
        setClubName('');
        setWebsite('');
        setSocialLink('');
        setWhyJoined('');
        setContactRole('');
        setEmail('');
        setTelegram('');
        setPhone('');
        setConsent(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot */}
      <input
        type="text"
        name="hp"
        value=""
        onChange={() => {}}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('clubs_form_club_name')}>
          <input className={inputBase()} value={clubName} onChange={(e) => setClubName(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_contact_name')}>
          <input className={inputBase()} value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_country')} hint={t('clubs_form_country_hint')}>
          <input className={inputBase()} value={country} onChange={(e) => setCountry(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_city')}>
          <input className={inputBase()} value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_contact_role')} hint={t('clubs_form_contact_role_hint')}>
          <input className={inputBase()} value={contactRole} onChange={(e) => setContactRole(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_website')} hint={t('clubs_form_optional')}>
          <input className={inputBase()} value={website} onChange={(e) => setWebsite(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_email')} hint={t('clubs_form_one_of')}>
          <input className={inputBase()} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_telegram')} hint={t('clubs_form_one_of')}>
          <input className={inputBase()} value={telegram} onChange={(e) => setTelegram(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_phone')} hint={t('clubs_form_one_of')}>
          <input className={inputBase()} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_social')} hint={t('clubs_form_social_hint')}>
          <input className={inputBase()} value={socialLink} onChange={(e) => setSocialLink(e.target.value)} />
        </Field>
      </div>

      <Field label={t('clubs_form_why')}>
        <textarea className={textAreaBase()} value={whyJoined} onChange={(e) => setWhyJoined(e.target.value)} />
      </Field>

      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>{t('clubs_form_consent')}</span>
      </label>

      {result ? (
        <div
          className={[
            'rounded-xl border px-3 py-2 text-sm',
            result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900',
          ].join(' ')}
        >
          {result.ok ? t('clubs_form_success') : result.error}
        </div>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
        {isSubmitting ? t('clubs_form_sending') : t('clubs_form_submit')}
      </button>
    </form>
  );
}

/**
 * Ambassador application form (stored as FormSubmission with kind=ambassador).
 */
export function AmbassadorForm({
  t,
  preferredLang,
}: {
  t: (key: string) => string;
  preferredLang?: string;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeResponse | null>(null);

  const [contactName, setContactName] = useState('');
  const [country, setCountry] = useState('');
  const [city, setCity] = useState('');

  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [phone, setPhone] = useState('');

  const [socialLink, setSocialLink] = useState('');
  const [languages, setLanguages] = useState('');
  const [why, setWhy] = useState('');
  const [consent, setConsent] = useState(false);

  const canSubmit = useMemo(() => {
    const hasContact = Boolean(email.trim() || telegram.trim() || phone.trim());
    return (
      contactName.trim().length > 1 &&
      country.trim().length > 1 &&
      city.trim().length > 1 &&
      socialLink.trim().length > 5 &&
      hasContact &&
      why.trim().length > 10 &&
      consent &&
      !isSubmitting
    );
  }, [contactName, country, city, socialLink, email, telegram, phone, why, consent, isSubmitting]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    const hasContact = Boolean(email.trim() || telegram.trim() || phone.trim());
    if (!hasContact) {
      setResult({ ok: false, error: t('clubs_form_err_contact') });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...buildCommonMeta('ambassador', preferredLang),

        consent: true,

        contactName: contactName.trim(),
        email: email.trim() || undefined,
        telegram: telegram.trim() || undefined,
        phone: phone.trim() || undefined,

        country: country.trim().toUpperCase(),
        city: city.trim(),
        region: undefined,

        subject: 'Ambassador application',
        message: why.trim(),

        payload: {
          social: socialLink.trim(),
          languages: languages.trim() || undefined,
          why: why.trim(),
        },
      };

      const r = await submitIntake(payload);
      setResult(r);

      if (r.ok) {
        setContactName('');
        setEmail('');
        setTelegram('');
        setPhone('');
        setSocialLink('');
        setLanguages('');
        setWhy('');
        setConsent(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {/* Honeypot */}
      <input
        type="text"
        name="hp"
        value=""
        onChange={() => {}}
        className="hidden"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={t('amb_form_name')}>
          <input className={inputBase()} value={contactName} onChange={(e) => setContactName(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_country')} hint={t('clubs_form_country_hint')}>
          <input className={inputBase()} value={country} onChange={(e) => setCountry(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_city')}>
          <input className={inputBase()} value={city} onChange={(e) => setCity(e.target.value)} />
        </Field>

        <Field label={t('amb_form_social')} hint={t('amb_form_social_hint')}>
          <input className={inputBase()} value={socialLink} onChange={(e) => setSocialLink(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_email')} hint={t('clubs_form_one_of')}>
          <input className={inputBase()} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_telegram')} hint={t('clubs_form_one_of')}>
          <input className={inputBase()} value={telegram} onChange={(e) => setTelegram(e.target.value)} />
        </Field>

        <Field label={t('clubs_form_phone')} hint={t('clubs_form_one_of')}>
          <input className={inputBase()} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>

        <Field label={t('amb_form_languages')} hint={t('clubs_form_optional')}>
          <input className={inputBase()} value={languages} onChange={(e) => setLanguages(e.target.value)} />
        </Field>
      </div>

      <Field label={t('amb_form_why')}>
        <textarea className={textAreaBase()} value={why} onChange={(e) => setWhy(e.target.value)} />
      </Field>

      <label className="flex items-start gap-2 text-sm text-zinc-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>{t('clubs_form_consent')}</span>
      </label>

      {result ? (
        <div
          className={[
            'rounded-xl border px-3 py-2 text-sm',
            result.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-red-200 bg-red-50 text-red-900',
          ].join(' ')}
        >
          {result.ok ? t('amb_form_success') : result.error}
        </div>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
        {isSubmitting ? t('clubs_form_sending') : t('amb_form_submit')}
      </button>
    </form>
  );
}
