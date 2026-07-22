// components/profile/CompanyProfileForm.tsx
'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { api } from '@/lib/api';
import type { CompanyProfile } from '@/lib/api';
import { useI18n } from '@/hooks/useI18n';
import { CountrySelect } from '@/components/ui/CountrySelect';

type Mode = 'view' | 'edit';

type ApiOk<T extends object> = { ok: true } & T;
type ApiErr = { ok: false; error?: string };

type CompanyProfileResp =
  | ApiOk<{ accountType: 'person' | 'company'; companyProfile: CompanyProfile }>
  | ApiErr;

const EMPTY: CompanyProfile = {
  companyName: '',
  registryCode: '',
  vatNumber: '',
  country: '',
  legalAddress: '',
  contactPerson: '',
  contactEmail: '',
  website: '',
  sponsorshipPurpose: '',
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function hasOkFlag(v: unknown): v is { ok: boolean } {
  return isObject(v) && typeof (v as { ok?: unknown }).ok === 'boolean';
}

function isCompanyProfileResp(v: unknown): v is CompanyProfileResp {
  return hasOkFlag(v);
}

function normalizeProfile(p: Partial<CompanyProfile> | undefined): CompanyProfile {
  return {
    ...EMPTY,
    ...(p ?? {}),
  };
}

function isCompanyProfileComplete(p: CompanyProfile): boolean {
  return Boolean(p.companyName && p.registryCode && p.country && p.contactPerson);
}

function isCompanyProfileEmpty(p: CompanyProfile): boolean {
  return !(p.companyName || p.registryCode || p.country || p.contactPerson);
}

function Req({ children }: { children: React.ReactNode }) {
  return <span className="after:content-['*'] after:text-red-600 after:ml-1">{children}</span>;
}

function ViewRow({
  label,
  value,
  missing,
}: {
  label: string;
  value: string;
  missing?: boolean;
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
      <span className={missing ? 'text-sm opacity-80 italic' : 'text-sm text-right break-words'}>
        {value || '—'}
      </span>
    </div>
  );
}

export function CompanyProfileForm() {
  const { t } = useI18n();

  const tr = useCallback(
    (key: string, fallback: string) => {
      const v = t(key);
      return v && v !== key ? v : fallback;
    },
    [t],
  );

  const [mode, setMode] = useState<Mode>('view');
  const [data, setData] = useState<CompanyProfile>(EMPTY);
  const [initial, setInitial] = useState<CompanyProfile>(EMPTY);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showSavedBanner, setShowSavedBanner] = useState(false);

    useEffect(() => {
      (async () => {
        try {
          const raw = (await api.companyProfile.get()) as unknown;

          if (isCompanyProfileResp(raw) && raw.ok) {
            const next = normalizeProfile(raw.companyProfile);
            setData(next);
            setInitial(next);
            setMode(isCompanyProfileEmpty(next) ? 'edit' : 'view');
            setError(null);
          } else {
            setError('Failed to load company profile.');
          }
        } catch (e: unknown) {
          setError(e instanceof Error ? e.message : 'Failed to load company profile.');
        } finally {
          setLoading(false);
        }
      })();
    }, []);

  useEffect(() => {
    if (!showSavedBanner) return;
    const timer = window.setTimeout(() => setShowSavedBanner(false), 3000);
    return () => window.clearTimeout(timer);
  }, [showSavedBanner]);

  const completeRequired = useMemo(() => isCompanyProfileComplete(data), [data]);

  const setField = <K extends keyof CompanyProfile>(key: K, value: CompanyProfile[K]) => {
    setSaved(false);
    setData((d) => ({ ...d, [key]: value }));
  };

  const onChange =
    (key: keyof CompanyProfile) =>
    (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setField(key, e.target.value);
    };

  const onReset = () => {
    setData(initial);
    setSaved(false);
    setError(null);
  };

  const onCancelEdit = () => {
    setData(initial);
    setError(null);
    setSaved(false);
    setMode(isCompanyProfileComplete(initial) ? 'view' : 'edit');
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    try {
      if (!isCompanyProfileComplete(data)) {
        setError(tr('companyProfile.requiredMissing', 'Please fill all required company fields.'));
        setSaving(false);
        return;
      }

      const raw = (await api.companyProfile.save(data)) as unknown;

      if (isCompanyProfileResp(raw) && raw.ok) {
        setInitial(data);
        setSaved(true);
        setShowSavedBanner(true);
        setMode('view');
      } else {
        setError(tr('companyProfile.saveError', 'Failed to save company profile.'));
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : tr('companyProfile.saveError', 'Failed to save company profile.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-2xl border bg-[var(--card)] shadow p-4 text-sm">
        {tr('companyProfile.loading', 'Loading company profile...')}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showSavedBanner && (
        <div className="rounded-2xl border border-emerald-300/70 bg-emerald-50/80 text-emerald-900 dark:border-emerald-500/35 dark:bg-emerald-950/20 dark:text-emerald-100 px-4 py-2 text-xs flex items-center justify-between">
          <span className="font-medium">{tr('companyProfile.saved', 'Company profile saved')}</span>
          <span className="opacity-70">{tr('companyProfile.savedHint', 'Corporate data has been stored.')}</span>
        </div>
      )}

      {mode === 'view' && (
        <div className="card p-5 space-y-5 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide opacity-60">
                {tr('companyProfile.title', 'Company profile')}
              </div>
              <div className="text-lg font-semibold leading-tight break-words mt-1">
                {data.companyName || tr('companyProfile.title', 'Company profile')}
              </div>
              <div className="text-xs opacity-60 mt-1">
                {completeRequired
                  ? tr('companyProfile.readyHint', 'Company profile is ready for sponsorship and NFT purchases.')
                  : tr('companyProfile.needsHint', 'Complete required company data to continue.')}
              </div>
            </div>

            <button type="button" className="btn btn-outline" onClick={() => setMode('edit')}>
              {t('common.edit')}
            </button>
          </div>

          <div className="grid grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(260px,1fr))] gap-3">
            <ViewRow
              label={tr('companyProfile.companyName', 'Company name')}
              value={data.companyName ?? ''}
              missing={!data.companyName}
            />
            <ViewRow
              label={tr('companyProfile.registryCode', 'Registry code')}
              value={data.registryCode ?? ''}
              missing={!data.registryCode}
            />
            <ViewRow
              label={tr('companyProfile.vatNumber', 'VAT number')}
              value={data.vatNumber ?? ''}
            />
            <ViewRow
              label={tr('companyProfile.country', 'Country')}
              value={data.country ?? ''}
              missing={!data.country}
            />
            <ViewRow
              label={tr('companyProfile.contactPerson', 'Contact person')}
              value={data.contactPerson ?? ''}
              missing={!data.contactPerson}
            />
            <ViewRow
              label={tr('companyProfile.contactEmail', 'Contact email')}
              value={data.contactEmail ?? ''}
            />
            <ViewRow
              label={tr('companyProfile.website', 'Website')}
              value={data.website ?? ''}
            />
            <ViewRow
              label={tr('companyProfile.legalAddress', 'Legal address')}
              value={data.legalAddress ?? ''}
            />
          </div>

          {data.sponsorshipPurpose && (
            <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--card)] p-4">
              <div className="text-[11px] uppercase tracking-wide opacity-60">
                {tr('companyProfile.sponsorshipPurpose', 'Sponsorship / charity purpose')}
              </div>
              <div className="mt-2 text-sm whitespace-pre-wrap">{data.sponsorshipPurpose}</div>
            </div>
          )}

          {error && <div className="text-red-600 text-xs">{error}</div>}
        </div>
      )}

      {mode === 'edit' && (
        <form onSubmit={onSubmit} className="card p-5 space-y-5 text-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="text-[11px] uppercase tracking-wide opacity-60">
                {tr('companyProfile.editTitle', 'Edit company profile')}
              </div>
              <div className="text-xs opacity-60 mt-1">
                {tr('companyProfile.editHint', 'This profile is used for corporate NFT purchases and future club sponsorship.')}
              </div>
            </div>

            {isCompanyProfileComplete(initial) && (
              <button type="button" className="btn btn-outline" onClick={onCancelEdit} disabled={saving}>
                {t('common.cancel')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:[grid-template-columns:repeat(auto-fit,minmax(280px,1fr))] gap-3">
            <label className="label min-w-0">
              <span>
                <Req>{tr('companyProfile.companyName', 'Company name')}</Req>
              </span>
              <input
                className="input w-full"
                value={data.companyName ?? ''}
                onChange={onChange('companyName')}
                disabled={saving}
              />
            </label>

            <label className="label min-w-0">
              <span>
                <Req>{tr('companyProfile.registryCode', 'Registry code')}</Req>
              </span>
              <input
                className="input w-full"
                value={data.registryCode ?? ''}
                onChange={onChange('registryCode')}
                disabled={saving}
              />
            </label>

            <label className="label min-w-0">
              <span>{tr('companyProfile.vatNumber', 'VAT number')}</span>
              <input
                className="input w-full"
                value={data.vatNumber ?? ''}
                onChange={onChange('vatNumber')}
                disabled={saving}
              />
            </label>

            <div className="min-w-0">
              <CountrySelect
                label={tr('companyProfile.country', 'Country')}
                required
                value={data.country ?? ''}
                onChange={(code) => setField('country', code)}
                placeholder={tr('companyProfile.countryPlaceholder', 'Select country')}
                className="w-full"
              />
            </div>

            <label className="label min-w-0">
              <span>
                <Req>{tr('companyProfile.contactPerson', 'Contact person')}</Req>
              </span>
              <input
                className="input w-full"
                value={data.contactPerson ?? ''}
                onChange={onChange('contactPerson')}
                disabled={saving}
              />
            </label>

            <label className="label min-w-0">
              <span>{tr('companyProfile.contactEmail', 'Contact email')}</span>
              <input
                type="email"
                className="input w-full"
                value={data.contactEmail ?? ''}
                onChange={onChange('contactEmail')}
                disabled={saving}
              />
            </label>

            <label className="label min-w-0 md:col-span-full">
              <span>{tr('companyProfile.legalAddress', 'Legal address')}</span>
              <input
                className="input w-full"
                value={data.legalAddress ?? ''}
                onChange={onChange('legalAddress')}
                disabled={saving}
              />
            </label>

            <label className="label min-w-0 md:col-span-full">
              <span>{tr('companyProfile.website', 'Website')}</span>
              <input
                className="input w-full"
                value={data.website ?? ''}
                onChange={onChange('website')}
                disabled={saving}
                placeholder="https://example.com"
              />
            </label>

            <label className="label min-w-0 md:col-span-full">
              <span>{tr('companyProfile.sponsorshipPurpose', 'Sponsorship / charity purpose')}</span>
              <textarea
                className="textarea w-full min-h-[110px]"
                value={data.sponsorshipPurpose ?? ''}
                onChange={onChange('sponsorshipPurpose')}
                disabled={saving}
              />
            </label>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {saved && <span className="text-emerald-600 text-xs">{tr('companyProfile.saved', 'Company profile saved')}</span>}
              {error && <span className="text-red-600 text-xs">{error}</span>}
            </div>

            <div className="flex items-center gap-2">
              <button type="button" onClick={onReset} className="btn btn-outline" disabled={saving}>
                {tr('common.reset', 'Reset')}
              </button>

              {isCompanyProfileComplete(initial) && (
                <button type="button" onClick={onCancelEdit} className="btn btn-outline" disabled={saving}>
                  {tr('common.cancel', 'Cancel')}
                </button>
              )}

              <button type="submit" disabled={saving} className="btn btn-primary">
                {saving ? tr('companyProfile.saving', 'Saving...') : tr('companyProfile.save', 'Save company profile')}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}