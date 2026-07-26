import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import { SITE_URL, SITE_EMAIL, SITE_NAME } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: `${SITE_NAME}'s Privacy Policy — learn how we collect, use, and protect your personal information.`,
  alternates: { canonical: `${SITE_URL}/privacy-policy` },
  robots: { index: true, follow: true },
};

const SECTIONS = [
  {
    id: 'information-collected',
    title: '1. Information We Collect',
    content: `We collect information you provide when booking a demo class, contacting us, or enrolling in a program. This includes:

• Personal identification information (name, email address, phone number)
• Child information (name, age, chess experience level)
• Communication preferences and scheduling information
• Payment information (processed securely by third-party payment providers)
• Usage data and analytics information collected automatically

We do not sell, trade, or rent your personal information to third parties.`,
  },
  {
    id: 'use-of-information',
    title: '2. How We Use Your Information',
    content: `We use the information we collect to:

• Schedule and conduct demo and regular classes
• Communicate with you about your enrollment and classes
• Send progress reports and educational content
• Process payments and manage your account
• Improve our platform and services
• Comply with legal obligations
• Send occasional newsletters (with your consent, and you may unsubscribe at any time)`,
  },
  {
    id: 'data-protection',
    title: '3. Data Protection',
    content: `We take data security seriously. Your personal information is protected through:

• Secure HTTPS encryption for all data transmission
• Restricted access to personal data by authorized staff only
• Regular security reviews and updates
• Secure third-party payment processing (we do not store card details)

However, no internet transmission is completely secure. We strive to protect your information but cannot guarantee absolute security.`,
  },
  {
    id: 'cookies',
    title: '4. Cookies and Analytics',
    content: `Our website uses cookies and similar technologies to:

• Remember your preferences
• Understand how visitors use our website (via analytics)
• Improve the user experience

You may disable cookies in your browser settings, though some features may not function correctly. We use anonymized analytics data and do not share individual user data with analytics providers.`,
  },
  {
    id: 'children-privacy',
    title: '5. Children\'s Privacy',
    content: `ChessHub Academy serves children as students, but all account information is collected from parents or guardians. We do not knowingly collect personal information directly from children under 13 without verifiable parental consent.

Parents may request to review, modify, or delete their child's information at any time by contacting us.`,
  },
  {
    id: 'data-sharing',
    title: '6. Information Sharing',
    content: `We do not sell or rent personal information. We may share your information only:

• With coaches assigned to your child's classes (limited to what is necessary)
• With secure payment processors to handle transactions
• With service providers who help us operate our platform (subject to confidentiality agreements)
• When required by law or to protect our legal rights`,
  },
  {
    id: 'your-rights',
    title: '7. Your Rights',
    content: `You have the right to:

• Access the personal information we hold about you
• Correct inaccurate or incomplete information
• Request deletion of your personal information
• Withdraw consent for marketing communications at any time
• Lodge a complaint with your local data protection authority

To exercise any of these rights, please contact us at the email address below.`,
  },
  {
    id: 'retention',
    title: '8. Data Retention',
    content: `We retain personal information for as long as necessary to provide our services and comply with legal obligations. When you terminate your enrollment, we will delete or anonymize your personal data within 90 days, unless we are required by law to retain it longer.`,
  },
  {
    id: 'changes',
    title: '9. Changes to This Policy',
    content: `We may update this Privacy Policy periodically. We will notify you of significant changes by email or by posting a prominent notice on our website. The effective date at the top of this page will be updated accordingly.`,
  },
  {
    id: 'contact',
    title: '10. Contact Us',
    content: `If you have questions about this Privacy Policy or how we handle your personal information, please contact us at:\n\nEmail: ${SITE_EMAIL}\nWebsite: ${SITE_URL}/contact`,
  },
];

export default function PrivacyPolicyPage() {
  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-12 bg-surface-dark text-white" aria-label="Privacy policy header">
        <Container>
          <h1 className="font-heading text-4xl lg:text-5xl font-bold text-white mb-4">
            Privacy Policy
          </h1>
          <p className="text-white/60 text-lg">
            Last updated: July 1, 2026
          </p>
          <p className="text-white/50 text-sm mt-4 max-w-2xl">
            {SITE_NAME} is committed to protecting your privacy. This policy explains what
            information we collect, how we use it, and your rights regarding your data.
          </p>
        </Container>
      </section>

      {/* Content */}
      <section className="py-16 bg-white" aria-label="Privacy policy content">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12 max-w-5xl mx-auto">
            {/* Table of contents */}
            <nav
              className="hidden lg:block"
              aria-label="Privacy policy table of contents"
            >
              <div className="sticky top-28">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
                  Contents
                </p>
                <ul className="space-y-2">
                  {SECTIONS.map((section) => (
                    <li key={section.id}>
                      <a
                        href={`#${section.id}`}
                        className="text-sm text-text-secondary hover:text-primary transition-colors block py-1"
                      >
                        {section.title}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* Document */}
            <article className="prose-chess">
              {SECTIONS.map((section) => (
                <div key={section.id} id={section.id} className="mb-10">
                  <h2 className="font-heading text-xl font-bold text-text-primary mb-4 pb-3 border-b border-border">
                    {section.title}
                  </h2>
                  <div className="text-text-secondary text-sm leading-relaxed whitespace-pre-line">
                    {section.content}
                  </div>
                </div>
              ))}
            </article>
          </div>
        </Container>
      </section>
    </>
  );
}
