import type { Metadata } from 'next';
import Link from 'next/link';
import { getPublishedEvents } from '@/lib/events';
import { EventStatusBadge, EventTypeBadge, EventCountdown } from '@/features/events/EventUIComponents';
import { computeEventDisplayStatus, type PublicEventCard } from '@/types/events';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Chess Events | ChessHub Academy',
  description:
    'Join ChessHub Academy chess tournaments, workshops, and masterclasses. View upcoming and live events with real-time countdowns.',
  openGraph: {
    title: 'Chess Events | ChessHub Academy',
    description: 'Upcoming chess tournaments, workshops, and masterclasses from ChessHub Academy.',
  },
};

function formatDate(iso: string, timezone = 'Asia/Kolkata'): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: timezone,
  });
}

function formatTime(iso: string, timezone = 'Asia/Kolkata'): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  });
}

export default async function ChessEventsPage() {
  const allEvents = await getPublishedEvents();

  // Partition by display status
  const live: typeof allEvents = [];
  const upcoming: typeof allEvents = [];
  const completed: typeof allEvents = [];
  const featured = allEvents.find((e) => e.show_on_homepage) ?? allEvents[0] ?? null;

  for (const event of allEvents) {
    const ds = computeEventDisplayStatus(event.status, event.start_at, event.end_at);
    if (ds === 'LIVE') live.push(event);
    else if (ds === 'UPCOMING') upcoming.push(event);
    else if (ds === 'COMPLETED') completed.push(event);
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* ── Hero / Page Header ── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 pt-20 pb-16 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(99,102,241,0.15),_transparent_60%)]" />
        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-6">
            🏆 ChessHub Events
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
            Chess Tournaments &amp;{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-yellow-300">
              Events
            </span>
          </h1>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto">
            Compete, learn, and grow with ChessHub Academy events. Join live Lichess arenas,
            workshops, and masterclasses curated by our FIDE-rated coaches.
          </p>
        </div>
      </section>

      <div className="max-w-6xl mx-auto px-4 pb-20 space-y-16 -mt-4">

        {/* ── Featured Event ── */}
        {featured && (
          <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-6 h-px bg-amber-500 inline-block" />
              Featured Event
            </h2>
            <FeaturedEventCard event={featured} />
          </section>
        )}

        {/* ── Live Events ── */}
        {live.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse inline-block" />
              Live Now
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {live.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}

        {/* ── Upcoming Events ── */}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-6 h-px bg-blue-500 inline-block" />
              Upcoming Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {upcoming.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          </section>
        )}

        {/* ── Completed Events ── */}
        {completed.length > 0 && (
          <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
              <span className="w-6 h-px bg-slate-500 inline-block" />
              Past Events
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 opacity-75">
              {completed.slice(0, 6).map((e) => (
                <EventCard key={e.id} event={e} compact />
              ))}
            </div>
          </section>
        )}

        {/* ── Empty State ── */}
        {allEvents.length === 0 && (
          <div className="text-center py-24">
            <div className="text-6xl mb-4">♟️</div>
            <h2 className="text-2xl font-bold text-white mb-3">No Events Yet</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              ChessHub Academy events will appear here soon. Check back for upcoming tournaments,
              workshops, and masterclasses.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Featured Event Card ──────────────────────────────────────────────────────

function FeaturedEventCard({ event }: { event: PublicEventCard }) {
  const displayStatus = computeEventDisplayStatus(event.status, event.start_at, event.end_at);
  const isUpcoming = displayStatus === 'UPCOMING';

  return (
    <Link href={`/chess-events/${event.id}`} className="block group">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-900/40 via-slate-900 to-indigo-900/40 border border-amber-500/20 p-8 md:p-10 hover:border-amber-500/40 transition-all duration-300 group-hover:shadow-2xl">
        <div className="absolute top-4 right-4">
          <EventStatusBadge status={event.status} startAt={event.start_at} endAt={event.end_at} />
        </div>

        <EventTypeBadge eventType={event.event_type} className="mb-4" />

        <h3 className="text-2xl md:text-3xl font-black text-white mb-3 group-hover:text-amber-300 transition-colors">
          {event.title}
        </h3>

        {event.description && (
          <p className="text-slate-400 text-sm mb-6 max-w-2xl line-clamp-2">{event.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-4 mb-6 text-sm text-slate-300">
          {event.start_at && (
            <span className="flex items-center gap-1.5">
              📅 {formatDateHelper(event.start_at, event.timezone)}
            </span>
          )}
          {event.time_control && (
            <span className="flex items-center gap-1.5 font-mono">
              ⏱ {event.time_control}
            </span>
          )}
          {event.variant && (
            <span className="flex items-center gap-1.5 capitalize">
              ♟ {event.variant}
            </span>
          )}
        </div>

        {isUpcoming && event.start_at && (
          <div className="mb-6">
            <p className="text-xs text-slate-400 uppercase font-semibold mb-3">Event starts in</p>
            <EventCountdown startAt={event.start_at} timezone={event.timezone} />
          </div>
        )}

        <div className="flex items-center gap-3">
          <span className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl transition-colors">
            View Event Details →
          </span>
          {event.external_url && (
            <a
              href={event.external_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl transition-colors border border-white/20"
            >
              🔗 Open on Lichess
            </a>
          )}
        </div>
      </div>
    </Link>
  );
}

function formatDateHelper(iso: string, timezone = 'Asia/Kolkata'): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'short',
  });
}

// ─── Standard Event Card ──────────────────────────────────────────────────────

function EventCard({
  event,
  compact = false,
}: {
  event: PublicEventCard;
  compact?: boolean;
}) {
  const displayStatus = computeEventDisplayStatus(event.status, event.start_at, event.end_at);
  const isLive = displayStatus === 'LIVE';
  const isUpcoming = displayStatus === 'UPCOMING';

  return (
    <Link href={`/chess-events/${event.id}`} className="block group h-full">
      <div
        className={`h-full rounded-2xl border p-5 transition-all duration-200 group-hover:shadow-lg ${
          isLive
            ? 'bg-emerald-950/30 border-emerald-800/60 group-hover:border-emerald-600'
            : 'bg-slate-900 border-slate-800 group-hover:border-slate-600'
        }`}
      >
        <div className="flex items-start justify-between mb-3">
          <EventTypeBadge eventType={event.event_type} />
          <EventStatusBadge status={event.status} startAt={event.start_at} endAt={event.end_at} />
        </div>

        <h3 className="text-base font-bold text-white mb-2 group-hover:text-amber-300 transition-colors line-clamp-2">
          {event.title}
        </h3>

        {!compact && event.description && (
          <p className="text-xs text-slate-400 mb-3 line-clamp-2 leading-relaxed">{event.description}</p>
        )}

        <div className="space-y-1 mb-4 text-xs text-slate-400">
          {event.start_at && (
            <p>📅 {formatDateHelper(event.start_at, event.timezone)}</p>
          )}
          {event.time_control && (
            <p className="font-mono">⏱ {event.time_control} · {event.variant ?? 'Standard'}</p>
          )}
        </div>

        {isUpcoming && event.start_at && !compact && (
          <div className="mb-3">
            <p className="text-[9px] text-slate-500 uppercase font-semibold mb-1">Starts in</p>
            <EventCountdown startAt={event.start_at} compact />
          </div>
        )}

        {isLive && event.external_url && (
          <a
            href={event.external_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg transition-colors"
          >
            🟢 Join Now
          </a>
        )}
      </div>
    </Link>
  );
}
