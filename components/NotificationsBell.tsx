'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useI18n } from '@/hooks/useI18n';

// Small, click-to-toggle notifications popover.
// Renders panel via portal so it isn't clipped and doesn't disappear on hover.
export default function NotificationsBell() {
  const { t } = useI18n();

  const [open, setOpen] = useState(false);
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const iconRef = useRef<HTMLSpanElement | null>(null);

  // panel position
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const toggle = () => {
    if (!open && iconRef.current) {
      const r = iconRef.current.getBoundingClientRect();
      const PANEL_W = 256; // w-64
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

  const panel =
    open && (
      <div className="fixed inset-0 z-[55]" onClick={() => setOpen(false)} aria-hidden>
        <div
          onClick={(e) => e.stopPropagation()}
          className="fixed w-64 rounded-xl border border-zinc-200 bg-white p-3 text-xs shadow-lg"
          style={{ top: pos.top, left: pos.left }}
          role="dialog"
          aria-label="Notifications"
        >
          <div className="font-medium mb-1">{t('header.notifications') || 'Notifications'}</div>
          <ul className="space-y-1">
            <li className="text-zinc-600">{t('header.mail_empty') || 'No new messages'}</li>
          </ul>
          <Link href="/support" className="link-accent text-xs mt-2 inline-block">
            {t('header.mail_open') || 'Open inbox'}
          </Link>
        </div>
      </div>
    );

  return (
    <div className="relative">
      {/* plain icon (no button look) */}
      <span
        ref={iconRef}
        role="button"
        aria-label="Notifications"
        tabIndex={0}
        onClick={toggle}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), toggle())}
        className="inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-zinc-100 cursor-pointer text-zinc-700"
      >
        {/* bell icon, visible via stroke-current */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Z" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M19 17H5l1.3-1.62A4 4 0 0 0 7 13V10a5 5 0 1 1 10 0v3c0 .7.24 1.38.7 1.93L19 17Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </span>

      {open && portalRoot ? createPortal(panel, portalRoot) : null}
    </div>
  );
}
