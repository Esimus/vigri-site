// app/clubs/page.tsx
'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';
import PublicHeader from '@/components/layout/PublicHeader';
import { AmbassadorForm, ClubGiftForm, ClubPilotForm } from '@/components/forms/IntakeForms';

type ClubCategory = 'sport' | 'dance' | 'music' | 'art';

type Club = {
  id: string;
  name: string;
  slug: string | null;
  category: ClubCategory | null;
  city?: string | null;
  country?: string | null;
  website?: string | null;
  instagram?: string | null;
  email?: string | null;
  quote: string | null;
  logoUrl?: string | null;
  logoAlt?: string | null;
  pilotPhotoUrl?: string | null;
  pilotPhotoAlt?: string | null;
  pilotPhotoCaption?: string | null;
  pilotBadge?: string | null;
  pilotSinceMonth?: string | null;
  verifiedInPerson?: boolean;
  nftCount?: number;
  vigriAllocation?: number;
};

type Ambassador = {
  name: string;
  location?: string;
  social?: string;
  quote: string;
};

type PilotClubsApiResponse =
  | { ok: true; items: Club[] }
  | { ok: false; error?: string };

const AMBASSADORS: Ambassador[] = [];

type Tab = 'pilot' | 'clubs' | 'ambassadors';

function normalizeTab(v: string | null): Tab {
  if (v === 'clubs' || v === 'ambassadors') return v;
  return 'pilot';
}

export default function ClubsPage() {
  const { t, lang } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();

  const tab = normalizeTab(sp.get('tab'));

  type CategoryFilter = 'all' | ClubCategory;
  const [clubFilter, setClubFilter] = useState<CategoryFilter>('all');
  const [pilotClubs, setPilotClubs] = useState<Club[]>([]);
  const [pilotClubsLoading, setPilotClubsLoading] = useState(false);

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isAmbApplyOpen, setIsAmbApplyOpen] = useState(false);
  const [isGiftOpen, setIsGiftOpen] = useState(false);
  const [isGiftCardOpen, setIsGiftCardOpen] = useState(false);

  const [applyFormKey, setApplyFormKey] = useState(0);
  const [ambFormKey, setAmbFormKey] = useState(0);

  const applyFormRef = useRef<HTMLDivElement | null>(null);
  const ambFormRef = useRef<HTMLDivElement | null>(null);

  const safeT = (key: string, fallback: string) => {
    const v = t(key);
    return v === key ? fallback : v;
  };

  const badge =
    tab === 'pilot'
      ? t('clubs_tab_pilot')
      : tab === 'clubs'
        ? t('clubs_tab_clubs')
        : t('clubs_tab_ambassadors');

  function pushWithTab(next: Tab) {
    const params = new URLSearchParams(sp.toString());
    params.set('tab', next);
    const qs = params.toString();
    router.push(`/clubs${qs ? `?${qs}` : ''}`, { scroll: false });
  }

  function openApply() {
    if (tab !== 'pilot') {
      pushWithTab('pilot');
    }
    setIsApplyOpen(true);

    setTimeout(() => {
      applyFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

  function openAmbApply() {
    setIsAmbApplyOpen(true);

    setTimeout(() => {
      ambFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  }

    useEffect(() => {
    let cancelled = false;

    async function loadPilotClubs() {
      setPilotClubsLoading(true);

      try {
        const res = await fetch('/api/pilot-clubs?limit=100', {
          cache: 'no-store',
        });

        const json = (await res.json()) as PilotClubsApiResponse;

        if (!cancelled) {
          if (json.ok) {
            setPilotClubs(json.items);
          } else {
            setPilotClubs([]);
          }
        }
      } catch {
        if (!cancelled) {
          setPilotClubs([]);
        }
      } finally {
        if (!cancelled) {
          setPilotClubsLoading(false);
        }
      }
    }

    loadPilotClubs();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <PublicHeader />

      <main className="page-bg min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
          {/* Page header */}
          <header>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">{badge}</p>

            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
              {t('clubs_title')}
            </h1>

            <p className="mt-3 text-sm text-zinc-600 max-w-2xl">{t('clubs_intro')}</p>

            {/* Top buttons (these ARE the tabs now) */}
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                className={tab === 'pilot' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => pushWithTab('pilot')}
              >
                {t('clubs_tab_pilot')}
              </button>

              <button
                type="button"
                className={tab === 'clubs' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => pushWithTab('clubs')}
              >
                {t('clubs_cta_view_pilots')}
              </button>

              <button
                type="button"
                className={tab === 'ambassadors' ? 'btn btn-primary' : 'btn btn-outline'}
                onClick={() => pushWithTab('ambassadors')}
              >
                {t('clubs_cta_ambassadors')}
              </button>
            </div>
          </header>

          {/* TAB: Pilot */}
          {tab === 'pilot' && (
            <section className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <article className="card p-4 sm:p-5">
                  <h2 className="text-sm font-semibold text-zinc-800">
                    {t('clubs_about_platform_title')}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">{t('clubs_about_platform_body')}</p>
                </article>

                <article className="card p-4 sm:p-5">
                  <h2 className="text-sm font-semibold text-zinc-800">
                    {t('clubs_about_pilot_title')}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-600">{t('clubs_about_pilot_body')}</p>
                </article>
              </div>

              {/* Apply card: collapsed by default */}
              <article id="apply" className="card p-4 sm:p-5 scroll-mt-24">
                <h2 className="text-sm font-semibold text-zinc-800">{t('clubs_apply_title')}</h2>
                <p className="mt-2 text-sm text-zinc-600">{t('clubs_apply_intro')}</p>

                <div className="mt-4">
                  {!isApplyOpen ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openApply}
                      aria-expanded="false"
                    >
                      {t('clubs_cta_apply')}
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setIsApplyOpen(false)}
                      >
                        {t('clubs_form_collapse')}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setApplyFormKey((k) => k + 1)}
                      >
                        {t('clubs_form_reset')}
                      </button>
                    </div>
                  )}

                  <div
                    ref={applyFormRef}
                    className={isApplyOpen ? 'mt-4 scroll-mt-24' : 'mt-4 hidden'}
                  >
                    <ClubPilotForm key={`club-${applyFormKey}`} t={t} preferredLang={lang} />
                  </div>
                </div>
              </article>

              {/* Next steps */}
              <article className="card p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-zinc-800">{t('clubs_next_title')}</h2>
                <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                  <li>• {t('clubs_next_1')}</li>
                  <li>• {t('clubs_next_2')}</li>
                  <li>• {t('clubs_next_3')}</li>
                </ul>
              </article>
            </section>
          )}

          {/* TAB: Clubs */}
          {tab === 'clubs' && (
            <section className="space-y-4">
              <article className="card p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-zinc-800">{t('clubs_gift_title')}</h2>

                <div className="mt-2 md:hidden">
                  <div className="relative">
                    <div
                      className={
                        isGiftCardOpen
                          ? 'text-sm text-zinc-600'
                          : 'max-h-[4.8rem] overflow-hidden text-sm text-zinc-600'
                      }
                    >
                      <p>{t('clubs_gift_body')}</p>
                    </div>

                    {!isGiftCardOpen && (
                      <div
                        className="pointer-events-none absolute inset-x-0 bottom-0 h-10 fade-curtain"
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <button
                    type="button"
                    className="mt-2 inline-flex items-center gap-1 text-xs link-accent"
                    onClick={() => setIsGiftCardOpen((v) => !v)}
                  >
                    {isGiftCardOpen
                      ? (t('nft.read_less') ?? 'Show less')
                      : (t('nft.read_more') ?? 'Show more')}
                    <span aria-hidden>{isGiftCardOpen ? '↑' : '↓'}</span>
                  </button>
                </div>

                <p className="mt-2 hidden text-sm text-zinc-600 md:block">{t('clubs_gift_body')}</p>

                <div className="mt-4">
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => setIsGiftOpen(true)}
                  >
                    {t('clubs_gift_cta')}
                  </button>
                </div>
              </article>

              <h2 className="text-sm font-semibold text-zinc-800">{t('clubs_pilot_title')}</h2>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={clubFilter === 'all' ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => setClubFilter('all')}
                >
                  {t('clubs_filter_all')}
                </button>
                <button
                  type="button"
                  className={clubFilter === 'sport' ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => setClubFilter('sport')}
                >
                  {t('clubs_filter_sport')}
                </button>
                <button
                  type="button"
                  className={clubFilter === 'dance' ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => setClubFilter('dance')}
                >
                  {t('clubs_filter_dance')}
                </button>
                <button
                  type="button"
                  className={clubFilter === 'music' ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => setClubFilter('music')}
                >
                  {t('clubs_filter_music')}
                </button>
                <button
                  type="button"
                  className={clubFilter === 'art' ? 'btn btn-primary' : 'btn btn-outline'}
                  onClick={() => setClubFilter('art')}
                >
                  {t('clubs_filter_art')}
                </button>
              </div>

              {(() => {
                const visible =
                  clubFilter === 'all'
                    ? pilotClubs
                    : pilotClubs.filter((c) => c.category === clubFilter);

                if (pilotClubsLoading) {
                  return (
                    <article className="card p-4 sm:p-5">
                      <p className="text-sm text-zinc-600">Loading…</p>
                    </article>
                  );
                }

                if (pilotClubs.length === 0) {
                  return (
                    <article className="card p-4 sm:p-5">
                      <p className="text-sm text-zinc-600">{t('clubs_pilot_empty')}</p>
                    </article>
                  );
                }

                if (visible.length === 0) {
                  return (
                    <article className="card p-4 sm:p-5">
                      <p className="text-sm text-zinc-600">{t('clubs_filter_empty')}</p>
                    </article>
                  );
                }

                return (
                  <div className="grid grid-cols-1 gap-4">
                    {visible.map((club) => (
                      <ClubCard key={club.id} club={club} safeT={safeT} lang={lang} />
                    ))}
                  </div>
                );
              })()}
            </section>
          )}

          {/* TAB: Ambassadors */}
          {tab === 'ambassadors' && (
            <section className="space-y-4">
              <article className="card p-4 sm:p-5">
                <h2 className="text-sm font-semibold text-zinc-800">{t('amb_title')}</h2>
                <p className="mt-2 text-sm text-zinc-600">{t('amb_intro')}</p>

                <ul className="mt-3 space-y-2 text-sm text-zinc-600">
                  <li>• {t('amb_task_1')}</li>
                  <li>• {t('amb_task_2')}</li>
                  <li>• {t('amb_task_3')}</li>
                </ul>

                <div className="mt-5">
                  {!isAmbApplyOpen ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={openAmbApply}
                      aria-expanded="false"
                    >
                      {t('clubs_cta_apply')}
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row gap-3">
                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setIsAmbApplyOpen(false)}
                      >
                        {t('clubs_form_collapse')}
                      </button>

                      <button
                        type="button"
                        className="btn btn-outline"
                        onClick={() => setAmbFormKey((k) => k + 1)}
                      >
                        {t('clubs_form_reset')}
                      </button>
                    </div>
                  )}

                  <div
                    ref={ambFormRef}
                    className={isAmbApplyOpen ? 'mt-4 scroll-mt-24' : 'mt-4 hidden'}
                  >
                    <AmbassadorForm key={`amb-${ambFormKey}`} t={t} preferredLang={lang} />
                  </div>
                </div>
              </article>

              <h2 className="text-sm font-semibold text-zinc-800">{t('amb_list_title')}</h2>

              {AMBASSADORS.length === 0 ? (
                <article className="card p-4 sm:p-5">
                  <p className="text-sm text-zinc-600">{t('amb_list_empty')}</p>
                </article>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {AMBASSADORS.map((a) => (
                    <AmbassadorCard key={a.name} a={a} />
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
            </main>

      {isGiftOpen && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 px-4 py-6 sm:items-center"
          onClick={() => setIsGiftOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="gift-modal-title"
            className="w-full max-w-2xl rounded-2xl bg-white p-4 shadow-2xl sm:p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 id="gift-modal-title" className="text-lg font-semibold text-zinc-900">
                  {t('clubs_gift_title')}
                </h2>
                <p className="mt-2 text-sm text-zinc-600">{t('clubs_gift_body')}</p>
              </div>

              <button
                type="button"
                className="btn btn-outline self-start shrink-0"
                onClick={() => setIsGiftOpen(false)}
              >
                {t('clubs_form_collapse')}
              </button>
            </div>

            <div className="mt-5">
              <ClubGiftForm
                t={t}
                preferredLang={lang}
                clubs={pilotClubs.map((club) => ({ name: club.name }))}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ClubCard({
  club,
  safeT,
  lang,
}: {
  club: Club;
  safeT: (key: string, fallback: string) => string;
  lang: string;
}) {
  const [isPhotoOpen, setIsPhotoOpen] = useState(false);

  const showSupportStats =
    typeof club.nftCount === 'number' || typeof club.vigriAllocation === 'number';

  const locationLabel = [club.city, club.country].filter(Boolean).join(', ');
  const hasPhoto = Boolean(club.pilotPhotoUrl);
  const pilotSinceInfo = (() => {
    if (!club.pilotSinceMonth) return null;

    const match = /^(\d{4})-(\d{2})$/.exec(club.pilotSinceMonth);
    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const date = new Date(year, month, 1);

    const ruMonths = [
      'января',
      'февраля',
      'марта',
      'апреля',
      'мая',
      'июня',
      'июля',
      'августа',
      'сентября',
      'октября',
      'ноября',
      'декабря',
    ];

    const locale = lang === 'ru' ? 'ru-RU' : lang === 'et' ? 'et-EE' : 'en-US';

    const monthYear =
      lang === 'ru'
        ? `${ruMonths[month]} ${year}`
        : new Intl.DateTimeFormat(locale, {
            month: 'long',
            year: 'numeric',
          }).format(date);

    return {
      line1: safeT('clubs_pilot_since', 'In pilot since'),
      line2: monthYear,
    };
  })();

  return (
    <>
      <article className="card overflow-hidden p-0">
        <div
          className={
            hasPhoto
              ? 'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_320px]'
              : 'grid grid-cols-1'
          }
        >
          <div className="p-3 sm:p-4">
            <div className="flex items-start gap-4 sm:gap-5">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl">
                {club.logoUrl ? (
                  <Image
                    src={club.logoUrl}
                    alt={club.logoAlt || `${club.name} logo`}
                    width={80}
                    height={80}
                    unoptimized
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-zinc-100 text-xl font-semibold text-zinc-700">
                    {club.name.trim().slice(0, 1).toUpperCase()}
                  </div>
                )}
              </div>

              <div className="flex min-w-0 flex-1 items-start gap-4 pt-0.5">
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold leading-tight tracking-tight text-zinc-900">
                    {club.name}
                  </h3>

                  <div className="mt-3 flex flex-wrap gap-2">
                    {club.pilotBadge ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 ring-1 ring-emerald-200">
                        {club.pilotBadge}
                      </span>
                    ) : null}

                    {club.verifiedInPerson ? (
                      <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-medium text-sky-800 ring-1 ring-sky-200">
                        {safeT('clubs_club_verified_label', 'Verified in person')}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-zinc-500">
                    {club.category ? <span className="capitalize">{club.category}</span> : null}
                    {locationLabel ? <span>• {locationLabel}</span> : null}
                  </div>
                </div>

                {showSupportStats ? (
                  <div className="hidden shrink-0 pt-6 md:block md:pr-4">
                    <div className="inline-flex items-start justify-end gap-1 rounded-xl bg-gradient-to-r from-transparent to-teal-500/12 px-3 py-2 dark:from-transparent dark:to-teal-300/10">
                      <div className="relative h-14 w-[112px] shrink-0" aria-hidden="true">
                        <Image
                          src="/images/clubs/fan-room_light.png"
                          alt=""
                          fill
                          unoptimized
                          sizes="112px"
                          className="object-contain object-right dark:hidden"
                        />
                        <Image
                          src="/images/clubs/fan-room_black.png"
                          alt=""
                          fill
                          unoptimized
                          sizes="112px"
                          className="hidden object-contain object-right dark:block"
                        />
                      </div>

                      <div className="flex flex-col items-end gap-2 text-right leading-none text-zinc-700 dark:text-zinc-100">
                        {typeof club.nftCount === 'number' ? (
                          <span className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                            <span
                              aria-hidden="true"
                              className="inline-flex h-[18px] w-[18px] items-center justify-center text-zinc-600 dark:text-zinc-100"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-[18px] w-[18px]"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  x="4"
                                  y="4"
                                  width="16"
                                  height="16"
                                  rx="3"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  opacity="0.85"
                                />
                                <path
                                  d="M8 15L11 12L13 14L16 10L19 15"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="9" cy="9" r="1.3" fill="currentColor" />
                              </svg>
                            </span>
                            <span className="text-[12px] font-medium text-zinc-600 dark:text-zinc-200">
                              {safeT('clubs_club_nft_label', 'NFT')}: 
                            </span>
                            <span className="text-[14px] font-semibold text-zinc-700 dark:text-zinc-100">
                              {club.nftCount}
                            </span>
                          </span>
                        ) : null}

                        {typeof club.vigriAllocation === 'number' ? (
                          <div className="flex flex-col items-end">
                            <span className="text-[14px] font-semibold">
                              {club.vigriAllocation.toLocaleString()}
                            </span>
                            <span className="mt-0.5 inline-flex items-center justify-end gap-1.5 text-[12px] font-medium uppercase tracking-[0.02em] text-zinc-600 dark:text-zinc-200">
                              <Image
                                src="/logos/vigri-logo.webp"
                                alt=""
                                width={18}
                                height={18}
                                unoptimized
                                className="h-[18px] w-[18px] rounded-full object-contain"
                                aria-hidden="true"
                              />
                              <span>$VIGRI</span>
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {showSupportStats ? (
              <div className="mt-3 md:hidden">
                <div className="grid grid-cols-[80px_minmax(0,1fr)] items-center gap-2">
                  <div className="text-center text-[10px] leading-4 text-zinc-300">
                    {pilotSinceInfo ? (
                      <>
                        <div>{pilotSinceInfo.line1}</div>
                        <div>{pilotSinceInfo.line2}</div>
                      </>
                    ) : (
                      <div className="h-8" />
                    )}
                  </div>

                  <div className="rounded-xl bg-gradient-to-r from-transparent via-teal-500/10 to-teal-500/14 px-2.5 py-2.5 dark:from-transparent dark:via-teal-300/8 dark:to-teal-300/12">
                    <div className="grid grid-cols-[1fr_64px] items-center gap-0,5">
                      <div className="flex justify-end">
                        <div className="relative h-[52px] w-[92px]" aria-hidden="true">
                          <Image
                            src="/images/clubs/fan-room_light.png"
                            alt=""
                            fill
                            unoptimized
                            sizes="92px"
                            className="object-contain dark:hidden"
                          />
                          <Image
                            src="/images/clubs/fan-room_black.png"
                            alt=""
                            fill
                            unoptimized
                            sizes="92px"
                            className="hidden object-contain dark:block"
                          />
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-3 text-right leading-none text-zinc-100">
                        {typeof club.nftCount === 'number' ? (
                          <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap">
                            <span
                              aria-hidden="true"
                              className="inline-flex h-3 w-3 items-center justify-center text-zinc-300"
                            >
                              <svg
                                viewBox="0 0 24 24"
                                className="h-3 w-3"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                              >
                                <rect
                                  x="4"
                                  y="4"
                                  width="16"
                                  height="16"
                                  rx="3"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  opacity="0.85"
                                />
                                <path
                                  d="M8 15L11 12L13 14L16 10L19 15"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                />
                                <circle cx="9" cy="9" r="1.3" fill="currentColor" />
                              </svg>
                            </span>
                            <span className="text-[10px] font-medium text-zinc-300">
                              {safeT('clubs_club_nft_label', 'NFT')}:
                            </span>
                            <span className="text-[11px] font-semibold text-zinc-100">
                              {club.nftCount}
                            </span>
                          </span>
                        ) : null}

                        {typeof club.vigriAllocation === 'number' ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="whitespace-nowrap text-[11px] font-semibold">
                              {club.vigriAllocation.toLocaleString()}
                            </span>
                            <span className="inline-flex items-center justify-end gap-1 whitespace-nowrap text-[10px] font-medium uppercase tracking-[0.02em] text-zinc-300">
                              <Image
                                src="/logos/vigri-logo.webp"
                                alt=""
                                width={12}
                                height={12}
                                unoptimized
                                className="h-3 w-3 rounded-full object-contain"
                                aria-hidden="true"
                              />
                              <span>$VIGRI</span>
                            </span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            {club.quote ? (
              <div className="mt-4 flex gap-2.5">
                <div
                  aria-hidden="true"
                  className="shrink-0 text-3xl leading-none text-zinc-300 sm:text-4xl"
                >
                  “
                </div>
                <p className="max-w-2xl pt-0.5 text-[13px] leading-6 text-zinc-700 sm:text-sm sm:leading-6">
                  {club.quote}
                </p>
              </div>
            ) : null}

            {club.website || club.instagram || club.email ? (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[13px]">
                {club.website ? (
                  <a
                    href={club.website}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    Website
                  </a>
                ) : null}

                {club.instagram ? (
                  <a
                    href={club.instagram}
                    target="_blank"
                    rel="noreferrer"
                    className="underline underline-offset-2"
                  >
                    Instagram
                  </a>
                ) : null}

                {club.email ? (
                  <a
                    href={`mailto:${club.email}`}
                    className="break-all underline underline-offset-2"
                  >
                    {club.email}
                  </a>
                ) : null}
              </div>
            ) : null}
          </div>

          {hasPhoto ? (
            <div className="flex flex-col md:min-h-[210px]">
              <button
                type="button"
                className="group relative block w-full flex-1 overflow-hidden bg-zinc-50 text-left md:rounded-none"
                onClick={() => setIsPhotoOpen(true)}
                aria-label={`Open ${club.name} photo`}
              >
                <div className="relative aspect-[4/3] w-full md:h-full md:min-h-[210px] md:aspect-auto">
                  <Image
                    src={club.pilotPhotoUrl!}
                    alt={club.pilotPhotoAlt || `${club.name} photo`}
                    fill
                    unoptimized
                    sizes="(max-width: 768px) 100vw, 280px"
                    className="object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                </div>

                <div className="pointer-events-none absolute right-3 top-3 rounded-full bg-black/45 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-sm">
                  View
                </div>

                {club.pilotPhotoCaption ? (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent px-4 py-3 text-xs text-white">
                    {club.pilotPhotoCaption}
                  </div>
                ) : null}
              </button>
            </div>
          ) : null}
        </div>
      </article>

      {hasPhoto && isPhotoOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsPhotoOpen(false)}
        >
          <div className="relative max-h-[90vh] max-w-6xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 px-3 py-1.5 text-sm text-white"
              onClick={() => setIsPhotoOpen(false)}
            >
              Close
            </button>

            <Image
              src={club.pilotPhotoUrl!}
              alt={club.pilotPhotoAlt || `${club.name} photo`}
              width={1600}
              height={1200}
              unoptimized
              className="max-h-[90vh] w-auto rounded-2xl object-contain"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

function AmbassadorCard({ a }: { a: Ambassador }) {
  return (
    <article className="card p-4 sm:p-5">
      <div className="flex gap-3">
        <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-sm font-semibold text-zinc-700">
          {a.name.trim().slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold text-zinc-800">{a.name}</h3>
            {a.location ? <span className="text-xs text-zinc-500">• {a.location}</span> : null}
          </div>

          <p className="mt-2 text-sm text-zinc-600">“{a.quote}”</p>

          {a.social ? (
            <div className="mt-3 text-xs">
              <a
                href={a.social}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2 break-all"
              >
                {a.social}
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  );
}
