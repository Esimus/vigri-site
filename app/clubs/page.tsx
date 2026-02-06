// app/clubs/page.tsx
'use client';

import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';
import PublicHeader from '@/components/layout/PublicHeader';

type Club = {
  name: string;
  location?: string;
  website?: string;
  instagram?: string;
  email?: string;
  quote: string;
};

const PILOT_CLUBS: Club[] = [];

export default function ClubsPage() {
  const { t } = useI18n();

  return (
    <>
      <PublicHeader />

      <main className="page-bg min-h-screen">
        <div className="mx-auto max-w-4xl px-4 py-10 space-y-8">
          {/* Page header */}
          <header>
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {t('clubs_badge')}
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-zinc-900">
              {t('clubs_title')}
            </h1>
            <p className="mt-3 text-sm text-zinc-600 max-w-2xl">{t('clubs_intro')}</p>

            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              <Link href="/contact" className="btn btn-primary">
                {t('clubs_cta_apply')}
              </Link>
              <a href="#pilot-clubs" className="btn btn-outline">
                {t('clubs_cta_view_pilots')}
              </a>
            </div>
          </header>

          {/* Pilot clubs */}
          <section id="pilot-clubs" className="space-y-4 scroll-mt-24">
            <h2 className="text-sm font-semibold text-zinc-800">
              {t('clubs_pilot_title')}
            </h2>

            {PILOT_CLUBS.length === 0 ? (
              <article className="card p-4 sm:p-5">
                <p className="text-sm text-zinc-600">{t('clubs_pilot_empty')}</p>
              </article>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {PILOT_CLUBS.map((club) => (
                  <ClubCard key={club.name} club={club} />
                ))}
              </div>
            )}
          </section>

          {/* What we do in pilot */}
          <section className="card p-4 sm:p-5">
            <h2 className="text-sm font-semibold text-zinc-800">{t('clubs_pilot_how_title')}</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600">
              <li>• {t('clubs_pilot_how_1')}</li>
              <li>• {t('clubs_pilot_how_2')}</li>
              <li>• {t('clubs_pilot_how_3')}</li>
            </ul>

            <div className="mt-4">
              <Link href="/contact" className="btn btn-primary">
                {t('clubs_cta_apply')}
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function ClubCard({ club }: { club: Club }) {
  return (
    <article className="card p-4 sm:p-5">
      <div className="flex gap-3">
        {/* Placeholder avatar */}
        <div className="mt-1 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-sm font-semibold text-zinc-700">
          {club.name.trim().slice(0, 1).toUpperCase()}
        </div>

        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-semibold text-zinc-800">{club.name}</h3>
            {club.location ? (
              <span className="text-xs text-zinc-500">• {club.location}</span>
            ) : null}
          </div>

          <p className="mt-2 text-sm text-zinc-600">“{club.quote}”</p>

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
