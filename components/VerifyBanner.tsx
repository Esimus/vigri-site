'use client';

// Dumb-presentational banner: no hooks, no animations
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

  const tone =
    verify === 'ok'
      ? 'bg-green-50 text-green-800 border-green-200'
      : verify === 'sent'
      ? 'bg-blue-50 text-blue-800 border-blue-200'
      : 'bg-amber-50 text-amber-800 border-amber-200';

  return (
    <div className="mx-auto max-w-6xl mt-3 mb-4">
      <div className={`relative rounded-xl border px-4 py-3 ${tone}`} role="status" aria-live="polite">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            {msg}

            {(verify === 'sent' || verify === 'invalid') && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onResend}
                  disabled={loading}
                  className="inline-flex items-center rounded-lg px-3 py-1.5 text-sm
                             bg-white/70 hover:bg-white/90 border border-current/20
                             disabled:opacity-60 disabled:cursor-not-allowed"
                  aria-label={tf('auth.resend', 'Send again')}
                >
                  {loading && (
                    <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" opacity="0.25" />
                      <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="4" fill="none" />
                    </svg>
                  )}
                  {tf('auth.resend', 'Send again')}
                </button>

                {note && <span className="text-sm opacity-80">{note}</span>}
              </div>
            )}
          </div>

          <button
            onClick={onClose}
            className="shrink-0 rounded-md px-2 py-1 text-inherit/70 hover:bg-black/5"
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
