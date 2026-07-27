import type { Metadata } from 'next';
import JsonLd from '@/components/seo/JsonLd';
import HeroSection from '@/features/home/HeroSection';
import TrustBar from '@/features/home/TrustBar';
import StatisticsSection from '@/features/home/StatisticsSection';
import ProgramsSection from '@/features/home/ProgramsSection';
import WhyChooseUsSection from '@/features/home/WhyChooseUsSection';
import LearningJourneySection from '@/features/home/LearningJourneySection';
import CoachesSection from '@/features/home/CoachesSection';
import StudentSuccessSection from '@/features/home/StudentSuccessSection';
import TestimonialsSection from '@/features/home/TestimonialsSection';
import FAQSection from '@/features/home/FAQSection';
import BookDemoCTASection from '@/features/home/BookDemoCTASection';
import { SITE_NAME, SITE_TAGLINE, SITE_URL, SITE_OG_IMAGE } from '@/constants/SITE';

export const metadata: Metadata = {
  title: `${SITE_NAME} — ${SITE_TAGLINE}`,
  description:
    'ChessHub Academy offers premium live online chess classes from FIDE-rated grandmasters and international masters. Programs for all ages. Book your free demo class today.',
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: `${SITE_NAME} — ${SITE_TAGLINE}`,
    description:
      'Premium online chess coaching from FIDE-rated grandmasters. 500+ students, 20+ countries. Book your free demo class today.',
    url: SITE_URL,
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: `${SITE_NAME}` }],
  },
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: SITE_NAME,
  url: SITE_URL,
  description:
    'Premium online chess coaching from FIDE-rated grandmasters and international masters.',
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/blog?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

const orgSchema = {
  '@context': 'https://schema.org',
  '@type': 'EducationalOrganization',
  name: SITE_NAME,
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description:
    'ChessHub Academy is a premium international online chess learning platform offering live classes from FIDE-rated coaches.',
  sameAs: [
    'https://twitter.com/chesshubacademy',
    'https://instagram.com/chesshubacademy',
    'https://youtube.com/@chesshubacademy',
    'https://linkedin.com/company/chesshubacademy',
  ],
  offers: {
    '@type': 'Offer',
    description: 'Free Demo Chess Class',
    price: '0',
    priceCurrency: 'USD',
  },
};

export default function HomePage() {
  return (
    <>
      <JsonLd data={websiteSchema} />
      <JsonLd data={orgSchema} />
      <HeroSection />
      <TrustBar />
      <StatisticsSection />
      <ProgramsSection />
      <WhyChooseUsSection />
      <LearningJourneySection />
      <CoachesSection />
      <StudentSuccessSection />
      <TestimonialsSection />
      <FAQSection />
      <BookDemoCTASection />
    </>
  );
}
