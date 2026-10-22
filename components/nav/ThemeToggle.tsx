'use client';

import { useI18n } from '@/hooks/useI18n';
import { useThemePreference } from '@/hooks/useThemePreference';

export default function ThemeToggle() {
  const { t } = useI18n();
  const { changeTheme } = useThemePreference();

  let label = 'Theme';
  for (const key of ['common.theme', 'settings.theme', 'profile.theme']) {
    const value = t(key);
    if (value !== key) {
      label = value;
      break;
    }
  }

  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={() => {
        const isDark = document.documentElement.classList.contains('dark');
        changeTheme(isDark ? 'light' : 'dark');
      }}
      className="inline-flex h-8 w-7 sm:w-8 shrink-0 items-center justify-center rounded-lg text-zinc-700 hover:bg-zinc-100 dark:text-zinc-100 dark:hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path
          className="dark:hidden"
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z"
        />
        <g className="hidden dark:block">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42" />
        </g>
      </svg>
    </button>
  );
}
