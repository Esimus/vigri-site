'use client';

import { useMemo, useSyncExternalStore } from 'react';
import type { Lang } from '@/lib/i18n';
import en from '@/locales/en.json';
import ru from '@/locales/ru.json';
import et from '@/locales/et.json';

// -------- helpers --------
const STORAGE_KEY = 'lang';
const dicts: Record<Lang, Record<string, string>> = { en, ru, et };

function canon(x: string | null | undefined): Lang {
  const v = (x ?? '').toLowerCase();
  if (v.startsWith('ru')) return 'ru';
  if (v.startsWith('et') || v.startsWith('est')) return 'et';
  return 'en';
}

// -------- global store (works across the whole app) --------
let currentLang: Lang = 'en';
if (typeof window !== 'undefined') {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    currentLang = canon(saved);
  } else {
    // first visit: pick from browser, save
    const nav = (navigator.language || 'en').toLowerCase();
    currentLang = canon(nav);
    try { localStorage.setItem(STORAGE_KEY, currentLang); } catch {}
  }
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function setLang(next: Lang) {
  const n = canon(next);
  if (n === currentLang) return;
  currentLang = n;
  try { localStorage.setItem(STORAGE_KEY, n); } catch {}
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

// keep tabs/windows in sync
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === STORAGE_KEY && e.newValue) {
      const n = canon(e.newValue);
      if (n !== currentLang) {
        currentLang = n;
        emit();
      }
    }
  });
}

// -------- hook --------
export function useI18n() {
  // IMPORTANT: third arg = getServerSnapshot to be SSR/hydration-safe
  const lang = useSyncExternalStore(
    subscribe,
    () => currentLang,
    () => 'en' as Lang // server snapshot: stable during SSR
  );

  const dict = useMemo(() => dicts[lang] ?? en, [lang]);
  const t = (k: string) => dict[k] ?? en[k as keyof typeof en] ?? k;
  return { lang, setLang, t };
}
