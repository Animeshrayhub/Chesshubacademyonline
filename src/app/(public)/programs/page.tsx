import type { Metadata } from 'next';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import Badge from '@/components/ui/Badge';
import JsonLd from '@/components/seo/JsonLd';
import BookDemoCTASection from '@/features/home/BookDemoCTASection';
import FAQItem from '@/features/faq/FAQItem';
import { PROGRAMS } from '@/constants/PROGRAMS';
import { SITE_URL, SITE_OG_IMAGE } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'Programs',
  description:
    'Explore ChessHub Academy\'s structured chess programs for all levels — Beginner, Intermediate, Advanced, and Tournament Preparation. Find the right program for your child.',
  alternates: { canonical: `${SITE_URL}/programs` },
  openGraph: {
    title: 'Chess Programs | ChessHub Academy',
    description: 'Structured chess programs for every level. Learn from FIDE-rated grandmasters.',
    url: `${SITE_URL}/programs`,
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: 'ChessHub Academy Programs' }],
  },
};

const PROGRAM_FAQS = [
  {
    id: 'pf-1',
    question: 'How do I know which program is right for my child?',
    answer:
      'During the free demo class, our coaches will assess your child\'s current level and recommend the most suitable program. You are never locked in — students can move between programs as they progress.',
  },
  {
    id: 'pf-2',
    question: 'Can students move to a higher program?',
    answer:
      'Absolutely. We regularly review student progress and recommend program upgrades when students are ready. There is no additional enrollment fee for moving between programs.',
  },
  {
    id: 'pf-3',
    question: 'Do the programs include tournaments?',
    answer:
      'The Intermediate, Advanced, and Tournament Preparation programs all include access to internal and external tournaments. Our coaches actively support students in participating in FIDE-rated events.',
  },
];

export default function ProgramsPage() {
  const courseSchemas = PROGRAMS.map((p) => ({
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: p.title,
    description: p.description,
    provider: {
      '@type': 'EducationalOrganization',
      name: 'ChessHub Academy',
      url: SITE_URL,
    },
    courseLevel: p.level,
    typicalAgeRange: p.ageRange,
  }));

  return (
    <>
      {courseSchemas.map((schema, i) => (
        <JsonLd key={i} data={schema} />
      ))}

      {/* Hero */}
      <section className="relative pt-32 pb-20 bg-gradient-to-br from-primary-dark via-primary to-[#1a45b0] text-white overflow-hidden" aria-label="Programs hero">
        <div className="absolute inset-0 chess-bg" aria-hidden="true" />
        <Container className="relative z-10 text-center">
          <span className="inline-block mb-4 text-sm font-semibold tracking-widest uppercase text-accent">
            Our Programs
          </span>
          <h1 className="font-heading text-5xl lg:text-6xl font-bold text-white mb-6 max-w-3xl mx-auto leading-tight">
            Find Your Perfect <span className="text-gradient-gold">Learning Path</span>
          </h1>
          <p className="text-white/70 text-xl max-w-2xl mx-auto mb-10">
            Every program is designed by grandmasters for a specific skill level, age group, and goal.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {PROGRAMS.map((p) => (
              <a
                key={p.id}
                href={`#${p.id}`}
                className="px-5 py-2.5 rounded-full border border-white/30 text-white/80 hover:border-accent hover:text-accent text-sm font-medium transition-all duration-200"
              >
                {p.level}
              </a>
            ))}
          </div>
        </Container>
      </section>

      {/* Programs Detail */}
      <section className="py-20 bg-surface-light" aria-label="Program details">
        <Container className="space-y-20">
          {PROGRAMS.map((program, i) => (
            <div
              key={program.id}
              id={program.id}
              className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-start ${
                i % 2 !== 0 ? 'lg:grid-flow-col-dense' : ''
              }`}
            >
              {/* Info */}
              <div className={i % 2 !== 0 ? 'lg:order-2' : ''}>
                <Badge variant={program.featured ? 'gold' : 'primary'} className="mb-5">
                  {program.level}
                  {program.featured && ' · Most Popular'}
                </Badge>
                <h2 className="font-heading text-3xl lg:text-4xl font-bold text-text-primary mb-2">
                  {program.title}
                </h2>
                <p className="text-primary font-semibold text-lg mb-5">{program.subtitle}</p>
                <p className="text-text-secondary leading-relaxed mb-8">{program.description}</p>

                {/* Meta grid */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  {[
                    { label: 'Age Range', value: program.ageRange },
                    { label: 'Duration', value: program.duration },
                    { label: 'Sessions/Week', value: `${program.sessionsPerWeek} sessions` },
                    { label: 'Per Session', value: program.sessionDuration },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-2xl border border-border p-5">
                      <div className="text-xs text-text-secondary mb-1">{label}</div>
                      <div className="font-bold text-text-primary">{value}</div>
                    </div>
                  ))}
                </div>

                <Link
                  href="/book-demo"
                  className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl transition-all duration-200 shadow-gold"
                >
                  Book Free Demo — {program.level}
                </Link>
              </div>

              {/* Features */}
              <div className={`${i % 2 !== 0 ? 'lg:order-1' : ''} bg-white rounded-3xl border border-border p-8 shadow-card`}>
                <h3 className="font-heading font-bold text-xl text-text-primary mb-6">
                  What&apos;s Included
                </h3>
                <ul className="space-y-4">
                  {program.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="text-primary" aria-hidden="true">
                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                      <span className="text-text-secondary text-sm leading-relaxed">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </Container>
      </section>

      {/* Comparison Table */}
      <section className="py-20 bg-white" aria-label="Program comparison">
        <Container>
          <SectionTitle
            eyebrow="Compare"
            title="Side-by-Side"
            titleHighlight="Comparison"
            subtitle="All programs include live Zoom classes, FIDE-rated coaches, and progress tracking."
          />
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-4 pr-6 font-semibold text-text-primary w-48">Feature</th>
                  {PROGRAMS.map((p) => (
                    <th
                      key={p.id}
                      className={`py-4 px-4 font-semibold text-center ${
                        p.featured ? 'text-primary-dark font-extrabold' : 'text-text-primary'
                      }`}
                    >
                      {p.level}
                      {p.featured && (
                        <span className="block text-xs font-normal text-text-secondary mt-0.5">
                          Most Popular
                        </span>
                      )}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { label: 'Age Range', key: 'ageRange' as const },
                  { label: 'Duration', key: 'duration' as const },
                  { label: 'Sessions/Week', key: 'sessionsPerWeek' as const },
                  { label: 'Session Length', key: 'sessionDuration' as const },
                ].map((row, ri) => (
                  <tr key={row.label} className={ri % 2 === 0 ? 'bg-surface-light/50' : 'bg-white'}>
                    <td className="py-4 pr-6 font-medium text-text-primary">{row.label}</td>
                    {PROGRAMS.map((p) => (
                      <td
                        key={p.id}
                        className={`py-4 px-4 text-center text-text-secondary ${
                          p.featured ? 'font-semibold text-primary' : ''
                        }`}
                      >
                        {String(p[row.key])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Container>
      </section>

      {/* Programs FAQ */}
      <section className="py-20 bg-surface-light" aria-label="Program FAQs">
        <Container>
          <SectionTitle eyebrow="Questions" title="About Our Programs" />
          <div className="max-w-3xl mx-auto space-y-3">
            {PROGRAM_FAQS.map((faq) => (
              <FAQItem key={faq.id} id={faq.id} question={faq.question} answer={faq.answer} />
            ))}
          </div>
        </Container>
      </section>

      <BookDemoCTASection />
    </>
  );
}
