// app/terms/page.tsx
'use client';

import PublicHeader from '@/components/layout/PublicHeader';
import { useI18n } from '@/hooks/useI18n';

export default function TermsPage() {
  const { t } = useI18n();

  return (
    <main className="page-bg min-h-screen">
      <PublicHeader />

      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {t('legal_terms_page_title')}
          </h1>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('legal_terms_updated_label')}: {t('legal_terms_updated_value')}
          </p>

          <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-300">
            {t('legal_terms_intro')}
          </p>
        </header>

        {/* Content */}
        <section className="space-y-6 text-sm">
          {/* 1. О сервисе VIGRI */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_terms_section1_title')}
            </h2>
            <p>{t('legal_terms_section1_p1')}</p>
            <p>{t('legal_terms_section1_p2')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('legal_terms_section1_li1')}</li>
              <li>{t('legal_terms_section1_li2')}</li>
              <li>{t('legal_terms_section1_li3')}</li>
              <li>{t('legal_terms_section1_li4')}</li>
            </ul>
            <p>{t('legal_terms_section1_p3')}</p>
          </div>

          {/* 2. Не является инвестиционной рекомендацией */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_terms_section2_title')}
            </h2>
            <p>{t('legal_terms_section2_p1')}</p>
            <p>{t('legal_terms_section2_p2')}</p>
          </div>

          {/* 3. Риски, связанные с NFT и криптовалютами */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_terms_section3_title')}
            </h2>
            <p>{t('legal_terms_section3_p1')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('legal_terms_section3_li1')}</li>
              <li>{t('legal_terms_section3_li2')}</li>
              <li>{t('legal_terms_section3_li3')}</li>
              <li>{t('legal_terms_section3_li4')}</li>
            </ul>
            <p>{t('legal_terms_section3_p2')}</p>
          </div>

          {/* 4. Возрастные и юридические ограничения */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_terms_section4_title')}
            </h2>
            <p>{t('legal_terms_section4_p1')}</p>
            <p>{t('legal_terms_section4_p2')}</p>
            <p>{t('legal_terms_section4_p3')}</p>
          </div>

          {/* 5. Аккаунт и безопасность */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_terms_section5_title')}
            </h2>
            <p>{t('legal_terms_section5_p1')}</p>
            <p>{t('legal_terms_section5_p2')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('legal_terms_section5_li1')}</li>
              <li>{t('legal_terms_section5_li2')}</li>
              <li>{t('legal_terms_section5_li3')}</li>
            </ul>
            <p>{t('legal_terms_section5_p3')}</p>
            <p>{t('legal_terms_section5_p4')}</p>
          </div>

          {/* 6. Взаимодействие с внешними сервисами */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_terms_section6_title')}
            </h2>
            <p>{t('legal_terms_section6_p1')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('legal_terms_section6_li1')}</li>
              <li>{t('legal_terms_section6_li2')}</li>
              <li>{t('legal_terms_section6_li3')}</li>
            </ul>
            <p>{t('legal_terms_section6_p2')}</p>
            <p>{t('legal_terms_section6_p3')}</p>
          </div>

          {/* 7. Ограничение ответственности */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_terms_section7_title')}
            </h2>
            <p>{t('legal_terms_section7_p1')}</p>
            <p>{t('legal_terms_section7_p2_intro')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('legal_terms_section7_li1')}</li>
              <li>{t('legal_terms_section7_li2')}</li>
              <li>{t('legal_terms_section7_li3')}</li>
              <li>{t('legal_terms_section7_li4')}</li>
            </ul>
            <p>{t('legal_terms_section7_p3')}</p>
          </div>

          {/* 8. Право изменять или прекращать работу Сервиса */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_terms_section8_title')}
            </h2>
            <p>{t('legal_terms_section8_p1')}</p>
            <p>{t('legal_terms_section8_p2')}</p>
          </div>

          {/* 9. Изменения Условий */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_terms_section9_title')}
            </h2>
            <p>{t('legal_terms_section9_p1')}</p>
          </div>

          {/* 10. Контакты */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_terms_section10_title')}
            </h2>
            <p>{t('legal_terms_section10_p1')}</p>
            <ul className="list-disc list-inside">
              <li>{t('legal_terms_section10_email')}</li>
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
