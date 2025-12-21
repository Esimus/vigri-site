// app/privacy/page.tsx
'use client';

import PublicHeader from '@/components/layout/PublicHeader';
import { useI18n } from '@/hooks/useI18n';

export default function PrivacyPage() {
  const { t } = useI18n();

  return (
    <main className="page-bg min-h-screen">
      <PublicHeader />

      <div className="mx-auto flex max-w-4xl flex-col gap-10 px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="space-y-3">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 sm:text-3xl">
            {t('legal_privacy_page_title')}
          </h1>

          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {t('legal_privacy_updated_label')}: {t('legal_privacy_updated_value')}
          </p>

          <p className="max-w-2xl text-sm text-zinc-700 dark:text-zinc-400">
            {t('legal_privacy_intro')}
          </p>
        </header>

        {/* Content */}
        <section className="space-y-6 text-sm">
          {/* 1. Кто мы и как с нами связаться */}
          <div className="space-y-3 text-zinc-500 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_privacy_section1_title')}
            </h2>
            <p>{t('legal_privacy_section1_p1')}</p>
            <p>{t('legal_privacy_section1_p2')}</p>
            <p>{t('legal_privacy_section1_p3')}</p>
            <ul className="list-disc list-inside">
              <li>{t('legal_privacy_section1_email')}</li>
            </ul>
          </div>

          {/* 2. Какие данные мы собираем */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_privacy_section2_title')}
            </h2>
            <p>{t('legal_privacy_section2_intro')}</p>

            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>{t('legal_privacy_section2_account_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section2_account_li1')}</li>
                  <li>{t('legal_privacy_section2_account_li2')}</li>
                  <li>{t('legal_privacy_section2_account_li3')}</li>
                </ul>
              </li>

              <li>
                <strong>{t('legal_privacy_section2_tech_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section2_tech_li1')}</li>
                  <li>{t('legal_privacy_section2_tech_li2')}</li>
                  <li>{t('legal_privacy_section2_tech_li3')}</li>
                  <li>{t('legal_privacy_section2_tech_li4')}</li>
                </ul>
              </li>

              <li>
                <strong>{t('legal_privacy_section2_usage_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section2_usage_li1')}</li>
                  <li>{t('legal_privacy_section2_usage_li2')}</li>
                  <li>{t('legal_privacy_section2_usage_li3')}</li>
                </ul>
              </li>

              <li>
                <strong>{t('legal_privacy_section2_law_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section2_law_li1')}</li>
                  <li>{t('legal_privacy_section2_law_li2')}</li>
                </ul>
              </li>
            </ol>
          </div>

          {/* 3. Цели обработки данных */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_privacy_section3_title')}
            </h2>
            <p>{t('legal_privacy_section3_intro')}</p>

            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>{t('legal_privacy_section3_access_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section3_access_li1')}</li>
                  <li>{t('legal_privacy_section3_access_li2')}</li>
                  <li>{t('legal_privacy_section3_access_li3')}</li>
                </ul>
              </li>

              <li>
                <strong>{t('legal_privacy_section3_improve_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section3_improve_li1')}</li>
                  <li>{t('legal_privacy_section3_improve_li2')}</li>
                  <li>{t('legal_privacy_section3_improve_li3')}</li>
                </ul>
              </li>

              <li>
                <strong>{t('legal_privacy_section3_notify_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section3_notify_li1')}</li>
                  <li>{t('legal_privacy_section3_notify_li2')}</li>
                </ul>
              </li>

              <li>
                <strong>{t('legal_privacy_section3_security_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section3_security_li1')}</li>
                  <li>{t('legal_privacy_section3_security_li2')}</li>
                  <li>{t('legal_privacy_section3_security_li3')}</li>
                </ul>
              </li>

              <li>
                <strong>{t('legal_privacy_section3_law_title2')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section3_law_li21')}</li>
                  <li>{t('legal_privacy_section3_law_li22')}</li>
                </ul>
              </li>
            </ol>
          </div>

          {/* 4. Cookie-файлы и аналитика */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_privacy_section4_title')}
            </h2>
            <p>{t('legal_privacy_section4_p1')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('legal_privacy_section4_li1')}</li>
              <li>{t('legal_privacy_section4_li2')}</li>
              <li>{t('legal_privacy_section4_li3')}</li>
            </ul>
            <p>{t('legal_privacy_section4_p2')}</p>
            <p>{t('legal_privacy_section4_p3')}</p>
          </div>

          {/* 5. Передача данных третьим лицам */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_privacy_section5_title')}
            </h2>
            <p>{t('legal_privacy_section5_intro')}</p>

            <ol className="list-decimal list-inside space-y-2">
              <li>
                <strong>{t('legal_privacy_section5_infra_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section5_infra_li1')}</li>
                  <li>{t('legal_privacy_section5_infra_li2')}</li>
                </ul>
              </li>

              <li>
                <strong>{t('legal_privacy_section5_analytics_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section5_analytics_li1')}</li>
                  <li>{t('legal_privacy_section5_analytics_li2')}</li>
                </ul>
              </li>

              <li>
                <strong>{t('legal_privacy_section5_kyc_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section5_kyc_li1')}</li>
                  <li>{t('legal_privacy_section5_kyc_li2')}</li>
                </ul>
              </li>

              <li>
                <strong>{t('legal_privacy_section5_state_title')}</strong>
                <ul className="ml-4 mt-1 list-disc list-inside space-y-1">
                  <li>{t('legal_privacy_section5_state_li1')}</li>
                </ul>
              </li>
            </ol>

            <p>{t('legal_privacy_section5_p2')}</p>
          </div>

          {/* 6. Сроки хранения данных */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_privacy_section6_title')}
            </h2>
            <p>{t('legal_privacy_section6_p1')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('legal_privacy_section6_li1')}</li>
              <li>{t('legal_privacy_section6_li2')}</li>
              <li>{t('legal_privacy_section6_li3')}</li>
            </ul>
            <p>{t('legal_privacy_section6_p2')}</p>
          </div>

          {/* 7. Ваши права */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_privacy_section7_title')}
            </h2>
            <p>{t('legal_privacy_section7_p1')}</p>
            <ul className="list-disc list-inside space-y-1">
              <li>{t('legal_privacy_section7_li1')}</li>
              <li>{t('legal_privacy_section7_li2')}</li>
              <li>{t('legal_privacy_section7_li3')}</li>
              <li>{t('legal_privacy_section7_li4')}</li>
              <li>{t('legal_privacy_section7_li5')}</li>
              <li>{t('legal_privacy_section7_li6')}</li>
            </ul>
            <p>{t('legal_privacy_section7_p2')}</p>
          </div>

          {/* 8. Изменения Политики конфиденциальности */}
          <div className="space-y-3 text-zinc-700 dark:text-zinc-300">
            <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
              {t('legal_privacy_section8_title')}
            </h2>
            <p>{t('legal_privacy_section8_p1')}</p>
          </div>
        </section>
      </div>
    </main>
  );
}
