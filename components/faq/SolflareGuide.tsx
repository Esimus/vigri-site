// components/faq/SolflareGuide.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useI18n } from '@/hooks/useI18n';
import { FaqLightboxProvider, FaqZoomImage } from '@/components/ui/FaqLightbox';

type StepFigure = {
  src: string;
  altKey: string;
  width: number;
  height: number;
};

type StepAction = {
  labelKey: string;
  href: string;
};

type StepTag = 'Edge' | 'Chrome' | 'Security' | 'Tip' | 'Troubleshooting';

type Step = {
  id: string;
  titleKey: string;
  bulletKeys: string[];
  tags?: StepTag[];
  actions?: StepAction[];
  figure?: StepFigure;
};

type Section = {
  titleKey: string;
  descKey?: string;
  steps: Step[];
};

const sections: Section[] = [
  {
    titleKey: 'faq_solflare_s1_title',
    descKey: 'faq_solflare_s1_desc',
    steps: [
      {
        id: 'solflare-1',
        titleKey: 'faq_solflare_step_solflare_1_title',
        tags: ['Edge', 'Chrome'],
        bulletKeys: ['faq_solflare_step_solflare_1_b1', 'faq_solflare_step_solflare_1_b2'],
        actions: [{ labelKey: 'faq_solflare_action_open_download', href: 'https://www.solflare.com/download/' }],
        figure: {
          src: '/images/faq/solflare/solflare_1.webp',
          altKey: 'faq_solflare_step_solflare_1_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'solflare-2',
        titleKey: 'faq_solflare_step_solflare_2_title',
        tags: ['Edge', 'Chrome'],
        bulletKeys: ['faq_solflare_step_solflare_2_b1', 'faq_solflare_step_solflare_2_b2'],
        figure: {
          src: '/images/faq/solflare/solflare_2.webp',
          altKey: 'faq_solflare_step_solflare_2_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'solflare-3',
        titleKey: 'faq_solflare_step_solflare_3_title',
        tags: ['Security'],
        bulletKeys: [
          'faq_solflare_step_solflare_3_b1',
          'faq_solflare_step_solflare_3_b2',
          'faq_solflare_step_solflare_3_b3',
        ],
        figure: {
          src: '/images/faq/solflare/solflare_3.webp',
          altKey: 'faq_solflare_step_solflare_3_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'solflare-4',
        titleKey: 'faq_solflare_step_solflare_4_title',
        tags: ['Security'],
        bulletKeys: [
          'faq_solflare_step_solflare_4_b1',
          'faq_solflare_step_solflare_4_b2',
          'faq_solflare_step_solflare_4_b3',
        ],
        figure: {
          src: '/images/faq/solflare/solflare_4.webp',
          altKey: 'faq_solflare_step_solflare_4_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'solflare-5',
        titleKey: 'faq_solflare_step_solflare_5_title',
        tags: ['Security', 'Tip'],
        bulletKeys: ['faq_solflare_step_solflare_5_b1', 'faq_solflare_step_solflare_5_b2'],
        figure: {
          src: '/images/faq/solflare/solflare_5.webp',
          altKey: 'faq_solflare_step_solflare_5_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'solflare-6',
        titleKey: 'faq_solflare_step_solflare_6_title',
        bulletKeys: ['faq_solflare_step_solflare_6_b1', 'faq_solflare_step_solflare_6_b2'],
        figure: {
          src: '/images/faq/solflare/solflare_6.webp',
          altKey: 'faq_solflare_step_solflare_6_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'solflare-7',
        titleKey: 'faq_solflare_step_solflare_7_title',
        tags: ['Edge', 'Chrome', 'Tip'],
        bulletKeys: [
          'faq_solflare_step_solflare_7_b1',
          'faq_solflare_step_solflare_7_b2',
          'faq_solflare_step_solflare_7_b3',
        ],
        figure: {
          src: '/images/faq/solflare/solflare_7.webp',
          altKey: 'faq_solflare_step_solflare_7_alt',
          width: 1200,
          height: 800,
        },
      },
    ],
  },

  {
    titleKey: 'faq_solflare_s2_title',
    descKey: 'faq_solflare_s2_desc',
    steps: [
      {
        id: 'vigri-1',
        titleKey: 'faq_solflare_step_vigri_1_title',
        bulletKeys: ['faq_solflare_step_vigri_1_b1'],
        figure: {
          src: '/images/faq/vigri/vigri_1.webp',
          altKey: 'faq_solflare_step_vigri_1_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'vigri-2',
        titleKey: 'faq_solflare_step_vigri_2_title',
        bulletKeys: ['faq_solflare_step_vigri_2_b1'],
        figure: {
          src: '/images/faq/vigri/vigri_2.webp',
          altKey: 'faq_solflare_step_vigri_2_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'vigri-3',
        titleKey: 'faq_solflare_step_vigri_3_title',
        bulletKeys: ['faq_solflare_step_vigri_3_b1', 'faq_solflare_step_vigri_3_b2'],
        figure: {
          src: '/images/faq/vigri/vigri_3.webp',
          altKey: 'faq_solflare_step_vigri_3_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'vigri-4',
        titleKey: 'faq_solflare_step_vigri_4_title',
        bulletKeys: ['faq_solflare_step_vigri_4_b1'],
        figure: {
          src: '/images/faq/vigri/vigri_4.webp',
          altKey: 'faq_solflare_step_vigri_4_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'vigri-5',
        titleKey: 'faq_solflare_step_vigri_5_title',
        tags: ['Troubleshooting'],
        bulletKeys: [
          'faq_solflare_step_vigri_5_b1',
          'faq_solflare_step_vigri_5_b2',
          'faq_solflare_step_vigri_5_b3',
        ],
        figure: {
          src: '/images/faq/vigri/vigri_5.webp',
          altKey: 'faq_solflare_step_vigri_5_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'vigri-6',
        titleKey: 'faq_solflare_step_vigri_6_title',
        tags: ['Tip'],
        bulletKeys: ['faq_solflare_step_vigri_6_b1', 'faq_solflare_step_vigri_6_b2'],
        figure: {
          src: '/images/faq/vigri/vigri_6.webp',
          altKey: 'faq_solflare_step_vigri_6_alt',
          width: 1200,
          height: 800,
        },
      },
    ],
  },

  {
    titleKey: 'faq_solflare_s3_title',
    descKey: 'faq_solflare_s3_desc',
    steps: [
      {
        id: 'buy-1',
        titleKey: 'faq_solflare_step_buy_1_title',
        bulletKeys: ['faq_solflare_step_buy_1_b1', 'faq_solflare_step_buy_1_b2'],
        figure: {
          src: '/images/faq/vigri/vigri_7.webp',
          altKey: 'faq_solflare_step_buy_1_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'buy-2',
        titleKey: 'faq_solflare_step_buy_2_title',
        bulletKeys: [
          'faq_solflare_step_buy_2_b1',
          'faq_solflare_step_buy_2_b2',
          'faq_solflare_step_buy_2_b3',
          'faq_solflare_step_buy_2_b4',
        ],
        figure: {
          src: '/images/faq/vigri/vigri_8.webp',
          altKey: 'faq_solflare_step_buy_2_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'buy-3',
        titleKey: 'faq_solflare_step_buy_3_title',
        tags: ['Tip'],
        bulletKeys: [
          'faq_solflare_step_buy_3_b1',
          'faq_solflare_step_buy_3_b2',
          'faq_solflare_step_buy_3_b3',
          'faq_solflare_step_buy_3_b4',
          'faq_solflare_step_buy_3_b5',
        ],
        figure: {
          src: '/images/faq/vigri/vigri_9.webp',
          altKey: 'faq_solflare_step_buy_3_alt',
          width: 1200,
          height: 800,
        },
      },
      {
        id: 'buy-4',
        titleKey: 'faq_solflare_step_buy_4_title',
        bulletKeys: ['faq_solflare_step_buy_4_b1', 'faq_solflare_step_buy_4_b2'],
        figure: {
          src: '/images/faq/vigri/vigri_10.webp',
          altKey: 'faq_solflare_step_buy_4_alt',
          width: 1200,
          height: 800,
        },
      },
    ],
  },
];

function Tag({
  label,
  text,
}: {
  label: StepTag;
  text: string;
}) {
  const icon =
    label === 'Edge' ? (
      <Image src="/icons/edge.svg" alt="Edge" width={16} height={16} className="h-4 w-4" />
    ) : label === 'Chrome' ? (
      <Image src="/icons/chrome.svg" alt="Chrome" width={16} height={16} className="h-4 w-4" />
    ) : label === 'Security' ? (
      <span aria-hidden="true">🔒</span>
    ) : label === 'Troubleshooting' ? (
      <span aria-hidden="true">🛠️</span>
    ) : (
      <span aria-hidden="true">💡</span>
    );

  return (
    <span className="chip chip--sm">
      <span className="inline-flex items-center">{icon}</span>
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

          {step.actions && step.actions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {step.actions.map((a) => (
                <Link
                  key={a.href}
                  href={a.href}
                  target="_blank"
                  rel="noreferrer"
                  className="link-accent text-sm"
                >
                  {t(a.labelKey)}
                </Link>
              ))}
            </div>
          )}

          {step.figure && (
            <details className="card p-3">
              <summary className="btn btn-outline w-full justify-between cursor-pointer">
                <span>{screenshotLabel}</span>
                <span aria-hidden="true">▾</span>
              </summary>

              <div className="mt-3 space-y-2">
                <div className="card p-2">
                  <FaqZoomImage
                    src={step.figure.src}
                    alt={t(step.figure.altKey)}
                    title={t(step.titleKey)}
                    width={step.figure.width}
                    height={step.figure.height}
                    className="w-full max-w-md mx-auto h-auto max-h-64 object-contain rounded-lg"
                  />
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

export function SolflareGuide() {
  const { t } = useI18n();

  return (
    <FaqLightboxProvider>
      <div className="space-y-8">
        <div className="card p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl bg-zinc-900/5 dark:bg-zinc-50/5 flex items-center justify-center">
              <Image
                src="/icons/solflare.svg"
                alt="Solflare logo"
                width={28}
                height={28}
              />
            </div>
            <div>
              <h1 className="text-2xl font-semibold">
                {t('faq_solflare_page_title')}
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
                {t('faq_solflare_page_intro')}
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
