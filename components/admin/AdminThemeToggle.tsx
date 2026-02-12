// components/admin/AdminThemeToggle.tsx
'use client';

import { useState } from 'react';

type ThemePref = 'light' | 'dark';

type AdminThemeToggleProps = {
  initialTheme: ThemePref;
};

function applyThemeToDom(next: ThemePref) {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const isDark = next === 'dark';

  root.classList.toggle('dark', isDark);
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');

  const maxAge = 365 * 24 * 60 * 60;
  document.cookie = `vigri_theme=${next}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  document.cookie = `vigri_theme_resolved=${next}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

export function AdminThemeToggle({ initialTheme }: AdminThemeToggleProps) {
  const [theme, setTheme] = useState<ThemePref>(initialTheme);

  const isDark = theme === 'dark';
  const icon = isDark ? '🌙' : '☀️';
  const label = isDark ? 'Dark mode' : 'Light mode';

  const handleToggle = () => {
    const next: ThemePref = isDark ? 'light' : 'dark';
    setTheme(next);
    applyThemeToDom(next);
  };

  return (
    <button
      type="button"
      onClick={handleToggle}
      className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-300 bg-slate-100 px-3 py-1 text-xs font-medium text-slate-800 shadow-sm hover:bg-slate-200 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800"
    >
      <span aria-hidden className="text-sm leading-none">
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
