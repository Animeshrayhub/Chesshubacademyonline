import Link from 'next/link';
import Image from 'next/image';
import HeroPuzzleWidget from './HeroPuzzleWidget';

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden bg-surface-dark"
      aria-label="Hero section"
    >
      {/* Background gradient */}
      <div
        className="absolute inset-0 bg-gradient-to-br from-primary-dark via-[#0d1f4f] to-surface-dark"
        aria-hidden="true"
      />

      {/* Chess pattern overlay */}
      <div className="absolute inset-0 chess-bg opacity-100" aria-hidden="true" />

      {/* Subtle radial glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-primary/20 blur-3xl pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8 w-full pt-28 lg:pt-32 pb-16 lg:min-h-screen lg:flex lg:items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
          {/* Left: Content */}
          <div className="text-white">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/15 border border-accent/30 mb-8">
              <span className="w-2 h-2 rounded-full bg-accent animate-pulse" aria-hidden="true" />
              <span className="text-accent text-sm font-semibold tracking-wide">
                FIDE-Rated Grandmaster Coaching
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-bold leading-[1.08] mb-6 text-white">
              Master Chess.
              <br />
              <span className="text-gradient-gold">Master Life.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg lg:text-xl text-white/70 max-w-lg mb-10 leading-relaxed">
              Join 500+ students from 20+ countries learning from FIDE-rated grandmasters
              and international masters through structured live classes.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-14">
              <Link
                href="/book-demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-surface-dark font-bold text-lg rounded-xl transition-all duration-200 shadow-gold hover:shadow-none hover:-translate-y-0.5"
              >
                Book Free Demo Class
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/programs"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold text-lg rounded-xl border border-white/20 transition-all duration-200"
              >
                View Programs
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 pt-8 border-t border-white/10">
              {[
                { value: '500+', label: 'Students Enrolled' },
                { value: '8', label: 'FIDE Coaches' },
                { value: '20+', label: 'Countries' },
                { value: '5★', label: 'Rated Platform' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-xl font-bold text-accent font-heading">{stat.value}</div>
                  <div className="text-xs text-white/50 mt-0.5">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Interactive Playable Puzzle Arena */}
          <div className="relative w-full">
            {/* Interactive Puzzle Widget */}
            <HeroPuzzleWidget />

            {/* Achievement badge — floating */}
            <div className="absolute -top-6 -right-2 sm:-right-6 animate-float z-10 hidden sm:block pointer-events-none">
              <div className="bg-white/95 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl flex items-center gap-3 border border-white/40">
                <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center flex-shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#D4AF37" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] text-text-secondary font-medium uppercase tracking-wider">Top Rated</div>
                  <div className="font-bold text-text-primary text-xs sm:text-sm">5.0 ★ Academy</div>
                </div>
              </div>
            </div>

            {/* Students count chip */}
            <div className="absolute -bottom-6 -left-2 sm:-left-6 z-10 hidden sm:block pointer-events-none">
              <div className="bg-primary/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-blue flex items-center gap-3 border border-white/15">
                <div className="flex -space-x-2">
                  {[
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=40&h=40&fit=crop&q=80',
                  ].map((src, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-primary overflow-hidden">
                      <Image src={src} alt="" width={28} height={28} className="object-cover" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-white font-bold text-xs sm:text-sm">500+ Students</div>
                  <div className="text-white/60 text-[10px]">from 20+ countries</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-2 text-white/40">
        <span className="text-xs tracking-widest uppercase">Scroll</span>
        <div className="w-px h-12 bg-gradient-to-b from-white/40 to-transparent" />
      </div>
    </section>
  );
}
