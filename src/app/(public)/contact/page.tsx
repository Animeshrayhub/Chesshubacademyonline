import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import Card from '@/components/ui/Card';
import JsonLd from '@/components/seo/JsonLd';
import ContactForm from '@/features/contact/ContactForm';
import FAQItem from '@/features/faq/FAQItem';
import { FAQS } from '@/constants/FAQS';
import { SITE_URL, SITE_OG_IMAGE, SITE_EMAIL, SITE_PHONE, SITE_WHATSAPP } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'Contact',
  description:
    'Get in touch with ChessHub Academy. Reach out via email, phone, WhatsApp, or our contact form. We respond within 24 hours.',
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title: 'Contact ChessHub Academy',
    description: 'Reach out to our team. We respond within 24 hours.',
    url: `${SITE_URL}/contact`,
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: 'Contact ChessHub Academy' }],
  },
};

const CONTACT_INFO = [
  {
    icon: (
      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z M22,6L12,13 2,6" />
    ),
    label: 'Email',
    value: SITE_EMAIL,
    href: `mailto:${SITE_EMAIL}`,
    description: 'We respond within 24 hours',
  },
  {
    icon: (
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.18h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    ),
    label: 'Phone',
    value: SITE_PHONE,
    href: `tel:${SITE_PHONE}`,
    description: 'Mon–Sat, 9 AM – 7 PM IST',
  },
  {
    icon: (
      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
    ),
    label: 'WhatsApp',
    value: 'Message on WhatsApp',
    href: `https://wa.me/${SITE_WHATSAPP}`,
    description: 'Quick replies via WhatsApp',
  },
];

export default function ContactPage() {
  const businessSchema = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'ChessHub Academy',
    url: SITE_URL,
    email: SITE_EMAIL,
    telephone: SITE_PHONE,
    description: 'Premium international online chess learning platform.',
    openingHoursSpecification: {
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      opens: '09:00',
      closes: '19:00',
    },
  };

  const contactFAQs = FAQS.filter((f) =>
    ['faq-5', 'faq-7', 'faq-8', 'faq-10'].includes(f.id)
  );

  return (
    <>
      <JsonLd data={businessSchema} />

      {/* Hero */}
      <section
        className="pt-32 pb-16 bg-gradient-to-br from-primary-dark via-primary to-[#1a45b0] text-white chess-bg relative overflow-hidden"
        aria-label="Contact hero"
      >
        <Container className="relative z-10 text-center">
          <span className="inline-block mb-4 text-sm font-semibold tracking-widest uppercase text-accent">
            Contact Us
          </span>
          <h1 className="font-heading text-5xl lg:text-6xl font-bold text-white mb-5">
            We&apos;re Here to{' '}
            <span className="text-gradient-gold">Help You</span>
          </h1>
          <p className="text-white/70 text-xl max-w-2xl mx-auto">
            Have questions about our programs, pricing, or anything else? Reach out — we respond
            within 24 hours.
          </p>
        </Container>
      </section>

      {/* Main content */}
      <section className="section-py bg-white" aria-label="Contact information and form">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            {/* Left: Contact info + map */}
            <div>
              <h2 className="font-heading text-3xl font-bold text-text-primary mb-8">
                Get In Touch
              </h2>

              <div className="space-y-5 mb-10">
                {CONTACT_INFO.map((item, i) => (
                  <a
                    key={i}
                    href={item.href}
                    target={item.href.startsWith('http') ? '_blank' : undefined}
                    rel={item.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    className="flex items-start gap-5 p-5 rounded-2xl border border-border hover:border-primary hover:bg-surface-light transition-all duration-200 group"
                  >
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary group-hover:text-white transition-colors duration-200">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary group-hover:text-white" aria-hidden="true">
                        {item.icon}
                      </svg>
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1">
                        {item.label}
                      </div>
                      <div className="font-semibold text-text-primary group-hover:text-primary transition-colors">
                        {item.value}
                      </div>
                      <div className="text-text-secondary text-xs mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </a>
                ))}
              </div>

              {/* Map Placeholder */}
              <div
                className="rounded-3xl overflow-hidden border border-border bg-surface-light relative h-64 flex items-center justify-center"
                aria-label="Location: ChessHub Academy — available worldwide online"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-accent/5" />
                <div className="text-center relative z-10 px-8">
                  <div
                    className="w-16 h-16 rounded-full bg-primary/10 border-4 border-primary/20 flex items-center justify-center mx-auto mb-4"
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary" aria-hidden="true">
                      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                      <circle cx="12" cy="10" r="3" />
                    </svg>
                  </div>
                  <p className="font-heading font-bold text-text-primary text-lg mb-1">
                    Available Worldwide
                  </p>
                  <p className="text-text-secondary text-sm">
                    ChessHub Academy is a 100% online platform serving students in 20+ countries.
                  </p>
                </div>
              </div>

              {/* Hours */}
              <div className="mt-8 p-6 rounded-2xl bg-surface-light border border-border">
                <h3 className="font-semibold text-text-primary mb-4">Support Hours</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { days: 'Monday – Friday', hours: '9:00 AM – 7:00 PM IST' },
                    { days: 'Saturday', hours: '10:00 AM – 5:00 PM IST' },
                    { days: 'Sunday', hours: 'Closed (Classes continue)' },
                  ].map(({ days, hours }) => (
                    <div key={days} className="flex justify-between items-center py-1 border-b border-border/50 last:border-0">
                      <span className="text-text-secondary">{days}</span>
                      <span className="font-medium text-text-primary">{hours}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Right: Form */}
            <div>
              <Card padding="lg" className="shadow-card">
                <h2 className="font-heading text-2xl font-bold text-text-primary mb-2">
                  Send Us a Message
                </h2>
                <p className="text-text-secondary text-sm mb-8">
                  Fill in the form and we will get back to you within 24 hours.
                </p>
                <ContactForm />
              </Card>
            </div>
          </div>
        </Container>
      </section>

      {/* Quick FAQ */}
      <section className="py-16 bg-surface-light" aria-label="Quick FAQ">
        <Container>
          <SectionTitle
            eyebrow="Quick Answers"
            title="Common Questions"
          />
          <div className="max-w-3xl mx-auto space-y-3">
            {contactFAQs.map((faq) => (
              <FAQItem key={faq.id} id={faq.id} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
