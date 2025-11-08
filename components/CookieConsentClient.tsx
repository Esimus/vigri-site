// components/CookieConsentClient.tsx
'use client';

import { useEffect, useState } from 'react';
import CookieConsent from '@/components/CookieConsent';

export default function CookieConsentClient({ show }: { show: boolean }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // До маунта и если не надо показывать — ничего не рендерим (без SSR → нет рассинхрона)
  if (!mounted || !show) return null;

  return <CookieConsent />;
}
