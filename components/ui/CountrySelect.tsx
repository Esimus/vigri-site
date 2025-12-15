// components/ui/CountrySelect.tsx
'use client';

// Searchable country select with ISO alpha-2 codes.
// Keyboard/mouse friendly. No external libs.

import { useEffect, useMemo, useRef, useState } from 'react';
import { COUNTRIES, Country } from '@/constants/countries';
import { buildProfileCountryOptions } from '@/constants/amlAnnexA';

const PROFILE_COUNTRIES = buildProfileCountryOptions(COUNTRIES);

type Props = {
  label?: string;
  required?: boolean;
  value?: string;                  // ISO alpha-2
  onChange: (code: string) => void;
  placeholder?: string;
  disabled?: boolean;
  help?: string;                   // small muted hint
  className?: string;              // width for the control wrapper
};

export function CountrySelect({
  label,
  required,
  value,
  onChange,
  placeholder,
  disabled,
  help,
  // Important: cap width on desktop, allow full width on mobile
  className = 'w-full md:max-w-[320px]',
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = useMemo<Country | undefined>(
    () => PROFILE_COUNTRIES.find((c) => c.code === value),
    [value]
  );

  const options = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return PROFILE_COUNTRIES;
    return PROFILE_COUNTRIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q)
    );
  }, [query]);

  // Close on outside click
  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  // Focus search when opening
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 0);
  }, [open]);

  // Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const labelText = required ? (
    <span className="after:content-['*'] after:text-red-600 after:ml-1">{label}</span>
  ) : (
    label
  );

  return (
    <label className="label block w-full">
      {label && <span>{labelText}</span>}

      {/* wrapper is inline-block with a desktop max-width cap */}
      <div
        ref={rootRef}
        className={`relative inline-block min-w-0 max-w-full ${className}`}
      >
        {/* trigger styled as select; fills only the wrapper */}
        <button
          type="button"
          className="select w-full text-left"
          data-empty={!selected}
          onClick={() => !disabled && setOpen((v) => !v)}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          {selected ? `${selected.name} (${selected.code})` : (placeholder || '—')}
        </button>

        {/* Popover constrained to wrapper */}
        {open && !disabled && (
          <div
            className="absolute left-0 right-0 z-20 mt-1 max-w-full rounded-xl border shadow bg-[var(--card)] border-[var(--border)]"
            role="dialog"
          >
            <div className="p-2 border-b border-[var(--border)] bg-[var(--card)]">
              <input
                ref={searchRef}
                className="input"
                placeholder="Search by name or code…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <ul role="listbox" className="max-h-60 overflow-auto py-1 text-sm">
              {options.map((c) => (
                <li
                  role="option"
                  aria-selected={c.code === value}
                  key={c.code}
                  onClick={() => {
                    onChange(c.code);
                    setOpen(false);
                    setQuery('');
                  }}
                  className={`px-3 py-2 cursor-pointer hover:bg-zinc-100 dark:hover:bg-[#0e1624] truncate ${
                    c.code === value ? 'bg-zinc-100 dark:bg-[#0e1624]' : ''
                  }`}
                >
                  {c.name} ({c.code})
                </li>
              ))}
              {options.length === 0 && (
                <li className="px-3 py-2 text-zinc-500">No results</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {help && <span className="form-help">{help}</span>}
    </label>
  );
}
