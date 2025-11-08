// components/CookieConsentGate.tsx
// Server wrapper: checks cookie on the server, but renders content only on the client to avoid hydration mismatch.

import { cookies } from 'next/headers';
import { COOKIE_CONSENT_NAME, parseConsentCookie } from '@/lib/cookieConsent';
import CookieConsentClient from '@/components/CookieConsentClient';

export default async function CookieConsentGate() {
  const jar = await cookies(); // Next 15: Promise
  const raw = jar.get(COOKIE_CONSENT_NAME)?.value ?? null;
  const parsed = parseConsentCookie(raw);

  return <CookieConsentClient show={!parsed} />;
}
