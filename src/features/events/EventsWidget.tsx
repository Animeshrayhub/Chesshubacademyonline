import Link from 'next/link';
import { getDashboardEvents } from '@/lib/events';
import { EventStatusBadge, EventTypeBadge, EventCountdown } from './EventUIComponents';
import type { PublicEventCard } from '@/types/events';
import { computeEventDisplayStatus } from '@/types/events';

interface EventsWidgetProps {
  role: 'student' | 'coach';
}

/**
 * Server component — fetches upcoming/live events and renders as a dashboard widget.
 * Used on both /dashboard/student and /dashboard/coach overview pages.
 */
export default async function EventsWidget({ role }: EventsWidgetProps) {
  const events = await getDashboardEvents({
    forStudent: role === 'student',
    forCoach: role === 'coach',
  });

  // Prioritize upcoming and live events
  const sorted = events.slice().sort((a, b) => {
    const aStatus = computeEventDisplayStatus(a.status, a.start_at, a.end_at);
    const bStatus = computeEventDisplayStatus(b.status, b.start_at, b.end_at);
    const priority: Record<string, number> = { LIVE: 0, UPCOMING: 1, COMPLETED: 2, CANCELLED: 3, DRAFT: 4 };
    const pA = priority[aStatus] ?? 5;
    const pB = priority[bStatus] ?? 5;
    if (pA !== pB) return pA - pB;
    if (a.start_at && b.start_at) return new Date(a.start_at).getTime() - new Date(b.start_at).getTime();
    return 0;
  });

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center text-base">
            🏆
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              ChessHub Events
            </h3>
            <p className="text-[10px] text-text-secondary">Upcoming & live tournaments</p>
          </div>
        </div>
        <Link
          href="/chess-events"
          className="text-[10px] font-semibold text-primary hover:text-primary/80 transition-colors uppercase tracking-wider"
        >
          View All →
        </Link>
      </div>

      {/* Event list */}
      {sorted.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-3xl mb-2">🏁</div>
          <p className="text-sm font-medium text-text-primary">No events scheduled</p>
          <p className="text-xs text-text-secondary mt-1">Check back soon for upcoming tournaments</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {sorted.map((event) => {
            const displayStatus = computeEventDisplayStatus(event.status, event.start_at, event.end_at);
            const isUpcoming = displayStatus === 'UPCOMING';
            const isLive = displayStatus === 'LIVE';

            return (
              <li key={event.id} className="group">
                <Link href={`/chess-events/${event.id}`} className="block">
                  <div
                    className={`p-3.5 rounded-xl border transition-all duration-150 group-hover:shadow-sm ${
                      isLive
                        ? 'bg-emerald-50/50 border-emerald-200 group-hover:border-emerald-300'
                        : 'bg-slate-50/50 border-border group-hover:border-primary/20'
                    }`}
                  >
                    {/* Type + status row */}
                    <div className="flex items-center justify-between mb-2">
                      <EventTypeBadge eventType={event.event_type} />
                      <EventStatusBadge
                        status={event.status}
                        startAt={event.start_at}
                        endAt={event.end_at}
                      />
                    </div>

                    {/* Title */}
                    <p className="text-sm font-bold text-text-primary leading-snug line-clamp-1 mb-1">
                      {event.title}
                    </p>

                    {/* Time control + variant */}
                    {event.time_control && (
                      <p className="text-[10px] text-text-secondary font-mono mb-2">
                        {event.time_control} · {event.variant ?? 'Standard'}
                      </p>
                    )}

                    {/* Countdown for upcoming */}
                    {isUpcoming && event.start_at && (
                      <div className="mt-2">
                        <p className="text-[9px] text-text-secondary uppercase font-semibold mb-1">
                          Starts in
                        </p>
                        <EventCountdown startAt={event.start_at} compact />
                      </div>
                    )}

                    {/* Join button for live events with URL */}
                    {isLive && event.external_url && (
                      <a
                        href={event.external_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-2 inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg transition-colors"
                      >
                        🟢 Join Tournament
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
