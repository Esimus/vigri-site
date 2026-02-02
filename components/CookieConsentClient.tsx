// components/CookieConsentClient.tsx
'use client';

import CookieConsent from '@/components/CookieConsent';

export default function CookieConsentClient({ show }: { show: boolean }) {
  if (!show) return null;

  return <CookieConsent />;
}
