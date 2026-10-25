'use client';

import { useEffect, useState } from 'react';

// Cookie helpers (client-side)
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([$?*|{}\\^])/g, '\\$1') + '=([^;]*)'),
  );
  if (!m || typeof m[1] !== 'string') return null;
  try {
    return decodeURIComponent(m[1]);
  } catch {
    return null;
  }
}
function writeCookie(name: string, value: string, days = 365) {
  if (typeof document === 'undefined') return;
  const maxAge = days * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
}

// Theme helpers
type ThemePref = 'auto' | 'light' | 'dark';
function applyTheme(pref: ThemePref) {
  const isDark =
    pref === 'dark' ||
    (pref === 'auto' &&
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const root = document.documentElement;
  root.setAttribute('data-theme', isDark ? 'dark' : 'light');
  root.classList.toggle('dark', isDark);

  try {
    const maxAge = 365 * 24 * 60 * 60;
    document.cookie = `vigri_theme_resolved=${isDark ? 'dark' : 'light'}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  } catch {}
}

function isThemePref(value: unknown): value is ThemePref {
  return value === 'auto' || value === 'light' || value === 'dark';
}

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemePref>('auto');

  useEffect(() => {
    let current: ThemePref = 'auto';

    const update = (next: ThemePref) => {
      current = next;
      setTheme(next);
      applyTheme(next);
    };

    const saved = readCookie('vigri_theme');
    update(isThemePref(saved) ? saved : 'auto');

    const onTheme = (event: Event) => {
      const next = (event as CustomEvent<{ theme?: unknown }>).detail?.theme;
      if (isThemePref(next)) update(next);
    };

    const media = window.matchMedia?.('(prefers-color-scheme: dark)');
    const onSystemChange = () => {
      if (current === 'auto') applyTheme('auto');
    };

    window.addEventListener('vigri:theme', onTheme);
    media?.addEventListener('change', onSystemChange);

    return () => {
      window.removeEventListener('vigri:theme', onTheme);
      media?.removeEventListener('change', onSystemChange);
    };
  }, []);

  const changeTheme = (next: ThemePref) => {
    setTheme(next);
    try {
      writeCookie('vigri_theme', next, 365);
    } catch {}
    applyTheme(next);
    window.dispatchEvent(new CustomEvent('vigri:theme', { detail: { theme: next } }));
  };

  return { theme, changeTheme };
}
