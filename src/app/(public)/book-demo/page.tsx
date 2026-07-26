import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import JsonLd from '@/components/seo/JsonLd';
import BookDemoContent from '@/features/book-demo/BookDemoContent';
import { SITE_URL, SITE_OG_IMAGE } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'Book a Free Demo Class',
  description:
    'Book your free demo chess class at ChessHub Academy. Experience a real lesson with a FIDE-rated grandmaster at zero cost and zero commitment.',
  alternates: { canonical: `${SITE_URL}/book-demo` },
  openGraph: {
    title: 'Book a Free Demo Chess Class | ChessHub Academy',
    description:
      'Book a free 30-minute live demo class with a grandmaster. Zero cost. Zero commitment.',
    url: `${SITE_URL}/book-demo`,
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: 'Book a Free Demo | ChessHub Academy' }],
  },
};

const serviceSchema = {
  '@context': 'https://schema.org',
  '@type': 'Service',
  name: 'Free Demo Chess Class',
  provider: { '@type': 'EducationalOrganization', name: 'ChessHub Academy', url: SITE_URL },
  description: 'Free 30-minute live online chess demo class with a FIDE-rated grandmaster.',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
  url: `${SITE_URL}/book-demo`,
};

export default function BookDemoPage() {
  return (
    <>
      <JsonLd data={serviceSchema} />
      <BookDemoContent />
    </>
  );
}
