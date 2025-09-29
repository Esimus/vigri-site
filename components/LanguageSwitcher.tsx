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
  const ref = useRef<HTMLDivElement | null>(null);

  // клик вне — закрыть; Esc — закрыть
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

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="btn btn-outline px-3 py-1.5 rounded-xl text-sm"
        aria-haspopup="listbox"
        aria-expanded={open}
        title="Change language"
      >
        {lang.toUpperCase()}
        <span aria-hidden className="ml-1">▾</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-44 rounded-xl border border-zinc-200 bg-white shadow-md z-50">
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
                >
                  {l.label} ({l.code.toUpperCase()})
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
