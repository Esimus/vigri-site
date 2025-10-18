// components/ui/StepBar.tsx
// Minimal 3-step progress bar. Pure UI; tweak visuals here only.
import React from 'react';

type StepBarProps = {
  steps: string[];        // e.g. ['Start', 'Submit', 'Review']
  current: number;        // 0..steps.length (0 means before first; steps.length = done)
};

export function StepBar({ steps, current }: StepBarProps) {
  return (
    <div className="select-none">
      <div className="flex items-center gap-2">
        {steps.map((label, i) => {
          const active = i < current;
          const currentStep = i === current - 1;
          return (
            <div key={i} className="flex items-center gap-2">
              <div
                className={[
                  'size-5 shrink-0 rounded-full border text-[10px] leading-none flex items-center justify-center',
                  active
                    ? 'bg-emerald-600 border-emerald-600 text-white'
                    : currentStep
                    ? 'bg-amber-500 border-amber-500 text-white'
                    : 'bg-white border-slate-300 text-slate-600',
                ].join(' ')}
                aria-label={`Step ${i + 1}`}
                title={label}
              >
                {i + 1}
              </div>
              <div className="text-xs text-slate-600 min-w-[3.5rem]">{label}</div>
              {i < steps.length - 1 && (
                <div
                  className={[
                    'h-px w-8',
                    i < current - 1 ? 'bg-emerald-600' : 'bg-slate-300',
                  ].join(' ')}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
