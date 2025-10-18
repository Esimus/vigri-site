'use client';

import Link from 'next/link';

type TFunc = (k: string) => string;

export default function BeyondDigital({ t }: { t: TFunc }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="text-sm font-semibold tracking-tight">
        {t('beyond.title')}
      </div>

      <p className="mt-2 text-sm text-zinc-600">
        {t('beyond.text')}
      </p>

      <div className="mt-2">
        <Link
          href="/center"
          className="inline-flex items-center gap-1 text-xs font-normal link-accent"
        >
          {t('beyond.cta')} <span aria-hidden>→</span>
        </Link>
      </div>
    </div>
  );
}
