import Link from 'next/link';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import FAQItem from '@/features/faq/FAQItem';
import { FAQS } from '@/constants/FAQS';

export default function FAQSection() {
  const homeFAQs = FAQS.slice(0, 6);

  return (
    <section className="section-py bg-white" aria-label="Frequently asked questions">
      <Container>
        <SectionTitle
          eyebrow="FAQ"
          title="Frequently Asked"
          titleHighlight="Questions"
          subtitle="Everything parents and students want to know before enrolling."
        />

        <div className="max-w-3xl mx-auto space-y-3">
          {homeFAQs.map((faq) => (
            <FAQItem
              key={faq.id}
              id={faq.id}
              question={faq.question}
              answer={faq.answer}
            />
          ))}
        </div>

        <div className="text-center mt-10">
          <Link
            href="/faq"
            className="inline-flex items-center gap-2 text-primary font-semibold hover:text-primary-dark transition-colors"
          >
            View all {FAQS.length} questions
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </Container>
    </section>
  );
}
