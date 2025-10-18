// components/profile/AvatarUploader.tsx
'use client';

import { useCallback, useRef, useState } from 'react';

type Props = {
  label?: string;
  value: string | null;                 // dataURL or null
  onChange: (v: string | null) => void;
  /** Target square size for resize & preview (px). Default: 256 */
  size?: number;
  /** Max file size after compression, in KB. Default: 120 */
  maxKB?: number;
  /** Small muted hint text under control */
  note?: string;
  /** Disable interaction */
  disabled?: boolean;
  uploadText?: string;
  resetText?: string;
};

export function AvatarUploader({
  label = 'Photo',
  value,
  onChange,
  size = 256,
  maxKB = 120,
  note,
  disabled = false,
  uploadText = 'Upload',
  resetText = 'Reset'
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const openFileDialog = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      if (disabled) return;
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [disabled]
  );

  const handleFile = async (file: File) => {
    setError(null);
    if (!file.type.startsWith('image/')) {
      setError('Only images are allowed (JPG/PNG/WEBP).');
      return;
    }
    setBusy(true);
    try {
      const dataUrl = await readFileAsDataURL(file);
      const processed = await resizeAndCompress(dataUrl, size, maxKB);
      onChange(processed);
    } catch (e: any) {
      setError(e?.message || 'Failed to process image.');
    } finally {
      setBusy(false);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
    // reset value to allow re-selecting the same file
    e.currentTarget.value = '';
  };

  const clear = () => {
    if (disabled) return;
    onChange(null);
    setError(null);
  };

  const frameSize = Math.min(200, size); // visual preview cap for layout
  const frameClass =
    'relative overflow-hidden rounded-xl border bg-[var(--card)] border-[var(--border)] shadow-sm';

  return (
    <div className="flex flex-col gap-3">
      {/* Label */}
      {label && <label className="label"><span>{label}</span></label>}

      {/* Preview frame */}
      <div
        className={`${frameClass} mx-auto`}
        style={{ width: frameSize, height: frameSize }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        aria-busy={busy}
      >
        {value ? (
          // Image preview
          <img
            src={value}
            alt=""
            className="absolute inset-0 w-full h-full object-cover select-none"
            draggable={false}
          />
        ) : (
          // Empty state
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center">
            <div className="w-12 h-12 rounded-full border border-dashed border-[var(--border)] flex items-center justify-center">
              <span className="text-xs opacity-70">IMG</span>
            </div>
            <div className="text-xs text-[color:var(--muted)] px-3">
              Drop image here or use “Upload”
            </div>
          </div>
        )}

        {/* Subtle overlay while busy */}
        {busy && (
          <div className="absolute inset-0 bg-black/5 dark:bg-white/5 animate-pulse rounded-xl" />
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={onInputChange}
          disabled={disabled}
        />
        <button
          type="button"
          className="btn btn-primary"
          onClick={openFileDialog}
          disabled={disabled || busy}
        >
          {uploadText}
        </button>
        <button
          type="button"
          className="btn btn-outline"
          onClick={clear}
          disabled={disabled || busy || !value}
        >
          {resetText}
        </button>
      </div>

      {/* Help + constraints */}
      <div className="space-y-1 text-center">
        {note && <div className="form-help">{note}</div>}
        <div className="form-help">
          {`${size}×${size}px, ≤ ${maxKB} KB · JPG/PNG/WEBP`}
        </div>
        {error && <div className="form-error">{error}</div>}
      </div>
    </div>
  );
}

/* ----------------------------- helpers ----------------------------- */

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error('Failed to read file.'));
    fr.readAsDataURL(file);
  });
}

/**
 * Resize to square {size} with center-crop and compress until <= maxKB.
 * Prefers WEBP, falls back to JPEG if needed.
 */
async function resizeAndCompress(
  dataUrl: string,
  size: number,
  maxKB: number
): Promise<string> {
  const img = await loadImage(dataUrl);

  // compute cover crop
  const target = size;
  const canvas = document.createElement('canvas');
  canvas.width = target;
  canvas.height = target;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not supported.');

  const { sx, sy, sw, sh } = coverCrop(img.width, img.height, target, target);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, target, target);

  // try WEBP → JPEG, reduce quality until <= maxKB
  const limit = maxKB * 1024;
  const tryEncode = (type: string, q: number) =>
    canvas.toDataURL(type, q);

  // Quality ladder
  const ladder = [0.92, 0.85, 0.8, 0.72, 0.65, 0.58, 0.5, 0.42, 0.36, 0.3];

  // WEBP first
  for (const q of ladder) {
    const out = tryEncode('image/webp', q);
    if (dataUrlSize(out) <= limit) return out;
  }
  // JPEG fallback
  for (const q of ladder) {
    const out = tryEncode('image/jpeg', q);
    if (dataUrlSize(out) <= limit) return out;
  }

  // If still larger, return the smallest we got (last try)
  return tryEncode('image/jpeg', 0.3);
}

function dataUrlSize(durl: string): number {
  // data:[<mediatype>][;base64],<data>
  const base64 = durl.split(',')[1] || '';
  return Math.ceil((base64.length * 3) / 4);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = () => reject(new Error('Failed to load image.'));
    im.src = src;
  });
}

function coverCrop(sw: number, sh: number, tw: number, th: number) {
  const sRatio = sw / sh;
  const tRatio = tw / th;
  let cw = sw;
  let ch = sh;

  if (sRatio > tRatio) {
    // source is wider → crop width
    ch = sh;
    cw = sh * tRatio;
  } else {
    // source is taller → crop height
    cw = sw;
    ch = sw / tRatio;
  }
  const sx = Math.max(0, Math.floor((sw - cw) / 2));
  const sy = Math.max(0, Math.floor((sh - ch) / 2));
  return { sx, sy, sw: Math.floor(cw), sh: Math.floor(ch) };
}

export default AvatarUploader;
