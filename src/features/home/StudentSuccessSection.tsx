import Image from 'next/image';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';

const SUCCESS_STORIES = [
  {
    studentName: 'Rahul P.',
    age: 14,
    country: 'India 🇮🇳',
    imageUrl:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&h=600&fit=crop&q=85',
    story:
      'Rahul joined ChessHub Academy with a FIDE rating of 1100. With GM Arjun\'s structured opening training and IM Priya\'s tactical sessions, he improved systematically over 12 months. Today, Rahul holds a FIDE rating of 1650 and is the Maharashtra State Under-15 Champion.',
    achievement: 'Maharashtra State Under-15 Champion',
    ratingImprovement: '1100 → 1650',
    duration: '12 months',
    icon: '🏆',
  },
  {
    studentName: 'Zara M.',
    age: 9,
    country: 'United Kingdom 🇬🇧',
    imageUrl:
      'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?w=500&h=600&fit=crop&q=85',
    story:
      'Zara began her chess journey at age 8 with no prior experience. FM David Chen\'s beginner program gave her confidence, a love for the game, and solid foundations. After 18 months, Zara achieved her first official FIDE rating of 1250 and won her school\'s regional championship.',
    achievement: 'First FIDE Rating: 1250',
    ratingImprovement: 'Unrated → 1250',
    duration: '18 months',
    icon: '⭐',
  },
];

export default function StudentSuccessSection() {
  return (
    <section
      className="section-py bg-gradient-to-br from-surface-dark via-[#0d1f4f] to-surface-dark relative overflow-hidden"
      aria-label="Student success stories"
    >
      <div className="absolute inset-0 chess-bg opacity-50" aria-hidden="true" />

      <Container className="relative z-10">
        <SectionTitle
          eyebrow="Success Stories"
          title="Real Students."
          titleHighlight="Real Results."
          subtitle="Every student's success is a reflection of our coaching quality and their dedication."
          light
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {SUCCESS_STORIES.map((story, i) => (
            <article
              key={i}
              className="group bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm hover:bg-white/8 transition-colors duration-300"
            >
              <div className={`grid grid-cols-1 md:grid-cols-2 ${i % 2 === 0 ? '' : 'md:grid-flow-col-dense'}`}>
                {/* Image */}
                <div className={`relative h-72 md:h-auto min-h-[280px] overflow-hidden ${i % 2 !== 0 ? 'md:order-2' : ''}`}>
                  <Image
                    src={story.imageUrl}
                    alt={`${story.studentName} — ChessHub Academy student success story`}
                    fill
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                    sizes="(max-width: 768px) 100vw, 50vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/50 via-transparent to-transparent" />

                  {/* Achievement badge */}
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-2xl px-4 py-3 text-center">
                      <div className="text-2xl mb-1" aria-hidden="true">{story.icon}</div>
                      <div className="text-white font-bold text-sm">{story.achievement}</div>
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className={`p-8 flex flex-col justify-center ${i % 2 !== 0 ? 'md:order-1' : ''}`}>
                  <div className="flex items-center gap-3 mb-4">
                    <div>
                      <div className="font-heading font-bold text-xl text-white">
                        {story.studentName}
                      </div>
                      <div className="text-white/50 text-sm">
                        Age {story.age} · {story.country}
                      </div>
                    </div>
                  </div>

                  <p className="text-white/70 text-sm leading-relaxed mb-6">{story.story}</p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between py-2 border-t border-white/10">
                      <span className="text-white/50 text-xs">Rating Improvement</span>
                      <span className="text-accent font-bold text-sm">{story.ratingImprovement}</span>
                    </div>
                    <div className="flex items-center justify-between py-2 border-t border-white/10">
                      <span className="text-white/50 text-xs">Training Duration</span>
                      <span className="text-white font-semibold text-sm">{story.duration}</span>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
