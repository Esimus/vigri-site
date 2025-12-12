// app/components/nav/ProfileMenu.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { useI18n } from '@/hooks/useI18n';

// Build 1–2 initials from user name or email (fallback to "U")
function makeInitials(name?: string | null, email?: string | null) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/).slice(0, 2);
    const letters = parts.map((p) => p[0] ?? '').join('');
    const cleaned = letters.replace(/[^A-Za-zА-Яа-яЁё]/g, '');
    return (cleaned || letters || 'U').toUpperCase();
  }
  if (email && email.includes('@')) {
    const local = email.split('@')[0]!;
    const cleaned = local.replace(/[^A-Za-zА-Яа-яЁё]/g, '');
    return (cleaned.slice(0, 2) || 'U').toUpperCase();
  }
  return 'U';
}

// i18n helpers
const tr = (t: (k: string) => string, k: string, fb: string) => {
  const v = t(k);
  return v === k ? fb : v;
};
const tChain = (t: (k: string) => string, keys: string[], fb: string) => {
  for (const k of keys) {
    const v = t(k);
    if (v !== k) return v;
  }
  return fb;
};

// Cookie helpers (client-side)
function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const m = document.cookie.match(
    new RegExp('(?:^|; )' + name.replace(/([$?*|{}\\^])/g, '\\$1') + '=([^;]*)')
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
  document.cookie = `${name}=${encodeURIComponent(
    value
  )}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
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
    document.cookie = `vigri_theme_resolved=${
      isDark ? 'dark' : 'light'
    }; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
  } catch {}
}

export default function ProfileMenu() {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  // avatar initials
  const [initials, setInitials] = useState('U');

  // theme preference
  const [theme, setTheme] = useState<ThemePref>(() => {
    const v = readCookie('vigri_theme');
    return v === 'light' || v === 'dark' || v === 'auto' ? v : 'auto';
  });

  // panel position
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // таймер для авто-закрытия по уходу мыши с панели
  const hoverTimeout = useRef<number | null>(null);
  const cancelHoverClose = () => {
    if (hoverTimeout.current !== null) {
      window.clearTimeout(hoverTimeout.current);
      hoverTimeout.current = null;
    }
  };
  const scheduleHoverClose = () => {
    cancelHoverClose();
    hoverTimeout.current = window.setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  const labelHome = tChain(t, ['common.home', 'nav.home'], 'Home');
  const labelCurrency = tChain(
    t,
    ['common.currency', 'settings.currency', 'profile.currency'],
    'Currency'
  );
  const labelTheme = tChain(
    t,
    ['common.theme', 'settings.theme', 'profile.theme'],
    'Theme'
  );
  const labelAuto = tChain(t, ['common.auto', 'settings.theme_auto'], 'Auto');
  const labelLight = tChain(t, ['common.light', 'settings.theme_light'], 'Light');
  const labelDark = tChain(t, ['common.dark', 'settings.theme_dark'], 'Dark');
  const labelLogout = tr(t, 'common.logout', 'Logout');

  useEffect(() => {
    setPortalRoot(document.body);

    // читаем пользователя для инициалов
    (async () => {
      try {
        const r = await fetch('/api/me', { cache: 'no-store' });
        const j = await r.json().catch(() => null);
        const name: string | undefined = j?.user?.name ?? undefined;
        const email: string | undefined = j?.user?.email ?? undefined;
        setInitials(makeInitials(name, email));
      } catch {
        setInitials('U');
      }
    })();

    // фиксируем валюту как EUR (и синхронизируем cookie + событие)
    writeCookie('vigri_ccy', 'EUR', 365);
    try {
      window.dispatchEvent(
        new CustomEvent('vigri:currency', { detail: { currency: 'EUR' } })
      );
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    return () => {
      cancelHoverClose();
    };
  }, []);

  // apply theme on mount and whenever preference changes
  useEffect(() => {
    applyTheme(theme);

    if (theme !== 'auto') return;
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('auto');
    mq?.addEventListener?.('change', handler);
    return () => {
      mq?.removeEventListener?.('change', handler);
    };
  }, [theme]);

  // open/close with position recalculation
  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const PANEL_W = 256;
      const GAP = 8;
      const top = r.bottom + GAP;
      const left = Math.min(window.innerWidth - PANEL_W - 8, r.right - PANEL_W);
      setPos({ top, left });
    }
    setOpen((v) => !v);
  };

  // close on Esc/resize
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onResize = () => setOpen(false);
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
    };
  }, [open]);

  const changeTheme = (next: ThemePref) => {
    setTheme(next);
    writeCookie('vigri_theme', next, 365);
    applyTheme(next);
    try {
      window.dispatchEvent(
        new CustomEvent('vigri:theme', { detail: { theme: next } })
      );
    } catch {}
  };

  const panel =
    open && (
      <div
        className="fixed inset-0 z-[60]"
        onClick={() => setOpen(false)}
        aria-hidden
      >
        <div
          role="menu"
          aria-label="Profile menu"
          onClick={(e) => e.stopPropagation()}
          onMouseEnter={cancelHoverClose}
          onMouseLeave={scheduleHoverClose}
          className="fixed w-[16rem] rounded-xl border border-zinc-200 bg-white shadow-md"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="py-1">
            {/* Currency: fixed EUR */}
            <div className="px-3 py-2 text-xs flex items-center justify-between">
              <span className="opacity-70">{labelCurrency}</span>
              <span className="rounded-md border border-zinc-200 bg-zinc-50 px-2 py-1 text-xs text-zinc-700">
                EUR
              </span>
            </div>

            {/* Preferences: Theme */}
            <div className="px-3 py-2 text-xs flex items-center justify-between">
              <span className="opacity-70">{labelTheme}</span>
              <div className="inline-flex overflow-hidden rounded-md border border-zinc-200">
                <button
                  type="button"
                  onClick={() => changeTheme('auto')}
                  className={
                    'px-2 py-1 text-xs ' +
                    (theme === 'auto'
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-zinc-100 text-zinc-700')
                  }
                >
                  {labelAuto}
                </button>
                <button
                  type="button"
                  onClick={() => changeTheme('light')}
                  className={
                    'px-2 py-1 text-xs ' +
                    (theme === 'light'
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-zinc-100 text-zinc-700')
                  }
                >
                  {labelLight}
                </button>
                <button
                  type="button"
                  onClick={() => changeTheme('dark')}
                  className={
                    'px-2 py-1 text-xs ' +
                    (theme === 'dark'
                      ? 'bg-blue-50 text-blue-700'
                      : 'hover:bg-zinc-100 text-zinc-700')
                  }
                >
                  {labelDark}
                </button>
              </div>
            </div>

            <div className="my-1 h-px bg-zinc-100" />

            {/* Home */}
            <Link
              href="/"
              className="block px-3 py-2 text-sm hover:bg-zinc-100"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              {labelHome}
            </Link>

            {/* Logout */}
            <form action="/api/auth/logout" method="POST">
              <button
                type="submit"
                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-100"
                role="menuitem"
              >
                {labelLogout}
              </button>
            </form>
          </div>
        </div>
      </div>
    );

  return (
    <div className="relative">
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        className="btn btn-outline rounded-full px-2.5 py-1.5 gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
      >
        <span className="grid h-6 w-6 place-items-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-700">
          {initials}
        </span>
        <span aria-hidden className="inline-flex text-current">
          <svg width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
            <rect x="3" y="5" width="14" height="2" rx="1" />
            <rect x="3" y="9" width="14" height="2" rx="1" />
            <rect x="3" y="13" width="14" height="2" rx="1" />
          </svg>
        </span>
      </button>

      {open && portalRoot ? createPortal(panel, portalRoot) : null}
    </div>
  );
}
