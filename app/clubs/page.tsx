// app/clubs/page.tsx
'use client';

import { useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useI18n } from '@/hooks/useI18n';
import PublicHeader from '@/components/layout/PublicHeader';
import { AmbassadorForm, ClubPilotForm } from '@/components/forms/IntakeForms';

type ClubCategory = 'sport' | 'dance' | 'music' | 'art';

type Club = {
  name: string;
  category: ClubCategory;
  location?: string;
  website?: string;
  instagram?: string;
  email?: string;
  quote: string;

  // Optional (can be filled later when you start gifting NFTs to clubs via support)
  nftCount?: number;
  vigriAllocation?: number;
};

type Ambassador = {
  name: string;
  location?: string;
  social?: string;
  quote: string;
};

const PILOT_CLUBS: Club[] = [];
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

  const [isApplyOpen, setIsApplyOpen] = useState(false);
  const [isAmbApplyOpen, setIsAmbApplyOpen] = useState(false);

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
                <p className="mt-2 text-sm text-zinc-600">{t('clubs_gift_body')}</p>
                <div className="mt-4">
                  <a href="/channels" className="btn btn-outline">
                    {t('clubs_gift_cta')}
                  </a>
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
                    ? PILOT_CLUBS
                    : PILOT_CLUBS.filter((c) => c.category === clubFilter);

                if (PILOT_CLUBS.length === 0) {
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
                      <ClubCard key={club.name} club={club} safeT={safeT} />
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
    </>
  );
}

function ClubCard({
  club,
  safeT,
}: {
  club: Club;
  safeT: (key: string, fallback: string) => string;
}) {
  const showSupportStats =
    typeof club.nftCount === 'number' || typeof club.vigriAllocation === 'number';

  return (
    <article className="card p-4 sm:p-5">
      <div className="flex gap-3">
        <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-sm font-semibold text-zinc-700">
          {club.name.trim().slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold text-zinc-800">{club.name}</h3>
            {club.location ? <span className="text-xs text-zinc-500">• {club.location}</span> : null}
          </div>

          <p className="mt-2 text-sm text-zinc-600">“{club.quote}”</p>

          {showSupportStats ? (
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {typeof club.nftCount === 'number' ? (
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-zinc-700">
                  {safeT('clubs_club_nft_label', 'NFTs')}: {club.nftCount}
                </span>
              ) : null}

              {typeof club.vigriAllocation === 'number' ? (
                <span className="inline-flex items-center rounded-full bg-zinc-100 px-2 py-1 text-zinc-700">
                  {safeT('clubs_club_vigri_label', 'VIGRI')}:{' '}
                  {club.vigriAllocation.toLocaleString()}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="mt-3 flex flex-wrap gap-3 text-xs">
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
              <a href={`mailto:${club.email}`} className="underline underline-offset-2">
                {club.email}
              </a>
            ) : null}
          </div>
        </div>
      </div>
    </article>
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
