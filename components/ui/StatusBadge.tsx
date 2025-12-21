// components/ui/StatusBadge.tsx
// Small presentational pill badge. All visuals centralized here.
import React from 'react';

type Status = 'approved' | 'pending' | 'none';

const styles: Record<Status, string> = {
  approved: 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200',
  pending: 'bg-amber-100 text-amber-700 ring-1 ring-amber-200',
  none: 'bg-slate-100 text-slate-700 ring-1 ring-slate-200',
};

export function StatusBadge({ status, children }: { status: Status; children?: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${styles[status]}`}
    >
      {children ?? status}
    </span>
  );
}
