import type { Metadata } from 'next';
import Container from '@/components/ui/Container';
import { SITE_URL, SITE_EMAIL, SITE_NAME } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: `${SITE_NAME}'s Terms and Conditions — the agreement governing your use of our platform and services.`,
  alternates: { canonical: `${SITE_URL}/terms-and-conditions` },
  robots: { index: true, follow: true },
};

const SECTIONS = [
  {
    id: 'acceptance',
    title: '1. Acceptance of Terms',
    content: `By accessing ChessHub Academy's website or enrolling in any of our programs, you agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our services.

These terms apply to all users including parents, guardians, and students. Parents and guardians are responsible for ensuring their children comply with these terms.`,
  },
  {
    id: 'services',
    title: '2. Services Provided',
    content: `ChessHub Academy provides:

• Live online chess coaching classes via Zoom
• Structured chess learning programs for various skill levels
• Homework assignments and progress tracking
• Educational content and resources
• Free demo classes for prospective students

All classes are conducted online. ChessHub Academy does not provide in-person coaching services.`,
  },
  {
    id: 'enrollment',
    title: '3. Enrollment and Demo Class',
    content: `Free demo classes are offered on a first-come, first-served basis. Enrollment in paid programs is subject to availability.

Upon enrollment, you will receive program details, class schedules, and Zoom access information via email. Class schedules may be subject to change with reasonable advance notice.`,
  },
  {
    id: 'payments',
    title: '4. Payments and Cancellations',
    content: `Program fees are payable monthly or quarterly, as selected during enrollment. Fees are non-refundable once a payment period has begun, except in cases of extraordinary circumstances at our sole discretion.

You may cancel your enrollment at any time with 30 days written notice. No refunds will be issued for the current payment period upon cancellation.

ChessHub Academy reserves the right to modify program fees with 30 days advance notice to enrolled students.`,
  },
  {
    id: 'conduct',
    title: '5. Student and Parent Conduct',
    content: `All students and parents are expected to:

• Treat coaches and fellow students with respect and professionalism
• Attend classes punctually and prepared
• Complete assigned homework in good faith
• Not record, share, or reproduce class content without express written permission
• Maintain appropriate conduct during online sessions

ChessHub Academy reserves the right to terminate enrollment without refund for serious misconduct.`,
  },
  {
    id: 'intellectual-property',
    title: '6. Intellectual Property',
    content: `All content on the ChessHub Academy website and in our classes — including lesson materials, videos, curricula, and training materials — is the intellectual property of ChessHub Academy and its coaches.

You may not reproduce, distribute, or commercially exploit any content without express written permission from ChessHub Academy.`,
  },
  {
    id: 'privacy',
    title: '7. Privacy',
    content: `Your use of ChessHub Academy's services is also governed by our Privacy Policy, which is incorporated into these Terms by reference. By using our services, you consent to our collection and use of personal information as described in the Privacy Policy.`,
  },
  {
    id: 'liability',
    title: '8. Limitation of Liability',
    content: `ChessHub Academy provides services "as is" and makes no warranties, express or implied, regarding results, outcomes, or rating improvements.

To the maximum extent permitted by law, ChessHub Academy shall not be liable for any indirect, incidental, or consequential damages arising from your use of our services.`,
  },
  {
    id: 'changes',
    title: '9. Changes to Terms',
    content: `ChessHub Academy reserves the right to modify these Terms and Conditions at any time. Material changes will be communicated via email with at least 14 days notice. Continued use of our services after notification constitutes acceptance of the revised terms.`,
  },
  {
    id: 'governing-law',
    title: '10. Governing Law',
    content: `These Terms and Conditions are governed by applicable international law. Any disputes shall be resolved through good-faith negotiation. If resolution cannot be reached, disputes shall be submitted to binding arbitration.`,
  },
  {
    id: 'contact',
    title: '11. Contact Information',
    content: `For questions about these Terms and Conditions, please contact us:\n\nEmail: ${SITE_EMAIL}\nWebsite: ${SITE_URL}/contact`,
  },
];

export default function TermsPage() {
  return (
    <>
      {/* Header */}
      <section className="pt-32 pb-12 bg-surface-dark text-white" aria-label="Terms header">
        <Container>
          <h1 className="font-heading text-4xl lg:text-5xl font-bold text-white mb-4">
            Terms &amp; Conditions
          </h1>
          <p className="text-white/60 text-lg">Last updated: July 1, 2026</p>
          <p className="text-white/50 text-sm mt-4 max-w-2xl">
            Please read these Terms and Conditions carefully before using {SITE_NAME}&apos;s
            website or enrolling in any program.
          </p>
        </Container>
      </section>

      {/* Content */}
      <section className="py-16 bg-white" aria-label="Terms content">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-12 max-w-5xl mx-auto">
            {/* TOC */}
            <nav className="hidden lg:block" aria-label="Terms table of contents">
              <div className="sticky top-28">
                <p className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-4">
                  Contents
                </p>
                <ul className="space-y-2">
                  {SECTIONS.map((s) => (
                    <li key={s.id}>
                      <a
                        href={`#${s.id}`}
                        className="text-sm text-text-secondary hover:text-primary transition-colors block py-1"
                      >
                        {s.title}
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
