import Link from 'next/link';
import Image from 'next/image';
import HeroPuzzleWidget from './HeroPuzzleWidget';

export default function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex items-center overflow-hidden bg-slate-950"
      aria-label="Hero section"
    >
      {/* ── Background Battlefield Image ── */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/hero/hero_battlefield.jpg"
          alt="ChessHub Epic Chess Battlefield"
          fill
          priority
          quality={95}
          sizes="100vw"
          className="object-cover object-center scale-105 select-none pointer-events-none"
        />

        {/* Cinematic Vignette & Readability Overlays */}
        {/* 1. Deep directional vignette: darker on the left for text contrast, vibrant and transparent on the right for battlefield artwork */}
        <div
          className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/75 to-slate-950/20"
          aria-hidden="true"
        />

        {/* 2. Top-to-bottom subtle gradient to ensure navigation header visibility & bottom smooth grounding */}
        <div
          className="absolute inset-0 bg-gradient-to-b from-slate-950/85 via-transparent to-slate-950/90"
          aria-hidden="true"
        />

        {/* 3. Subtle cosmic ambient glow highlighting the moon & gold elements */}
        <div
          className="absolute top-1/4 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-cyan-500/15 blur-[120px] pointer-events-none"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full bg-amber-500/10 blur-[100px] pointer-events-none"
          aria-hidden="true"
        />
      </div>

      <div className="relative z-10 mx-auto max-w-[1280px] px-6 lg:px-8 w-full pt-28 lg:pt-32 pb-16 lg:min-h-screen lg:flex lg:items-center">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center w-full">
          {/* Left: Content */}
          <div className="text-white">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400/15 border border-amber-400/30 mb-8 backdrop-blur-md shadow-lg shadow-amber-950/40">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" aria-hidden="true" />
              <span className="text-amber-300 text-sm font-bold tracking-wide">
                FIDE-Rated Grandmaster Coaching
              </span>
            </div>

            {/* Headline */}
            <h1 className="font-heading text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-extrabold leading-[1.08] mb-6 text-white drop-shadow-lg">
              Master Chess.
              <br />
              <span className="text-gradient-gold drop-shadow-md">Master Life.</span>
            </h1>

            {/* Subheadline */}
            <p className="text-lg lg:text-xl text-slate-200 max-w-lg mb-10 leading-relaxed font-normal drop-shadow-sm">
              Join 500+ students from 20+ countries learning from FIDE-rated grandmasters
              and international masters through structured live classes.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-14">
              <Link
                href="/book-demo"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-surface-dark font-black text-lg rounded-xl transition-all duration-200 shadow-gold hover:shadow-none hover:-translate-y-0.5"
              >
                Book Free Demo Class
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
              <Link
                href="/programs"
                className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-slate-900/70 hover:bg-slate-800/90 text-white font-bold text-lg rounded-xl border border-white/20 backdrop-blur-md transition-all duration-200 hover:border-white/40 shadow-lg"
              >
                View Programs
              </Link>
            </div>

            {/* Trust indicators */}
            <div className="flex flex-wrap items-center gap-6 pt-8 border-t border-white/15">
              {[
                { value: '500+', label: 'Students Enrolled' },
                { value: '8', label: 'FIDE Coaches' },
                { value: '20+', label: 'Countries' },
                { value: '5★', label: 'Rated Platform' },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl font-black text-amber-400 font-heading drop-shadow-md">{stat.value}</div>
                  <div className="text-xs text-slate-300 mt-0.5 font-medium">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right: Interactive Playable Puzzle Arena */}
          <div className="relative w-full pt-8 pb-8 sm:pt-10 sm:pb-10 px-2 sm:px-8">
            {/* Interactive Puzzle Widget */}
            <HeroPuzzleWidget />

            {/* Achievement badge — floating */}
            <div className="absolute top-0 right-0 sm:-right-2 animate-float z-10 hidden sm:block pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl p-3.5 shadow-2xl flex items-center gap-3 border border-white/20">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="#D4AF37" />
                  </svg>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Top Rated</div>
                  <div className="font-bold text-white text-xs sm:text-sm">5.0 ★ Academy</div>
                </div>
              </div>
            </div>

            {/* Students count chip */}
            <div className="absolute bottom-0 left-0 sm:-left-2 z-10 hidden sm:block pointer-events-none">
              <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl px-4 py-3 shadow-2xl flex items-center gap-3 border border-white/20">
                <div className="flex -space-x-2">
                  {[
                    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=40&h=40&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=40&h=40&fit=crop&q=80',
                    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=40&h=40&fit=crop&q=80',
                  ].map((src, i) => (
                    <div key={i} className="w-7 h-7 rounded-full border-2 border-slate-700 overflow-hidden">
                      <Image src={src} alt="" width={28} height={28} className="object-cover" />
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-white font-bold text-xs sm:text-sm">500+ Students</div>
                  <div className="text-slate-300 text-[10px]">from 20+ countries</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden lg:flex flex-col items-center gap-1.5 text-white/50 z-10 pointer-events-none">
        <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">Scroll</span>
        <div className="w-px h-8 bg-gradient-to-b from-amber-400/80 via-white/40 to-transparent animate-pulse" />
      </div>
    </section>
  );
}

