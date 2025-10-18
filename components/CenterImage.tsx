'use client';

import Image from 'next/image';
import { useRef, useEffect } from 'react';

type Props = {
  src?: string;
  alt?: string;
  caption?: string;
};

export default function CenterImage({
  src = '/images/projects/international-center/cover.webp',
  alt = 'International Training and Rehabilitation Center for Sports and Dance',
  caption = 'International Training and Rehabilitation Center for Sports and Dance — concept image',
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // Close on ESC for safety (dialog supports it, but we ensure focus trap)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') dialogRef.current?.close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <>
      {/* Right-aligned figure on md+; stacked on mobile */}
      <figure className="mt-6 md:mt-2 md:float-right md:ml-6 md:w-[46%]">
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          className="group block w-full focus:outline-none rounded-2xl overflow-hidden shadow-lg"
          aria-label="Open image in fullscreen"
        >
          <Image
            src={src}
            alt={alt}
            width={1536}
            height={768}
            className="w-full h-auto object-cover transition-transform duration-300 group-hover:scale-[1.02]"
            priority
            sizes="(max-width: 768px) 100vw, 46vw"
          />
        </button>
        <figcaption className="mt-2 text-xs text-zinc-500">
          {caption} <span className="ml-1 opacity-70">(click to zoom)</span>
        </figcaption>
      </figure>

      {/* Native dialog for zoomed view */}
      <dialog
        ref={dialogRef}
        className="backdrop:bg-black/60 rounded-xl p-0 max-w-[95vw] max-h-[90vh]"
      >
        <div className="relative">
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            className="absolute right-2 top-2 z-10 rounded-md bg-black/60 px-2 py-1 text-white text-xs hover:bg-black/70 focus:outline-none"
            aria-label="Close fullscreen"
          >
            ✕
          </button>
          <Image
            src={src}
            alt={alt}
            width={1920}
            height={960}
            className="w-[90vw] md:w-[80vw] max-h-[85vh] object-contain bg-black"
          />
        </div>
      </dialog>
    </>
  );
}
