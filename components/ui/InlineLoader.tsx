// components/ui/InlineLoader.tsx
'use client';

type InlineLoaderProps = {
  label?: string;
  className?: string;
};

export default function InlineLoader({ label, className }: InlineLoaderProps) {
  return (
    <span
      className={
        'inline-flex items-center gap-2 text-xs text-zinc-500 ' +
        (className ?? '')
      }
    >
      <span className="vigri-loader-dots" aria-hidden="true">
        <span className="vigri-loader-square" />
        <span className="vigri-loader-square" />
        <span className="vigri-loader-square" />
      </span>
      {label && <span>{label}</span>}
    </span>
  );
}
