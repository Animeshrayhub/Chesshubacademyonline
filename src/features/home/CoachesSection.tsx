import Image from 'next/image';
import Link from 'next/link';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import { COACHES } from '@/constants/COACHES';

export default function CoachesSection() {
  return (
    <section
      className="section-py bg-white"
      aria-label="Meet our coaches"
    >
      <Container>
        <SectionTitle
          eyebrow="Certified Faculty"
          title="Learn From"
          titleHighlight="FIDE Coaches"
          subtitle="Every coach at ChessHub Academy holds verified FIDE instructor credentials, official FIDE IDs, and extensive competitive experience."
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">

          {COACHES.map((coach) => (
            <article
              key={coach.id}
              className="group card-premium overflow-hidden"
            >
              {/* Image */}
              <div className="relative h-64 overflow-hidden">
                <Image
                  src={coach.imageUrl}
                  alt={`${coach.name} — ${coach.title} at ChessHub Academy`}
                  fill
                  className="object-cover transition-transform duration-300 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-surface-dark/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                {/* FIDE badge */}
                <div className="absolute top-4 right-4 bg-surface-dark/80 backdrop-blur-sm border border-white/20 rounded-xl px-3 py-2 text-center">
                  <div className="text-accent font-bold text-xs font-heading">
                    {coach.fideRating ? coach.fideRating : coach.fideId ? `ID: ${coach.fideId}` : 'FIDE'}
                  </div>
                  <div className="text-white/60 text-[10px]">FIDE CERTIFIED</div>
                </div>

                {/* Country flag */}
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 text-sm font-medium text-text-primary flex items-center gap-1.5">
                  <span aria-hidden="true">{coach.flag}</span>
                  {coach.country}
                </div>
              </div>

              {/* Content */}
              <div className="p-6">
                <h3 className="font-heading font-bold text-xl text-text-primary mb-1">
                  {coach.name}
                </h3>
                <p className="text-primary text-sm font-semibold mb-4">{coach.title}</p>
                <p className="text-text-secondary text-sm leading-relaxed mb-5 line-clamp-3">
                  {coach.bio}
                </p>

                {/* Stats */}
                <div className="flex gap-4 py-4 border-t border-border">
                  <div className="text-center flex-1">
                    <div className="font-bold text-text-primary text-lg font-heading">
                      {coach.students}+
                    </div>
                    <div className="text-xs text-text-secondary">Students</div>
                  </div>
                  <div className="w-px bg-border" aria-hidden="true" />
                  <div className="text-center flex-1">
                    <div className="font-bold text-text-primary text-lg font-heading">
                      {coach.experience.split(' ')[0]}
                    </div>
                    <div className="text-xs text-text-secondary">Credentials</div>
                  </div>
                  <div className="w-px bg-border" aria-hidden="true" />
                  <div className="text-center flex-1">
                    <div className="font-bold text-accent text-xs font-heading">
                      {coach.fideRating ? coach.fideRating : coach.fideId ? coach.fideId : 'Certified'}
                    </div>
                    <div className="text-xs text-text-secondary">{coach.fideRating ? 'FIDE Rating' : 'FIDE ID'}</div>
                  </div>
                </div>
              </div>

            </article>
          ))}
        </div>

        <div className="text-center mt-12">
          <Link
            href="/about#team"
            className="inline-flex items-center gap-2 px-8 py-4 border-2 border-primary text-primary hover:bg-primary hover:text-white font-semibold rounded-xl transition-all duration-200"
          >
            Meet the Full Team
          </Link>
        </div>
      </Container>
    </section>
  );
}
