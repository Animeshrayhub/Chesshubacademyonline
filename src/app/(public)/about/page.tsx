import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import Card from '@/components/ui/Card';
import JsonLd from '@/components/seo/JsonLd';
import BookDemoCTASection from '@/features/home/BookDemoCTASection';
import { getPublicCoachesList } from '@/lib/coaches/public';
import { SITE_URL, SITE_OG_IMAGE, SITE_NAME } from '@/constants/SITE';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Learn about ChessHub Academy — our mission, values, history, and the expert coaching team behind one of the world\'s most trusted online chess learning platforms.',
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title: 'About ChessHub Academy',
    description:
      'Meet the grandmasters and coaches behind ChessHub Academy. Our mission is to make professional chess education accessible worldwide.',
    url: `${SITE_URL}/about`,
    images: [{ url: SITE_OG_IMAGE, width: 1200, height: 630, alt: 'About ChessHub Academy' }],
  },
};

const VALUES = [
  { icon: '🏆', title: 'Excellence', description: 'We set the highest standards in coaching quality and student achievement.' },
  { icon: '🎯', title: 'Discipline', description: 'Consistent practice and structured learning are the foundation of improvement.' },
  { icon: '🤝', title: 'Integrity', description: 'Honest communication with students, parents, and coaches at all times.' },
  { icon: '📚', title: 'Continuous Learning', description: 'Our coaches continue to develop their craft and stay current with chess theory.' },
  { icon: '🌍', title: 'Accessibility', description: 'World-class chess coaching should be available to students everywhere.' },
  { icon: '💡', title: 'Innovation', description: 'Leveraging modern technology to deliver the best possible learning experience.' },
  { icon: '🤲', title: 'Community', description: 'Building a global chess family that supports and inspires each other.' },
  { icon: '✨', title: 'Transparency', description: 'Clear communication about progress, pricing, and expectations.' },
  { icon: '📈', title: 'Consistency', description: 'Reliable, structured teaching that students and parents can depend on.' },
  { icon: '🌱', title: 'Professionalism', description: 'Every interaction reflects our commitment to professional standards.' },
];

export default async function AboutPage() {
  const coaches = await getPublicCoachesList();

  const orgSchema = {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: SITE_NAME,
    url: SITE_URL,
    description: 'Premium international online chess learning platform.',
    foundingDate: '2022',
    numberOfEmployees: { '@type': 'QuantitativeValue', value: 8 },
  };

  return (
    <>
      <JsonLd data={orgSchema} />

      {/* Hero */}
      <section
        className="relative pt-32 pb-20 lg:pb-28 bg-gradient-to-br from-primary-dark via-primary to-[#1a45b0] text-white overflow-hidden"
        aria-label="About hero"
      >
        <div className="absolute inset-0 chess-bg" aria-hidden="true" />
        <Container className="relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="inline-block mb-4 text-sm font-semibold tracking-widest uppercase text-accent">
                Our Story
              </span>
              <h1 className="font-heading text-5xl lg:text-6xl font-bold text-white mb-6 leading-tight">
                Building The World&apos;s Best{' '}
                <span className="text-gradient-gold">Chess Academy</span>
              </h1>
              <p className="text-white/70 text-xl leading-relaxed mb-8 max-w-lg">
                ChessHub Academy was founded with a single conviction: that every child
                deserves access to world-class chess coaching, regardless of geography.
              </p>
              <Link
                href="/book-demo"
                className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl transition-all duration-200 shadow-gold"
              >
                Book Free Demo
              </Link>
            </div>
            <div className="relative rounded-3xl overflow-hidden shadow-2xl border border-white/10">
              <Image
                src="https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=700&h=500&fit=crop&q=85"
                alt="ChessHub Academy coaching team"
                width={700}
                height={500}
                className="w-full h-80 lg:h-[420px] object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
          </div>
        </Container>
      </section>

      {/* Mission & Vision */}
      <section className="section-py bg-white" aria-label="Mission and vision">
        <Container>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <span className="text-sm font-semibold tracking-widest uppercase text-accent block mb-4">
                Our Mission
              </span>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold text-text-primary mb-6">
                Making Professional Chess Education Accessible
              </h2>
              <p className="text-text-secondary leading-relaxed text-lg mb-6">
                To make professional chess education accessible to students worldwide through
                high-quality coaching, structured learning paths, modern technology, and an
                exceptional learning experience.
              </p>
              <p className="text-text-secondary leading-relaxed">
                The platform provides a premium experience for students, parents, coaches, and
                administrators while remaining simple to use and highly scalable.
              </p>
            </div>
            <div>
              <span className="text-sm font-semibold tracking-widest uppercase text-accent block mb-4">
                Our Vision
              </span>
              <h2 className="font-heading text-3xl lg:text-4xl font-bold text-text-primary mb-6">
                One of the World&apos;s Most Trusted Chess Platforms
              </h2>
              <p className="text-text-secondary leading-relaxed text-lg mb-6">
                ChessHub Academy aims to become one of the world&apos;s most trusted online chess
                learning platforms by providing structured, engaging, and technology-driven chess
                education for students of all ages.
              </p>
              <p className="text-text-secondary leading-relaxed">
                Every feature helps students improve their chess skills while developing critical
                thinking, concentration, confidence, discipline, and problem-solving abilities.
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Stats */}
      <section className="py-16 bg-primary-dark text-white chess-bg" aria-label="Academy numbers">
        <Container>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
            {[
              { value: '2022', label: 'Year Founded' },
              { value: '500+', label: 'Students Taught' },
              { value: '20+', label: 'Countries Served' },
              { value: '8', label: 'FIDE Coaches' },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="font-heading text-4xl lg:text-5xl font-bold text-accent mb-2">
                  {stat.value}
                </div>
                <div className="text-white/60 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Values */}
      <section className="section-py bg-surface-light" aria-label="Core values">
        <Container>
          <SectionTitle
            eyebrow="What We Stand For"
            title="Our Core"
            titleHighlight="Values"
            subtitle="The principles that guide every decision we make at ChessHub Academy."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {VALUES.map((value, i) => (
              <Card key={i} padding="md" className="text-center">
                <div className="text-3xl mb-3" aria-hidden="true">{value.icon}</div>
                <h3 className="font-heading font-bold text-text-primary mb-2 text-sm">{value.title}</h3>
                <p className="text-text-secondary text-xs leading-relaxed">{value.description}</p>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Team */}
      <section id="team" className="section-py bg-white" aria-label="Coaching team">
        <Container>
          <SectionTitle
            eyebrow="The Team"
            title="Expert Coaches,"
            titleHighlight="Real Results"
            subtitle="Every ChessHub coach is FIDE-rated, experienced, and dedicated to student success."
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

            {coaches.map((coach) => (
              <article key={coach.id} className="card-premium overflow-hidden group">
                <div className="relative h-72 overflow-hidden">
                  <Image
                    src={coach.imageUrl}
                    alt={`${coach.name}, ${coach.title}`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  />
                  <div className="absolute top-4 right-4 bg-surface-dark/80 backdrop-blur-sm rounded-xl px-3 py-2 text-center">
                    <div className="text-accent font-bold text-xs">
                      {coach.fideRating ? coach.fideRating : coach.fideId ? `ID: ${coach.fideId}` : 'Certified'}
                    </div>
                    <div className="text-white/60 text-[10px]">FIDE</div>
                  </div>

                </div>
                <div className="p-6">
                  <h3 className="font-heading font-bold text-xl text-text-primary mb-1">{coach.name}</h3>
                  <p className="text-primary text-sm font-semibold mb-1">{coach.title}</p>
                  <p className="text-text-secondary text-xs mb-4">
                    {coach.flag} {coach.country} · {coach.specialization}
                  </p>
                  <p className="text-text-secondary text-sm leading-relaxed mb-4 line-clamp-3">{coach.bio}</p>
                  <ul className="space-y-1.5">
                    {coach.achievements.slice(0, 2).map((a) => (
                      <li key={a} className="flex items-center gap-2 text-xs text-text-secondary">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent shrink-0" aria-hidden="true" />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            ))}
          </div>
        </Container>
      </section>

      <BookDemoCTASection />
    </>
  );
}
