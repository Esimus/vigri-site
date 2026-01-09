// components/ui/FaqLightbox.tsx
'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';

type LightboxItem = {
  src: string;
  alt: string;
  title?: string;
  width: number;
  height: number;
};

type LightboxApi = {
  open: (item: LightboxItem) => void;
  close: () => void;
};

const LightboxContext = createContext<LightboxApi | null>(null);

export function FaqLightboxProvider({ children }: { children: React.ReactNode }) {
  const [item, setItem] = useState<LightboxItem | null>(null);

  useEffect(() => {
    if (!item) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setItem(null);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item]);

  const api = useMemo<LightboxApi>(
    () => ({
      open: (next) => setItem(next),
      close: () => setItem(null),
    }),
    []
  );

  return (
    <LightboxContext.Provider value={api}>
      {children}

      {item && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-label={item.title || item.alt}
          onClick={api.close}
        >
          <div className="relative w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={api.close}
              className="absolute -top-3 -right-3 rounded-full border bg-white px-3 py-2 text-sm shadow dark:bg-zinc-900"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="rounded-xl border bg-black overflow-hidden">
              <Image
                src={item.src}
                alt={item.alt}
                width={item.width}
                height={item.height}
                className="w-full h-auto max-h-[85vh] object-contain"
              />
            </div>

            {item.title && (
              <p className="mt-2 text-center text-xs text-white/80">{item.title}</p>
            )}
          </div>
        </div>
      )}
    </LightboxContext.Provider>
  );
}

function useFaqLightbox(): LightboxApi {
  const ctx = useContext(LightboxContext);
  if (!ctx) {
    throw new Error('FaqZoomImage must be used inside <FaqLightboxProvider>.');
  }
  return ctx;
}

type FaqZoomImageProps = {
  src: string;
  alt: string;
  title?: string;
  width: number;
  height: number;
  priority?: boolean;
  className?: string;
};

export function FaqZoomImage({
  src,
  alt,
  title,
  width,
  height,
  priority,
  className,
}: FaqZoomImageProps) {
  const { open } = useFaqLightbox();

  return (
    <button
      type="button"
      onClick={() => open({ src, alt, title, width, height })}
      className="block w-full cursor-zoom-in"
      aria-label={title ? `Open image: ${title}` : 'Open image'}
    >
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        className={className ?? 'w-full rounded-lg border'}
      />
    </button>
  );
}
