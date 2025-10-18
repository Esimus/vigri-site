// components/LanguageSwitcher.tsx
"use client";

import { useEffect, useRef, useState } from "react";
import { LANGS, type Lang } from "../lib/i18n";

export function LanguageSwitcher({
  lang,
  onChange,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
}) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  // клик вне / Esc — закрыть
  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // решаем, раскрывать вверх или вниз
  useEffect(() => {
    if (!open || !ref.current) return;
    const triggerRect = ref.current.getBoundingClientRect();
    const approxPanelH = panelRef.current?.getBoundingClientRect().height ?? 120;
    const spaceBelow = window.innerHeight - triggerRect.bottom;
    setOpenUp(spaceBelow < approxPanelH + 12);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      {/* триггер как обычная текстовая ссылка */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1 text-sm leading-tight focus:outline-none"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change language"
        type="button"
      >
        {lang.toUpperCase()} <span aria-hidden className={`transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <div
          ref={panelRef}
          className={`absolute right-0 z-50 inline-block
                      ${openUp ? "bottom-full mb-2" : "top-full mt-2"}
                      rounded-xl border border-zinc-200 bg-white shadow-md`}
        >
          <ul role="listbox" className="py-1">
            {LANGS.map((l) => (
              <li key={l.code}>
                <button
                  onClick={() => {
                    onChange(l.code);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-zinc-100 ${
                    l.code === lang ? "font-semibold" : ""
                  }`}
                  role="option"
                  aria-selected={l.code === lang}
                  type="button"
                >
                  {l.code.toUpperCase()}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
