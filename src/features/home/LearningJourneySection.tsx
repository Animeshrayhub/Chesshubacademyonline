import Link from 'next/link';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';

const STEPS = [
  {
    step: 1,
    icon: '📅',
    title: 'Book Free Demo',
    description:
      'Schedule a no-commitment free demo class to meet your coach, experience a real lesson, and see if ChessHub is the right fit.',
    color: 'bg-primary/10 border-primary/20',
    dotColor: 'bg-primary',
  },
  {
    step: 2,
    icon: '📋',
    title: 'Get Enrolled',
    description:
      'After the demo, choose your program. Our team will create a personalized learning plan tailored to your child\'s goals and current level.',
    color: 'bg-accent/10 border-accent/20',
    dotColor: 'bg-accent',
  },
  {
    step: 3,
    icon: '🖥️',
    title: 'Attend Live Classes',
    description:
      'Join live Zoom sessions with your FIDE-rated coach. Engage with an interactive chess board, fellow students, and structured lessons.',
    color: 'bg-primary/10 border-primary/20',
    dotColor: 'bg-primary',
  },
  {
    step: 4,
    icon: '📝',
    title: 'Complete Homework',
    description:
      'Reinforce learning with Lichess studies, daily puzzles, and coach-assigned exercises. Homework builds consistency and muscle memory.',
    color: 'bg-accent/10 border-accent/20',
    dotColor: 'bg-accent',
  },
  {
    step: 5,
    icon: '📈',
    title: 'Track & Compete',
    description:
      'Monitor progress through monthly reports, compete in rated tournaments, and advance through program levels as your skills grow.',
    color: 'bg-primary/10 border-primary/20',
    dotColor: 'bg-primary',
  },
];

export default function LearningJourneySection() {
  return (
    <section
      className="section-py bg-surface-light relative overflow-hidden"
      aria-label="Learning journey"
    >
      {/* Subtle background decoration */}
      <div className="absolute right-0 top-0 w-1/2 h-full bg-gradient-to-l from-primary/3 to-transparent pointer-events-none" aria-hidden="true" />

      <Container>
        <SectionTitle
          eyebrow="Your Journey"
          title="From First Move to"
          titleHighlight="Tournament Ready"
          subtitle="A clear, structured path from enrollment to competitive excellence."
        />

        {/* Desktop: horizontal timeline */}
        <div className="hidden lg:block">
          {/* Connector line */}
          <div className="relative">
            <div
              className="absolute top-[52px] left-[10%] right-[10%] h-0.5 bg-gradient-to-r from-primary/30 via-accent/50 to-primary/30"
              aria-hidden="true"
            />
          </div>

          <div className="grid grid-cols-5 gap-4">
            {STEPS.map((step, i) => (
              <div key={i} className="flex flex-col items-center text-center gap-5">
                {/* Step number circle */}
                <div className="relative z-10">
                  <div
                    className={`w-[104px] h-[104px] rounded-2xl ${step.color} border-2 flex flex-col items-center justify-center gap-1 shadow-sm`}
                  >
                    <span className="text-3xl" aria-hidden="true">{step.icon}</span>
                    <span className="text-xs font-bold text-text-secondary">Step {step.step}</span>
                  </div>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-text-primary text-base mb-2">
                    {step.title}
                  </h3>
                  <p className="text-text-secondary text-xs leading-relaxed">
                    {step.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mobile: vertical timeline */}
        <div className="lg:hidden space-y-6">
          {STEPS.map((step, i) => (
            <div key={i} className="flex gap-5 items-start">
              <div className="flex flex-col items-center shrink-0">
                <div
                  className={`w-12 h-12 rounded-xl ${step.color} border-2 flex items-center justify-center text-xl`}
                  aria-hidden="true"
                >
                  {step.icon}
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`w-0.5 h-8 mt-2 ${step.dotColor} opacity-30`} aria-hidden="true" />
                )}
              </div>
              <div className="pt-2">
                <div className="text-xs font-semibold text-text-secondary mb-1">
                  Step {step.step}
                </div>
                <h3 className="font-heading font-bold text-text-primary text-base mb-1.5">
                  {step.title}
                </h3>
                <p className="text-text-secondary text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-16">
          <Link
            href="/book-demo"
            className="inline-flex items-center gap-2 px-8 py-4 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl transition-all duration-200 shadow-gold hover:shadow-none"
          >
            Start Your Journey Today
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>
      </Container>
    </section>
  );
}
