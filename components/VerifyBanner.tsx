// components/VerifyBanner.tsx
'use client';

type Props = {
  verify: 'sent' | 'ok' | 'invalid';
  tf: (k: string, fb: string) => string;
  loading: boolean;
  note: string | null;
  onResend: () => void;
  onClose: () => void;
};

export default function VerifyBanner({
  verify,
  tf,
  loading,
  note,
  onResend,
  onClose,
}: Props) {
  const msg =
    verify === 'sent'
      ? tf('auth.verify_sent', "We’ve sent a verification email to your inbox.")
      : verify === 'ok'
      ? tf('auth.verify_ok', 'Email verified! You can sign in now.')
      : tf('auth.verify_invalid', 'The link is invalid or expired. Request a new email.');

  // Tone now affects only border/text accent; background from .card / theme
  const tone =
    verify === 'ok'
      ? 'border-green-400 verify-banner--ok'
      : verify === 'sent'
      ? 'border-blue-400 verify-banner--sent'
      : 'border-amber-400 verify-banner--warn';

  return (
    <div className="mx-auto mt-3 mb-4 max-w-6xl">
      <div
        className={`card relative border px-4 py-3 text-sm ${tone}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-medium">{msg}</p>

            {(verify === 'sent' || verify === 'invalid') && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={loading}
                  className="btn btn-outline text-xs sm:text-sm disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={tf('auth.resend', 'Send again')}
                >
                  {loading && (
                    <svg
                      className="mr-2 h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                        opacity="0.25"
                      />
                      <path
                        d="M22 12a10 10 0 0 1-10 10"
                        stroke="currentColor"
                        strokeWidth="4"
                        fill="none"
                      />
                    </svg>
                  )}
                  {tf('auth.resend', 'Send again')}
                </button>

                {note && <span className="text-xs opacity-80 sm:text-sm">{note}</span>}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-xs opacity-70 hover:bg-zinc-200/50 dark:hover:bg-white/5"
            aria-label="Close"
            type="button"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
