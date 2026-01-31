// components/faq/PhantomFaqContent.tsx
'use client';

import Image from 'next/image';
import { useI18n } from '@/hooks/useI18n';
import { FaqLightboxProvider, FaqZoomImage } from '@/components/ui/FaqLightbox';

type StepTag = 'Edge' | 'Chrome' | 'Firefox' | 'Security' | 'Tip' | 'Troubleshooting';

type StepLink = {
  href: string;
  labelKey: string;
};

type StepFigure = {
  src: string;
  altKey: string;
  width: number;
  height: number;
};

type Step = {
  id: string;
  titleKey: string;
  bulletKeys: string[];
  tags?: StepTag[];
  links?: StepLink[];
  figures?: StepFigure[];
};

type Section = {
  titleKey: string;
  descKey?: string;
  steps: Step[];
};

const sections: Section[] = [
  {
    titleKey: 'faq_phantom_s1_title',
    descKey: 'faq_phantom_s1_desc',
    steps: [
      {
        id: 'install-1',
        titleKey: 'faq_phantom_step_install_1_title',
        tags: ['Edge', 'Chrome', 'Firefox'],
        bulletKeys: [
          'faq_phantom_step_install_1_b1',
          'faq_phantom_step_install_1_b2',
          'faq_phantom_step_install_1_b3',
        ],
        links: [
          {
            href: 'https://phantom.com/download',
            labelKey: 'faq_phantom_link_official_download',
          },
          {
            href: 'https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
            labelKey: 'faq_phantom_link_edge_addons_home',
          },
          {
            href: 'https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa',
            labelKey: 'faq_phantom_link_chrome_store',
          },
          {
            href: 'https://addons.mozilla.org/en-US/firefox/addon/phantom-app/',
            labelKey: 'faq_phantom_link_firefox_addons',
          },
        ],
        figures: [
          {
            src: '/images/faq/phantom/phantom_1.webp',
            altKey: 'faq_phantom_step_install_1_alt',
            width: 1200,
            height: 800,
          },
          {
            src: '/images/faq/phantom/phantom_2.webp',
            altKey: 'faq_phantom_step_install_1_alt',
            width: 1200,
            height: 800,
          },
          {
            src: '/images/faq/phantom/phantom_3.webp',
            altKey: 'faq_phantom_step_install_1_alt',
            width: 1200,
            height: 800,
          },
        ],
      },
      {
        id: 'install-2',
        titleKey: 'faq_phantom_step_install_2_title',
        tags: ['Security', 'Edge', 'Chrome', 'Firefox'],
        bulletKeys: [
          'faq_phantom_step_install_2_b1',
          'faq_phantom_step_install_2_b2',
          'faq_phantom_step_install_2_b3',
        ],
        figures: [
          {
            src: '/images/faq/phantom/phantom_4.webp',
            altKey: 'faq_phantom_step_install_2_alt',
            width: 1200,
            height: 800,
          },
          {
            src: '/images/faq/phantom/phantom_4.1.webp',
            altKey: 'faq_phantom_step_install_2_alt',
            width: 1200,
            height: 800,
          },
          {
            src: '/images/faq/phantom/phantom_4.2.webp',
            altKey: 'faq_phantom_step_install_2_alt',
            width: 1200,
            height: 800,
          },
          {
            src: '/images/faq/phantom/phantom_4.3.webp',
            altKey: 'faq_phantom_step_install_2_alt',
            width: 1200,
            height: 800,
          },
        ],
      },
    ],
  },
  {
    titleKey: 'faq_phantom_s2_title',
    descKey: 'faq_phantom_s2_desc',
    steps: [
      {
        id: 'connect-1',
        titleKey: 'faq_phantom_step_connect_1_title',
        bulletKeys: ['faq_phantom_step_connect_1_b1', 'faq_phantom_step_connect_1_b2'],
        figures: [
          {
            src: '/images/faq/phantom/phantom_5.webp',
            altKey: 'faq_phantom_step_connect_1_alt',
            width: 1200,
            height: 800,
          },
        ],
      },
      {
        id: 'connect-2',
        titleKey: 'faq_phantom_step_connect_2_title',
        bulletKeys: ['faq_phantom_step_connect_2_b1', 'faq_phantom_step_connect_2_b2'],
        figures: [
          {
            src: '/images/faq/phantom/phantom_6.webp',
            altKey: 'faq_phantom_step_connect_2_alt',
            width: 1200,
            height: 800,
          },
        ],
      },
      {
        id: 'connect-3',
        titleKey: 'faq_phantom_step_connect_3_title',
        tags: ['Tip'],
        bulletKeys: ['faq_phantom_step_connect_3_b1', 'faq_phantom_step_connect_3_b2'],
        figures: [
          {
            src: '/images/faq/phantom/phantom_7.webp',
            altKey: 'faq_phantom_step_connect_3_alt',
            width: 1200,
            height: 800,
          },
        ],
      },
    ],
  },
  {
    titleKey: 'faq_phantom_s3_title',
    descKey: 'faq_phantom_s3_desc',
    steps: [
      {
        id: 'buy-1',
        titleKey: 'faq_phantom_step_buy_1_title',
        bulletKeys: ['faq_phantom_step_buy_1_b1', 'faq_phantom_step_buy_1_b2'],
        figures: [
          {
            src: '/images/faq/phantom/phantom_8.webp',
            altKey: 'faq_phantom_step_buy_1_alt',
            width: 1200,
            height: 800,
          },
        ],
      },
      {
        id: 'buy-2',
        titleKey: 'faq_phantom_step_buy_2_title',
        tags: ['Security'],
        bulletKeys: [
          'faq_phantom_step_buy_2_b1',
          'faq_phantom_step_buy_2_b2',
          'faq_phantom_step_buy_2_b3',
        ],
        figures: [
          {
            src: '/images/faq/phantom/phantom_9.webp',
            altKey: 'faq_phantom_step_buy_2_alt',
            width: 1200,
            height: 800,
          },
        ],
      },
      {
        id: 'buy-3',
        titleKey: 'faq_phantom_step_buy_3_title',
        tags: ['Troubleshooting'],
        bulletKeys: [
          'faq_phantom_step_buy_3_b1',
          'faq_phantom_step_buy_3_b2',
          'faq_phantom_step_buy_3_b3',
        ],
        figures: [
          {
            src: '/images/faq/phantom/phantom_10.webp',
            altKey: 'faq_phantom_step_buy_3_alt',
            width: 1200,
            height: 800,
          },
        ],
      },
    ],
  },
];

function Tag({ label, text }: { label: StepTag; text: string }) {
  const icon =
    label === 'Edge' ? (
      <Image src="/icons/edge.svg" alt="Edge" width={16} height={16} className="h-4 w-4" />
    ) : label === 'Chrome' ? (
      <Image src="/icons/chrome.svg" alt="Chrome" width={16} height={16} className="h-4 w-4" />
    ) : label === 'Firefox' ? (
      <Image src="/icons/firefox.svg" alt="Firefox" width={16} height={16} className="h-4 w-4" />
    ) : label === 'Security' ? (
      <span aria-hidden="true">🔒</span>
    ) : label === 'Troubleshooting' ? (
      <span aria-hidden="true">🛠️</span>
    ) : (
      <span aria-hidden="true">💡</span>
    );

  return (
    <span className="chip chip--sm">
      <span className="inline-flex items-center mr-1">{icon}</span>
      <span>{text}</span>
    </span>
  );
}

function StepCard({
  index,
  step,
  t,
}: {
  index: number;
  step: Step;
  t: (key: string) => string;
}) {
  const screenshotLabel = t('faq_solflare_ui_screenshot_label');
  const zoomHint = t('faq_solflare_ui_zoom_hint');

  return (
    <div className="card p-4">
      <div className="flex gap-3">
        <div className="chip chip--sm" aria-hidden="true">
          {index}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold">{t(step.titleKey)}</h3>

            {step.tags?.map((tag) => {
              const tagText =
                tag === 'Edge'
                  ? t('faq_tag_edge')
                  : tag === 'Chrome'
                  ? t('faq_tag_chrome')
                  : tag === 'Firefox'
                  ? t('faq_tag_firefox')
                  : tag === 'Security'
                  ? t('faq_tag_security')
                  : tag === 'Troubleshooting'
                  ? t('faq_tag_troubleshooting')
                  : t('faq_tag_tip');

              return <Tag key={tag} label={tag} text={tagText} />;
            })}
          </div>

          <ul className="list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-200 space-y-1">
            {step.bulletKeys.map((k) => (
              <li key={k}>{t(k)}</li>
            ))}
          </ul>

          {step.links && step.links.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {step.links.map((l) => (
                <a
                  key={`${step.id}-${l.labelKey}`}
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chip chip--sm"
                >
                  {t(l.labelKey)} <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          )}

          {step.figures && step.figures.length > 0 && (
            <details className="card p-3">
              <summary className="btn btn-outline w-full justify-between cursor-pointer">
                <span>{screenshotLabel}</span>
                <span aria-hidden="true">▾</span>
              </summary>

              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {step.figures.map((fig, idx) => (
                    <div
                      key={`${step.id}-figure-${idx}`}
                      className="relative card p-2"
                    >
                      <span className="chip chip--sm absolute left-2 top-2 z-10 pointer-events-none">
                        {idx + 1}
                      </span>

                      <FaqZoomImage
                        src={fig.src}
                        alt={t(fig.altKey)}
                        title={t(step.titleKey)}
                        width={fig.width}
                        height={fig.height}
                        className="w-full h-auto max-h-48 object-contain rounded-lg"
                      />
                    </div>
                  ))}
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-400">{zoomHint}</p>
              </div>
            </details>
          )}
        </div>
      </div>
    </div>
  );
}

export function PhantomFaqContent() {
  const { t } = useI18n();

  return (
    <FaqLightboxProvider>
      <div className="space-y-8">
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-zinc-900/5 dark:bg-zinc-50/5 flex items-center justify-center">
              <Image src="/icons/phantom.svg" alt="Phantom logo" width={28} height={28} />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">{t('faq_phantom_page_title')}</h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {t('faq_phantom_page_intro')}
              </p>
            </div>
          </div>
        </div>

        {sections.map((section) => (
          <section key={section.titleKey} className="space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{t(section.titleKey)}</h2>
              {section.descKey && (
                <p className="text-sm text-zinc-600 dark:text-zinc-300">
                  {t(section.descKey)}
                </p>
              )}
            </div>

            <div className="space-y-3">
              {section.steps.map((step, i) => (
                <StepCard key={step.id} index={i + 1} step={step} t={t} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </FaqLightboxProvider>
  );
}
