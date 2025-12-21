'use client';

import { useEffect, useRef, useState } from 'react';
import { useI18n } from '@/hooks/useI18n';

export default function HashDropdown({ hash }: { hash: string }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const [alignLeft, setAlignLeft] = useState(true); // выравнивание панели относительно триггера
  const ref = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // закрытие по клику вне / Esc
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onEsc);
    };
  }, []);

  // решаем: вверх/вниз и влево/вправо
  useEffect(() => {
    if (!open || !ref.current) return;
    const trig = ref.current.getBoundingClientRect();

    // вверх/вниз
    const panelH = panelRef.current?.getBoundingClientRect().height ?? 96;
    const spaceBelow = window.innerHeight - trig.bottom;
    setOpenUp(spaceBelow < panelH + 12);

    // влево/вправо — чтобы панель не уходила за левый край
    const panelW =
      panelRef.current?.getBoundingClientRect().width ??
      Math.min(720, Math.floor(window.innerWidth * 0.92));
    const spaceRight = window.innerWidth - trig.left;
    const spaceLeft = trig.right;
    // если справа места больше или достаточно — открываем вправо (привязываем к left-0)
    setAlignLeft(spaceRight >= panelW || spaceRight >= spaceLeft);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      {/* компактный триггер: только SHA-256 + стрелка, без подчёркивания */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1 focus:outline-none"
        aria-haspopup="dialog"
        aria-expanded={open}
        title={t('footer_hash_label')}
      >
        <span>SHA-256</span>
        <span aria-hidden className={`transition-transform ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className={`absolute z-50 ${openUp ? 'bottom-full mb-2' : 'top-full mt-2'}
                      ${alignLeft ? 'left-0' : 'right-0'}
                      rounded-xl border border-zinc-200 bg-white shadow-md p-3
                      max-w-[92vw] min-w-[30rem]`}
        >
          <div className="text-[11px] text-zinc-500 leading-tight">
            {t('footer_hash_label')}
          </div>
          <div className="mt-1 flex items-center gap-2 leading-tight">
            <code className="font-mono text-[11px] text-zinc-700 break-all">
              {hash}
            </code>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(hash)}
              className="px-2 py-[2px] rounded border border-zinc-300 hover:bg-zinc-100 text-[10px]"
            >
              Copy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
