import Image from 'next/image';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import { TESTIMONIALS } from '@/constants/TESTIMONIALS';

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill={i < rating ? '#D4AF37' : 'none'}
          stroke={i < rating ? 'none' : '#D4AF37'}
          strokeWidth="2"
          aria-hidden="true"
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

export default function TestimonialsSection() {
  return (
    <section
      className="section-py bg-surface-light"
      aria-label="Testimonials from parents and students"
    >
      <Container>
        <SectionTitle
          eyebrow="Testimonials"
          title="What Parents &"
          titleHighlight="Students Say"
          subtitle="Honest feedback from our international community of learners."
        />

        {/* Testimonials grid */}
        <div className="columns-1 md:columns-2 lg:columns-3 gap-6 space-y-6">
          {TESTIMONIALS.map((testimonial) => (
            <article
              key={testimonial.id}
              className="card-premium p-7 break-inside-avoid"
            >
              {/* Stars */}
              <StarRating rating={testimonial.rating} />

              {/* Quote */}
              <blockquote className="mt-4 mb-6">
                <p className="text-text-secondary text-sm leading-relaxed italic">
                  &ldquo;{testimonial.quote}&rdquo;
                </p>
              </blockquote>

              {/* Result badge */}
              {testimonial.result && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/8 text-primary rounded-lg text-xs font-semibold mb-5 border border-primary/15">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" />
                  </svg>
                  {testimonial.result}
                </div>
              )}

              {/* Author */}
              <footer className="flex items-center gap-3 pt-4 border-t border-border">
                <div className="relative w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <Image
                    src={testimonial.imageUrl}
                    alt={`${testimonial.name} photo`}
                    fill
                    className="object-cover"
                    sizes="40px"
                  />
                </div>
                <div>
                  <div className="font-semibold text-text-primary text-sm">
                    {testimonial.name}
                  </div>
                  <div className="text-text-secondary text-xs">
                    {testimonial.role}
                    {testimonial.childAge && ` · Child age ${testimonial.childAge}`}
                    {' · '}
                    {testimonial.location}
                  </div>
                </div>
              </footer>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
