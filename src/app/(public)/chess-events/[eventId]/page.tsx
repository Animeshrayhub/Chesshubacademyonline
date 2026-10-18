import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { EventStatusBadge, EventTypeBadge, EventCountdown } from '@/features/events/EventUIComponents';
import { computeEventDisplayStatus } from '@/types/events';
import type { DbEvent } from '@/types/events';

export const dynamic = 'force-dynamic';

interface Props {
  params: { eventId: string };
}

async function getPublicEvent(eventId: string): Promise<DbEvent | null> {
  try {
    const admin = createSupabaseAdmin();
    const { data } = await admin
      .from('events')
      .select('*')
      .eq('id', eventId)
      .eq('status', 'PUBLISHED')
      .eq('visibility', 'PUBLIC')
      .is('archived_at', null)
      .maybeSingle();
    return (data as DbEvent) ?? null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const event = await getPublicEvent(params.eventId);
  if (!event) return { title: 'Event Not Found | ChessHub Academy' };
  return {
    title: `${event.title} | ChessHub Events`,
    description: event.description ?? `Join ${event.title} — a ChessHub Academy chess event.`,
    openGraph: {
      title: event.title,
      description: event.description ?? `Join ${event.title} on ChessHub Academy.`,
    },
  };
}

function formatDateTime(iso: string, timezone = 'Asia/Kolkata'): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: timezone,
    timeZoneName: 'long',
  });
}

export default async function EventDetailPage({ params }: Props) {
  const event = await getPublicEvent(params.eventId);
  if (!event) notFound();

  const displayStatus = computeEventDisplayStatus(event.status, event.start_at, event.end_at);
  const isUpcoming = displayStatus === 'UPCOMING';
  const isLive = displayStatus === 'LIVE';
  const isCompleted = displayStatus === 'COMPLETED';

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Breadcrumb */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-300 transition-colors">Home</Link>
          <span>/</span>
          <Link href="/chess-events" className="hover:text-slate-300 transition-colors">Chess Events</Link>
          <span>/</span>
          <span className="text-slate-300 line-clamp-1">{event.title}</span>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* ── Left: Main content ── */}
          <div className="lg:col-span-2 space-y-8">
            {/* Header */}
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <EventTypeBadge eventType={event.event_type} />
                <EventStatusBadge
                  status={event.status}
                  startAt={event.start_at}
                  endAt={event.end_at}
                />
              </div>

              <h1 className="text-3xl md:text-4xl font-black text-white mb-4 leading-tight">
                {event.title}
              </h1>

              {event.description && (
                <p className="text-slate-400 text-base leading-relaxed">{event.description}</p>
              )}
            </div>

            {/* Live banner */}
            {isLive && (
              <div className="rounded-2xl bg-emerald-900/40 border border-emerald-500/40 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <p className="text-emerald-400 font-bold text-sm flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Tournament is LIVE right now!
                  </p>
                  <p className="text-slate-400 text-xs mt-1">Click Join to participate on Lichess</p>
                </div>
                {event.external_url && (
                  <a
                    href={event.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-white font-black text-sm rounded-xl transition-colors shadow-lg flex items-center gap-2 whitespace-nowrap"
                  >
                    🟢 Join Tournament
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </a>
                )}
              </div>
            )}

            {/* Completed banner */}
            {isCompleted && (
              <div className="rounded-2xl bg-slate-800/60 border border-slate-700 p-5">
                <p className="text-slate-400 font-semibold text-sm">
                  🏁 This event has concluded. Check the Lichess page for final standings.
                </p>
                {event.external_url && (
                  <a
                    href={event.external_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-xs text-amber-400 hover:text-amber-300 font-semibold transition-colors"
                  >
                    View results on Lichess ↗
                  </a>
                )}
              </div>
            )}

            {/* Countdown section */}
            {isUpcoming && event.start_at && (
              <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6">
                <p className="text-xs text-slate-400 uppercase font-semibold tracking-widest mb-4">
                  ⏳ Event Starts In
                </p>
                <EventCountdown startAt={event.start_at} timezone={event.timezone} />
              </div>
            )}

            {/* Join section */}
            {isUpcoming && event.external_url && (
              <div className="rounded-2xl bg-gradient-to-br from-amber-900/30 to-indigo-900/30 border border-amber-500/20 p-6">
                <h2 className="text-lg font-bold text-white mb-2">Ready to Play?</h2>
                <p className="text-slate-400 text-sm mb-4">
                  This tournament is hosted on Lichess. Click the button below to join.
                </p>
                <a
                  href={event.external_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm rounded-xl transition-colors shadow-lg"
                >
                  🏆 Join Tournament on Lichess
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            )}
          </div>

          {/* ── Right: Event info card ── */}
          <div className="space-y-4">
            <div className="rounded-2xl bg-slate-900 border border-slate-800 p-5 space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-slate-800 pb-3">
                Event Information
              </h2>

              <InfoRow label="Type" value={eventTypeLabel(event.event_type)} />
              {event.start_at && (
                <InfoRow label="Start" value={formatDateTime(event.start_at, event.timezone)} />
              )}
              {event.end_at && (
                <InfoRow label="End" value={formatDateTime(event.end_at, event.timezone)} />
              )}
              <InfoRow label="Timezone" value={event.timezone} />
              {event.time_control && (
                <InfoRow label="Time Control" value={event.time_control} mono />
              )}
              {event.variant && (
                <InfoRow label="Variant" value={event.variant} className="capitalize" />
              )}
              {event.format && (
                <InfoRow label="Format" value={event.format} className="capitalize" />
              )}
              <InfoRow label="Rated" value={event.is_rated ? 'Yes' : 'No'} />
              {event.external_id && (
                <InfoRow label="Lichess ID" value={event.external_id} mono />
              )}
            </div>

            <Link
              href="/chess-events"
              className="block text-center text-xs text-slate-500 hover:text-slate-300 transition-colors pt-2"
            >
              ← Back to all events
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono = false,
  className = '',
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wider">{label}</span>
      <span className={`text-sm text-slate-200 ${mono ? 'font-mono' : ''} ${className}`}>{value}</span>
    </div>
  );
}

function eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    LICHESS_TOURNAMENT: '♟️ Lichess Tournament',
    INTERNAL_TOURNAMENT: '🏆 Academy Tournament',
    WORKSHOP: '🎓 Workshop',
    MASTERCLASS: '👑 Masterclass',
    PUZZLE_CHALLENGE: '🧩 Puzzle Challenge',
    ANNOUNCEMENT: '📢 Announcement',
  };
  return labels[type] ?? type;
}
