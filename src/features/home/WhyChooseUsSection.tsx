import Image from 'next/image';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';

const REASONS = [
  {
    icon: '🏆',
    title: 'FIDE-Rated Grandmasters',
    description:
      'Learn from internationally certified coaches — grandmasters and international masters with proven track records.',
  },
  {
    icon: '🎯',
    title: 'Structured Curriculum',
    description:
      'Every lesson follows a carefully designed curriculum that builds on previous knowledge systematically.',
  },
  {
    icon: '👥',
    title: 'Small Group Classes',
    description:
      'Maximum 6 students per group ensures every child receives meaningful attention and feedback.',
  },
  {
    icon: '📊',
    title: 'Progress Tracking',
    description:
      'Detailed monthly progress reports keep parents informed about their child\'s development and achievements.',
  },
  {
    icon: '🌍',
    title: 'International Community',
    description:
      'Students from 20+ countries create a diverse, enriching learning environment and global friendships.',
  },
  {
    icon: '🆓',
    title: 'Free Demo Class',
    description:
      'Experience a complete class with no commitment or payment required. Meet your coach before enrolling.',
  },
];

export default function WhyChooseUsSection() {
  return (
    <section className="section-py bg-white" aria-label="Why choose us">
      <Container>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Image */}
          <div className="relative order-2 lg:order-1">
            <div className="relative rounded-3xl overflow-hidden shadow-2xl">
              <Image
                src="https://images.unsplash.com/photo-1560174038-da43ac74f01b?w=700&h=600&fit=crop&q=85"
                alt="Two chess players studying a chess position on a wooden board"
                width={700}
                height={600}
                className="w-full h-[480px] lg:h-[560px] object-cover"
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-6 -right-6 w-48 h-48 rounded-3xl bg-accent/10 border border-accent/20 -z-10" aria-hidden="true" />
            <div className="absolute -top-6 -left-6 w-32 h-32 rounded-2xl bg-primary/8 border border-primary/15 -z-10" aria-hidden="true" />

            {/* Floating stat */}
            <div className="absolute bottom-8 left-8 bg-white rounded-2xl shadow-xl p-4 flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-primary" aria-hidden="true">
                  <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="currentColor" />
                </svg>
              </div>
              <div>
                <div className="font-heading font-bold text-2xl text-text-primary">98%</div>
                <div className="text-text-secondary text-sm">Student Satisfaction</div>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="order-1 lg:order-2">
            <SectionTitle
              eyebrow="Why ChessHub"
              title="The Difference That"
              titleHighlight="Defines Us"
              subtitle="We don't just teach chess. We develop critical thinkers, disciplined learners, and confident competitors."
              align="left"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {REASONS.map((reason, i) => (
                <div
                  key={i}
                  className="flex gap-4 p-5 rounded-2xl bg-surface-light border border-border hover:border-primary/30 hover:bg-primary/3 transition-all duration-200"
                >
                  <span className="text-2xl flex-shrink-0 mt-0.5" aria-hidden="true">
                    {reason.icon}
                  </span>
                  <div>
                    <h3 className="font-semibold text-text-primary text-sm mb-1.5">
                      {reason.title}
                    </h3>
                    <p className="text-text-secondary text-xs leading-relaxed">
                      {reason.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
