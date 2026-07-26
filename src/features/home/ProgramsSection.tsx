import Link from 'next/link';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import Badge from '@/components/ui/Badge';
import { PROGRAMS } from '@/constants/PROGRAMS';
import type { Program } from '@/types';

function FeaturedProgramCard({ program }: { program: Program }) {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-primary-dark to-primary text-white chess-bg p-8 lg:p-10 flex flex-col h-full border border-white/10 shadow-blue">
      <div className="flex items-start justify-between mb-6">
        <Badge variant="gold-dark">{program.level}</Badge>
        <span className="text-xs font-semibold bg-accent/20 border border-accent/30 text-accent px-3 py-1 rounded-full">
          Most Popular
        </span>
      </div>
      <h3 className="font-heading text-2xl lg:text-3xl font-bold mb-2 text-white">
        {program.title}
      </h3>
      <p className="text-accent font-medium text-sm mb-4">{program.subtitle}</p>
      <p className="text-white/70 text-sm leading-relaxed mb-8 flex-1">
        {program.description}
      </p>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {[
          { label: 'Age', value: program.ageRange },
          { label: 'Duration', value: program.duration },
          { label: 'Sessions/week', value: `${program.sessionsPerWeek}× per week` },
          { label: 'Session', value: program.sessionDuration },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white/10 rounded-xl px-4 py-3">
            <div className="text-white/50 text-xs mb-0.5">{label}</div>
            <div className="text-white font-semibold text-sm">{value}</div>
          </div>
        ))}
      </div>
      <ul className="space-y-2 mb-8">
        {program.features.slice(0, 5).map((feature) => (
          <li key={feature} className="flex items-center gap-2.5 text-sm text-white/80">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-accent shrink-0" aria-hidden="true">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-auto">
        <Link
          href="/book-demo"
          className="block w-full text-center py-4 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl transition-all duration-200 shadow-gold hover:shadow-none"
        >
          Book Free Demo
        </Link>
      </div>
    </div>
  );
}

function StandardProgramCard({ program }: { program: Program }) {
  const colorMap: Record<string, string> = {
    blue: 'border-primary/30 hover:border-primary',
    gold: 'border-accent/30 hover:border-accent',
  };

  return (
    <div
      className={`card-premium p-7 flex flex-col h-full border-2 transition-all duration-200 ${
        colorMap[program.color] ?? 'border-border hover:border-primary'
      }`}
    >
      <Badge variant={program.level === 'Tournament' ? 'gold' : 'primary'} className="self-start mb-5">
        {program.level}
      </Badge>
      <h3 className="font-heading text-xl font-bold text-text-primary mb-1.5">
        {program.title}
      </h3>
      <p className="text-primary text-sm font-semibold mb-4">{program.subtitle}</p>
      <p className="text-text-secondary text-sm leading-relaxed mb-6 flex-1">
        {program.description}
      </p>
      <div className="flex gap-3 mb-6 flex-wrap">
        <span className="text-xs bg-surface-light text-text-secondary rounded-lg px-3 py-1.5 font-medium">
          {program.ageRange}
        </span>
        <span className="text-xs bg-surface-light text-text-secondary rounded-lg px-3 py-1.5 font-medium">
          {program.sessionsPerWeek}× / week
        </span>
        <span className="text-xs bg-surface-light text-text-secondary rounded-lg px-3 py-1.5 font-medium">
          {program.sessionDuration}
        </span>
      </div>
      <ul className="space-y-2 mb-6">
        {program.features.slice(0, 4).map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-text-secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="text-primary shrink-0" aria-hidden="true">
              <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            {feature}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-4">
          <Link
            href={`/programs#${program.id}`}
            className="text-primary hover:text-primary-dark text-sm font-semibold transition-colors flex items-center gap-1"
          >
            Explore Curriculum
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="shrink-0" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
        <Link
          href="/book-demo"
          className="block w-full text-center py-3 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-colors duration-200"
        >
          Book Free Demo
        </Link>
      </div>
    </div>
  );
}

export default function ProgramsSection() {
  const featured = PROGRAMS.find((p) => p.featured);
  const others = PROGRAMS.filter((p) => !p.featured);

  return (
    <section className="section-py bg-surface-light" aria-label="Programs section">
      <Container>
        <SectionTitle
          eyebrow="Our Programs"
          title="Find Your Perfect"
          titleHighlight="Learning Path"
          subtitle="Structured programs for every level — from first moves to competitive tournaments."
        />

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Featured card — takes up 1 column on mobile, 1 of 4 on desktop */}
          {featured && (
            <div className="lg:col-span-1">
              <FeaturedProgramCard program={featured} />
            </div>
          )}
          {/* 3 standard cards */}
          {others.map((program) => (
            <StandardProgramCard key={program.id} program={program} />
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/programs"
            className="inline-flex items-center gap-2 px-8 py-4 bg-primary hover:bg-primary-dark text-white font-semibold rounded-xl transition-all duration-200 shadow-blue hover:shadow-none"
          >
            View All Programs
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </Container>
    </section>
  );
}
