import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import JsonLd from '@/components/seo/JsonLd';
import FAQItem from '@/features/faq/FAQItem';
import BookDemoCTASection from '@/features/home/BookDemoCTASection';
import { FAQS } from '@/constants/FAQS';
import { SITE_URL, SITE_OG_IMAGE, SITE_EMAIL } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers to the most common questions from parents and students about ChessHub Academy — programs, pricing, coaches, classes, and how to get started.',
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: {
    title: 'FAQ | ChessHub Academy',
    description: 'Answers to common questions about chess coaching, classes, and enrollment.',
    url: `${SITE_URL}/faq`,
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: 'ChessHub Academy FAQ' }],
  },
};

const CATEGORIES = [...new Set(FAQS.map((f) => f.category))];

export default function FAQPage() {
  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };

  return (
    <>
      <JsonLd data={faqSchema} />

      {/* Hero */}
      <section className="pt-32 pb-16 bg-gradient-to-br from-primary-dark via-primary to-[#1a45b0] text-white chess-bg relative" aria-label="FAQ header">
        <Container className="relative z-10 text-center">
          <span className="inline-block mb-4 text-sm font-semibold tracking-widest uppercase text-accent">
            Help Center
          </span>
          <h1 className="font-heading text-5xl lg:text-6xl font-bold text-white mb-5">
            Frequently Asked{' '}
            <span className="text-gradient-gold">Questions</span>
          </h1>
          <p className="text-white/70 text-xl max-w-2xl mx-auto">
            Everything parents and students need to know before joining ChessHub Academy.
          </p>
        </Container>
      </section>

      {/* FAQ by category */}
      <section className="section-py bg-surface-light" aria-label="Frequently asked questions">
        <Container>
          {CATEGORIES.map((category) => (
            <div key={category} className="mb-14">
              <h2 className="font-heading text-2xl font-bold text-text-primary mb-6 flex items-center gap-3">
                <span className="w-1 h-6 bg-accent rounded-full" aria-hidden="true" />
                {category}
              </h2>
              <div className="space-y-3">
                {FAQS.filter((faq) => faq.category === category).map((faq) => (
                  <FAQItem
                    key={faq.id}
                    id={faq.id}
                    question={faq.question}
                    answer={faq.answer}
                  />
                ))}
              </div>
            </div>
          ))}
        </Container>
      </section>

      {/* Still have questions */}
      <section className="py-20 bg-white" aria-label="Contact for more questions">
        <Container>
          <div className="max-w-2xl mx-auto text-center">
            <div className="text-5xl mb-6" aria-hidden="true">💬</div>
            <h2 className="font-heading text-3xl font-bold text-text-primary mb-4">
              Still Have Questions?
            </h2>
            <p className="text-text-secondary text-lg mb-8 leading-relaxed">
              Our team is always happy to help. Reach out via email, WhatsApp, or book a free
              demo class to speak with a coach directly.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`mailto:${SITE_EMAIL}`}
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all duration-200 shadow-blue"
              >
                Email Us
              </a>
              <a
                href="/contact"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold rounded-xl transition-all duration-200"
              >
                Contact Form
              </a>
            </div>
          </div>
        </Container>
      </section>

      <BookDemoCTASection />
    </>
  );
}
