import type { Metadata } from 'next';

import { CENTER_FULL_NAME_EN } from '@/constants/brand';
import CenterPageClient from '@/components/CenterPageClient';


export async function generateMetadata(): Promise<Metadata> {
  const title = CENTER_FULL_NAME_EN;
  const description =
    'A modern multi-building campus on the Gulf of Finland: hotel, medical and rehabilitation pavilions, spa, pools, indoor arenas and outdoor fields.';
  const ogImage = '/images/projects/international-center/cover.webp';

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: '/center',
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  };
}

export default function Page() {
  return <CenterPageClient />;
}
