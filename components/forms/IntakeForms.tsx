// components/forms/IntakeForms.tsx
'use client';

import { useMemo, useState } from 'react';

type IntakeKind = 'club_pilot' | 'ambassador' | 'club_gift' | 'faq_question' | 'other';
type ClubCategory = 'sport' | 'dance' | 'music' | 'art';

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
  const [clubCategory, setClubCategory] = useState<ClubCategory | ''>('');
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
      !!clubCategory &&
      country.trim().length > 1 &&
      city.trim().length > 1 &&
      contactName.trim().length > 1 &&
      hasContact &&
      whyJoined.trim().length > 10 &&
      consent &&
      !isSubmitting
    );
  }, [clubName, clubCategory, country, city, contactName, email, telegram, phone, whyJoined, consent, isSubmitting]);

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
          category: clubCategory,
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
        setClubCategory('');
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

        <Field label={t('clubs_form_category')}>
          <select
            className={inputBase()}
            value={clubCategory}
            onChange={(e) => setClubCategory(e.target.value as ClubCategory | '')}
          >
            <option value="">{t('clubs_form_category_placeholder')}</option>
            <option value="sport">{t('clubs_filter_sport')}</option>
            <option value="dance">{t('clubs_filter_dance')}</option>
            <option value="music">{t('clubs_filter_music')}</option>
            <option value="art">{t('clubs_filter_art')}</option>
          </select>
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
        <textarea
          className={textAreaBase()}
          value={whyJoined}
          onChange={(e) => setWhyJoined(e.target.value)}
          placeholder={t('clubs_form_why_placeholder')}
        />
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

type ClubGiftAction = 'nft' | 'tokens';

export function ClubGiftForm({
  t,
  preferredLang,
  clubs,
}: {
  t: (key: string) => string;
  preferredLang?: string;
  clubs: Array<{ name: string }>;
}) {
  const tf = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<IntakeResponse | null>(null);

  const [giftType, setGiftType] = useState<ClubGiftAction>('nft');
  const [clubName, setClubName] = useState('');
  const [tokenAmount, setTokenAmount] = useState('');

  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [telegram, setTelegram] = useState('');
  const [phone, setPhone] = useState('');

  const [note, setNote] = useState('');
  const [consent, setConsent] = useState(false);

  const hasClubs = clubs.length > 0;

  const tokenAmountNumber = Number(tokenAmount.trim());
  const hasValidTokenAmount =
    giftType === 'nft' ||
    (Number.isFinite(tokenAmountNumber) && tokenAmountNumber > 0);

  const canSubmit = useMemo(() => {
    const hasContact = Boolean(email.trim() || telegram.trim() || phone.trim());
    return (
      hasClubs &&
      clubName.trim().length > 1 &&
      contactName.trim().length > 1 &&
      hasContact &&
      hasValidTokenAmount &&
      consent &&
      !isSubmitting
    );
  }, [
    hasClubs,
    clubName,
    contactName,
    email,
    telegram,
    phone,
    hasValidTokenAmount,
    consent,
    isSubmitting,
  ]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setResult(null);

    if (!hasClubs) {
      setResult({ ok: false, error: tf('clubs_gift_form_err_no_clubs', 'No clubs are available yet.') });
      return;
    }

    const hasContact = Boolean(email.trim() || telegram.trim() || phone.trim());
    if (!hasContact) {
      setResult({ ok: false, error: t('clubs_form_err_contact') });
      return;
    }

    if (!clubName.trim()) {
      setResult({ ok: false, error: tf('clubs_gift_form_err_club', 'Please select a club.') });
      return;
    }

    if (!hasValidTokenAmount) {
      setResult({
        ok: false,
        error: tf('clubs_gift_form_err_amount', 'Please enter a valid amount of VIGRI tokens.'),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        ...buildCommonMeta('club_gift', preferredLang),

        consent: true,

        contactName: contactName.trim(),
        email: email.trim() || undefined,
        telegram: telegram.trim() || undefined,
        phone: phone.trim() || undefined,

        country: undefined,
        city: undefined,
        region: undefined,

        subject: giftType === 'nft' ? 'Club gift request (NFT)' : 'Club gift request (tokens)',
        message:
          note.trim() ||
          (giftType === 'nft'
            ? `NFT gift request for ${clubName.trim()}`
            : `Token gift request for ${clubName.trim()}: ${tokenAmount.trim()} VIGRI`),

        payload: {
          clubName: clubName.trim(),
          giftType,
          tokenAmount: giftType === 'tokens' ? tokenAmount.trim() : undefined,
          note: note.trim() || undefined,
        },
      };

      const r = await submitIntake(payload);
      setResult(r);

      if (r.ok) {
        setGiftType('nft');
        setClubName('');
        setTokenAmount('');
        setContactName('');
        setEmail('');
        setTelegram('');
        setPhone('');
        setNote('');
        setConsent(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
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

      {!hasClubs ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          {tf('clubs_gift_form_no_clubs', 'No clubs are available for gifting yet.')}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label={tf('clubs_gift_form_action', 'Gift type')}>
          <select
            className={inputBase()}
            value={giftType}
            onChange={(e) => setGiftType(e.target.value as ClubGiftAction)}
          >
            <option value="nft">{tf('clubs_gift_form_action_nft', 'Assign a VIGRI NFT')}</option>
            <option value="tokens">{tf('clubs_gift_form_action_tokens', 'Assign VIGRI tokens')}</option>
          </select>
        </Field>

        <Field label={tf('clubs_gift_form_club', 'Club')}>
          <select
            className={inputBase()}
            value={clubName}
            onChange={(e) => setClubName(e.target.value)}
            disabled={!hasClubs}
          >
            <option value="">{tf('clubs_gift_form_club_placeholder', 'Select a club')}</option>
            {clubs.map((club) => (
              <option key={club.name} value={club.name}>
                {club.name}
              </option>
            ))}
          </select>
        </Field>

        {giftType === 'tokens' ? (
          <Field label={tf('clubs_gift_form_amount', 'VIGRI amount')}>
            <input
              className={inputBase()}
              value={tokenAmount}
              onChange={(e) => setTokenAmount(e.target.value)}
              placeholder={tf('clubs_gift_form_amount_placeholder', 'e.g. 5000')}
              inputMode="decimal"
            />
          </Field>
        ) : null}

        <Field label={tf('clubs_gift_form_contact_name', 'Your name')}>
          <input
            className={inputBase()}
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
          />
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
      </div>

      <Field
        label={tf('clubs_gift_form_note', 'Comment')}
        hint={tf(
          'clubs_gift_form_note_hint',
          'Optional: add a short note about the gift or how you would like it to be assigned.',
        )}
      >
        <textarea
          className={textAreaBase()}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
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
            result.ok
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-red-200 bg-red-50 text-red-900',
          ].join(' ')}
        >
          {result.ok
            ? tf('clubs_gift_form_success', 'Your gift request has been sent.')
            : result.error}
        </div>
      ) : null}

      <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
        {isSubmitting
          ? t('clubs_form_sending')
          : tf('clubs_gift_form_submit', 'Send gift request')}
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
