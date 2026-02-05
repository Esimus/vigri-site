// components/faq/FaqAccordionItem.tsx
'use client';

import type { ReactNode } from 'react';

export function FaqAccordionItem({
  index,
  question,
  children,
}: {
  index: number;
  question: string;
  children: ReactNode;
}) {
  return (
    <details className="card p-4">
      <summary className="btn btn-outline w-full justify-between cursor-pointer">
        <span className="flex items-center gap-2 min-w-0">
          <span className="chip chip--sm" aria-hidden="true">
            {index}
          </span>
          <span className="truncate">{question}</span>
        </span>
        <span aria-hidden="true">▾</span>
      </summary>

      <div className="mt-3 whitespace-pre-line text-sm leading-relaxed text-zinc-700 dark:text-zinc-200">
        {children}
      </div>
    </details>
  );
}
