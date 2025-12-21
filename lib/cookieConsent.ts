// lib/cookieConsent.ts
// Central helpers for cookie consent banner.

export const COOKIE_CONSENT_NAME = 'vigri_cookie_consent';
export const COOKIE_CONSENT_MAX_AGE = 60 * 60 * 24 * 180; // 180 days

export type ConsentCategories = {
  necessary: true;         // always true, non-optional
  analytics: boolean;
  marketing: boolean;      // "targeting"
  functional: boolean;
  unclassified: boolean;
};

export type ConsentState = {
  version: 1;
  ts: number;              // unix seconds
  categories: ConsentCategories;
};

export function parseConsentCookie(value: string | null): ConsentState | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(value)) as ConsentState;
    if (!parsed || parsed.version !== 1 || !parsed.categories) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function serializeConsentCookie(state: ConsentState): string {
  return encodeURIComponent(JSON.stringify(state));
}

// Client-side setter (safe to call in browsers only).
export function setConsentCookieClient(state: ConsentState) {
  const value = serializeConsentCookie(state);
  document.cookie =
    `${COOKIE_CONSENT_NAME}=${value}; Max-Age=${COOKIE_CONSENT_MAX_AGE}; Path=/; SameSite=Lax`;
}

// Tiny helper for default "all off except necessary".
export function defaultConsent(): ConsentState {
  return {
    version: 1,
    ts: Math.floor(Date.now() / 1000),
    categories: {
      necessary: true,
      analytics: false,
      marketing: false,
      functional: false,
      unclassified: false,
    },
  };
}
