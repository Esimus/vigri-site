'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Profile } from '@/lib/api';
import { api } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { CountrySelect } from '@/components/ui/CountrySelect';
import { AvatarUploader } from '@/components/profile/AvatarUploader';
import { PHONE_CODES, getDialByCountry, getIsoByDial, formatLocalByIso } from '@/constants/phoneCodes';

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
  photo: null as any,
};

function Req({ children }: { children: React.ReactNode }) {
  return <span className="after:content-['*'] after:text-red-600 after:ml-1">{children}</span>;
}

function normalizeDate(v?: string): string {
  if (!v) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const m = v.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const d = m[1].padStart(2, '0');
    const mo = m[2].padStart(2, '0');
    const y = m[3];
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
  if (m) return { code: m[1], local: (m[2] || '').trim() };
  return { code: '', local: s };
}

export function ProfileForm() {
  const { t } = useI18n();

  const [data, setData] = useState<Profile>(EMPTY);
  const [initial, setInitial] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // phone UI
  const [phoneCode, setPhoneCode] = useState<string>('');
  const [phoneLocalRaw, setPhoneLocalRaw] = useState<string>('');
  const [phoneLocalMasked, setPhoneLocalMasked] = useState<string>('');

  const phoneIso = useMemo(() => {
    if (data.countryResidence) return data.countryResidence;
    const iso = getIsoByDial(phoneCode);
    return iso || '';
  }, [data.countryResidence, phoneCode]);

  // LOAD ONCE
  useEffect(() => {
    (async () => {
      try {
        const r = await api.profile.get();
        if ((r as any)?.ok) {
          const prof = { ...EMPTY, ...(r as any).profile };
          if (!prof.countryResidence && (prof as any).country) prof.countryResidence = (prof as any).country;
          if (prof.birthDate) prof.birthDate = normalizeDate(prof.birthDate);
          if (!prof.language) prof.language = 'en';
          setData(prof);
          setInitial(prof);

          const p = splitPhone(prof.phone);
          const iso = prof.countryResidence || getIsoByDial(p.code);
          const dial = p.code || (prof.countryResidence ? getDialByCountry(prof.countryResidence) : '');
          setPhoneCode(dial);
          setPhoneLocalRaw(p.local);
          setPhoneLocalMasked(formatLocalByIso(iso, p.local));
        } else {
          setError(t('profile.form.loadError'));
        }
      } catch (e: any) {
        setError(e?.message || t('profile.form.loadError'));
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When residence changes: set dial & re-mask
  useEffect(() => {
    if (!data.countryResidence) return;
    const dial = getDialByCountry(data.countryResidence);
    setPhoneCode(dial || '');
    setPhoneLocalMasked(formatLocalByIso(data.countryResidence, phoneLocalRaw));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.countryResidence]);

  const onChange =
    (key: keyof Profile) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setSaved(false);
      let val = e.target.value;
      if (key === 'birthDate') val = normalizeDate(val);
      setData((d) => ({ ...d, [key]: val }));
    };

  const setField = (key: keyof Profile, value: string | null) => {
    setSaved(false);
    setData((d) => ({ ...d, [key]: value ?? undefined }));
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
    const p = splitPhone(initial.phone);
    const iso = initial.countryResidence || getIsoByDial(p.code);
    setPhoneCode(p.code || (initial.countryResidence ? getDialByCountry(initial.countryResidence) : ''));
    setPhoneLocalRaw(p.local);
    setPhoneLocalMasked(formatLocalByIso(iso, p.local));
    setSaved(false);
    setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      if (!data.firstName || !data.lastName || !data.birthDate || !data.addressCity || !data.countryResidence) {
        setError(t('profile.form.saveError') + ' (required fields missing)');
        setSaving(false);
        return;
      }
      const local = phoneLocalMasked.trim();
      const composedPhone = (phoneCode ? phoneCode.trim() + (local ? ' ' : '') : '') + local;
      const payload: Profile = { ...data, birthDate: normalizeDate(data.birthDate), phone: composedPhone };
      const r = await api.profile.save(payload);
      if ((r as any)?.ok) {
        setSaved(true);
        setInitial(payload);
      } else {
        setError(t('profile.form.saveError'));
      }
    } catch (e: any) {
      setError(e?.message || t('profile.form.saveError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border bg-white shadow p-4 text-sm">{t('profile.form.loading')}</div>;
  }

  return (
    <form onSubmit={onSubmit} className="card p-5 space-y-6 text-sm">
      {/* === LAYOUT: left fixed avatar, right flexible form === */}
      <div className="flex flex-col md:flex-row items-start gap-6">
        {/* Left: avatar card */}
        <div className="w-full md:w-[220px] shrink-0">
          <div className="card p-3">
            <AvatarUploader
              label={t('profile.form.photoLabel')}
              value={data.photo ?? null}
              onChange={(v) => setField('photo', v)}
              maxKB={120}
              size={160}
              note={t('profile.form.photoNote')}
              uploadText={t('profile.form.upload')}
              resetText={t('common.reset')}
            />
          </div>
        </div>

        {/* Right: form grid */}
        <div className="flex-1 min-w-0">
          {/* Responsive auto-fit grid:
             - from md: packs as many 280px columns as fit
             - gracefully falls back to one column when space is tight */}
          <div className="grid grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] gap-3 min-w-0">
            {/* Names + birth */}
            <label className="label min-w-0">
              <span><Req>{t('profile.form.firstName')}</Req></span>
              <input className="input w-full" value={data.firstName ?? ''} onChange={onChange('firstName')} />
            </label>
            <label className="label min-w-0">
              <span>{t('profile.form.middleName')}</span>
              <input className="input w-full" value={data.middleName ?? ''} onChange={onChange('middleName')} />
            </label>
            <label className="label min-w-0">
              <span><Req>{t('profile.form.lastName')}</Req></span>
              <input className="input w-full" value={data.lastName ?? ''} onChange={onChange('lastName')} />
            </label>
            <label className="label min-w-0">
              <span><Req>{t('profile.form.birthDate')}</Req></span>
              <div className="space-y-1 w-full">
                <input
                  type="date"
                  className="input font-mono w-full"
                  placeholder="YYYY-MM-DD"
                  inputMode="numeric"
                  pattern="\d{4}-\d{2}-\d{2}"
                  value={data.birthDate ?? ''}
                  onChange={onChange('birthDate')}
                />
                <span className="form-help">{t('profile.form.birthDateFormat') || 'Format'}: YYYY-MM-DD</span>
              </div>
            </label>

            {/* Countries */}
            <div className="min-w-0">
              <CountrySelect
                label={t('profile.form.countryResidence')}
                required
                value={data.countryResidence ?? ''}
                onChange={(code) => setField('countryResidence', code)}
                placeholder={t('profile.form.hint.countryResidence')}
                className="w-full"
              />
            </div>
            <div className="min-w-0">
              <CountrySelect
                label={t('profile.form.countryTax')}
                value={data.countryTax ?? ''}
                onChange={(code) => setField('countryTax', code)}
                placeholder={t('profile.form.hint.countryTax')}
                className="w-full"
              />
            </div>

            {/* Street — always full width on md+ */}
            <label className="label md:col-span-full min-w-0">
              <span>{t('profile.form.addressStreet')}</span>
              <input
                className="input w-full"
                placeholder={t('profile.form.placeholder.street')}
                value={data.addressStreet ?? ''}
                onChange={onChange('addressStreet')}
              />
            </label>

            {/* Region + City share a row when there is room */}
            <label className="label min-w-0">
              <span>{t('profile.form.addressRegion')}</span>
              <input
                className="input w-full"
                placeholder={t('profile.form.placeholder.region')}
                value={data.addressRegion ?? ''}
                onChange={onChange('addressRegion')}
              />
            </label>
            <label className="label min-w-0">
              <span><Req>{t('profile.form.addressCity')}</Req></span>
              <input
                className="input w-full"
                placeholder={t('profile.form.placeholder.city')}
                value={data.addressCity ?? ''}
                onChange={onChange('addressCity')}
              />
            </label>
          </div>

          {/* Postal + Phone + Language */}
          <div className="mt-3 space-y-3 min-w-0">
            {/* Postal + Phone: first column is flexible 160–220px */}
            <div className="grid grid-cols-1 lg:[grid-template-columns:minmax(160px,220px)_1fr] gap-3 min-w-0">
              {/* Postal code */}
              <label className="label min-w-0">
                <span>{t('profile.form.addressPostal')}</span>
                <input
                  className="input w-full"
                  placeholder={t('profile.form.placeholder.postal')}
                  value={data.addressPostal ?? ''}
                  onChange={onChange('addressPostal')}
                  maxLength={20}
                />
              </label>

              {/* Phone */}
                <label className="label min-w-0">
                  <span>{t('profile.form.phone')}</span>
                    <div className="flex min-w-0 w-full gap-2 flex-nowrap">
                    <select
                      className="select w-[84px] lg:w-[96px] basis-[84px] lg:basis-[96px] shrink-0 truncate"
                      value={phoneCode}
                      onChange={(e) => onPhoneCodeChange(e.target.value)}
                      data-empty={phoneCode === ''}   /* grey placeholder "Code" */
                    >
                      <option value="">{t('profile.form.phoneCode')}</option>
                      {PHONE_CODES.map((pc) => (
                        <option key={`${pc.code}-${pc.dial}`} value={pc.dial}>
                          {pc.label}
                        </option>
                      ))}
                    </select>
                    <input
                      className="input flex-1 min-w-0 w-full"
                      placeholder={t('profile.form.placeholder.phone')}
                      value={phoneLocalMasked}
                      onChange={(e) => onPhoneLocalChange(e.target.value)}
                      maxLength={200}
                    />
                    </div>
                </label>
            
            {/* Language */}
            <div className="min-w-0">
              <label className="label min-w-0">
                <span>{t('profile.form.languagePreferred')}</span>
                <div className="space-y-1 w-full">
                  <select
                    className="select w-full"
                    value={data.language ?? 'en'}
                    onChange={onChange('language')}
                  >
                    <option value="en">{t('lang.en')}</option>
                    <option value="ru">{t('lang.ru')}</option>
                    <option value="et">{t('lang.et')}</option>
                  </select>
                  <span className="form-help">{t('profile.form.languageHelp')}</span>
                </div>
              </label>
            </div></div>
          </div>
        </div>
      </div>

      {/* bottom actions + status */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {saved && <span className="text-emerald-600 text-xs">{t('profile.form.saved')}</span>}
          {error && <span className="text-red-600 text-xs">{error}</span>}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onReset} className="btn btn-outline">
            {t('common.reset')}
          </button>
          <button type="submit" disabled={saving} className="btn btn-primary">
            {saving ? t('profile.form.saving') : t('profile.form.save')}
          </button>
        </div>
      </div>
    </form>
  );
}
