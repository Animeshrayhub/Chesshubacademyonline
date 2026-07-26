import Link from 'next/link';
import Container from '@/components/ui/Container';

export default function BookDemoCTASection() {
  return (
    <section
      className="relative py-20 lg:py-28 bg-primary-dark overflow-hidden"
      aria-label="Book a free demo class"
    >
      {/* Chess pattern overlay */}
      <div className="absolute inset-0 chess-bg" aria-hidden="true" />

      {/* Gradient orbs */}
      <div className="absolute top-0 right-0 w-96 h-96 rounded-full bg-accent/15 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-primary-light/20 blur-3xl pointer-events-none" aria-hidden="true" />

      <Container className="relative z-10 text-center">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/30 mb-8">
          <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true" />
          <span className="text-accent text-sm font-semibold tracking-wide">
            No credit card required
          </span>
        </div>

        <h2 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 max-w-4xl mx-auto leading-tight">
          Ready to Start Your{' '}
          <span className="text-gradient-gold">Chess Journey?</span>
        </h2>

        <p className="text-white/70 text-xl max-w-2xl mx-auto mb-12 leading-relaxed">
          Book a completely free demo class today. Meet your FIDE-rated coach, experience a
          real lesson, and see the ChessHub difference — zero commitment, zero payment.
        </p>

        {/* Features list */}
        <div className="flex flex-wrap justify-center gap-6 mb-12">
          {[
            '100% Free Demo',
            'FIDE-Rated Coaches',
            'Live Zoom Class',
            'No Commitment',
          ].map((item) => (
            <div key={item} className="flex items-center gap-2 text-white/80 text-sm font-medium">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-accent" aria-hidden="true">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <polyline points="22 4 12 14.01 9 11.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {item}
            </div>
          ))}
        </div>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/book-demo"
            className="inline-flex items-center gap-2 px-10 py-5 bg-accent hover:bg-accent-hover text-surface-dark font-bold text-lg rounded-2xl transition-all duration-200 shadow-gold hover:shadow-none hover:-translate-y-0.5"
          >
            Book Your Free Demo
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <Link
            href="/contact"
            className="inline-flex items-center gap-2 px-8 py-5 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg rounded-2xl border border-white/20 transition-all duration-200"
          >
            Have a Question?
          </Link>
        </div>

        {/* Reassurance line */}
        <p className="text-white/40 text-sm mt-8">
          Join 500+ students from 20+ countries. Classes available 7 days a week.
        </p>
      </Container>
    </section>
  );
}
