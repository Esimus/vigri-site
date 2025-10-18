'use client';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import { useI18n } from '@/hooks/useI18n';
import type { Lang } from '@/lib/i18n';

export default function DashboardLanguage() {
  const { lang, setLang } = useI18n();
  const onChange = (l: Lang) => {
    setLang(l);               
    window.location.reload();  
  };

  return <LanguageSwitcher lang={lang ?? ('en' as Lang)} onChange={onChange} />;
}
