import type { Metadata } from 'next';
import Link from 'next/link';
import { listAllEvents } from '@/lib/events';
import { EventStatusBadge, EventTypeBadge } from '@/features/events/EventUIComponents';
import { computeEventDisplayStatus } from '@/types/events';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Events | Admin Dashboard',
  description: 'Manage ChessHub Academy events and Lichess tournaments.',
  robots: { index: false, follow: false },
};

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata',
  });
}

export default async function AdminEventsPage() {
  const result = await listAllEvents();
  const events = result.success ? result.data : [];

  const total = events.length;
  const published = events.filter((e) => e.status === 'PUBLISHED').length;
  const drafts = events.filter((e) => e.status === 'DRAFT').length;
  const live = events.filter(
    (e) => computeEventDisplayStatus(e.status, e.start_at, e.end_at, e.raw_import_data) === 'LIVE'
  ).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Events</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage tournaments, workshops, and masterclasses
          </p>
        </div>
        <Link
          href="/dashboard/admin/events/create"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary/90 transition-colors shadow-sm"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Create Event
        </Link>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Events', value: total,     color: 'text-text-primary', bg: 'bg-white' },
          { label: 'Published',    value: published,  color: 'text-blue-600',    bg: 'bg-blue-50' },
          { label: 'Drafts',       value: drafts,     color: 'text-amber-600',   bg: 'bg-amber-50' },
          { label: 'Live',         value: live,       color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map((s) => (
          <div key={s.label} className={`${s.bg} rounded-xl border border-border p-4 shadow-sm`}>
            <p className="text-xs text-text-secondary font-medium mb-1">{s.label}</p>
            <p className={`text-2xl font-black ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Events table */}
      <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
        {events.length === 0 ? (
          <div className="p-16 text-center">
            <div className="text-5xl mb-4">🏆</div>
            <h3 className="text-lg font-bold text-text-primary mb-2">No Events Yet</h3>
            <p className="text-sm text-text-secondary mb-6 max-w-sm mx-auto">
              Create your first event or import a Lichess tournament to get started.
            </p>
            <Link
              href="/dashboard/admin/events/create"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white font-semibold text-sm rounded-xl hover:bg-primary/90 transition-colors"
            >
              + Create First Event
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface-light border-b border-border">
                <tr>
                  <th className="text-left px-5 py-3.5 text-xs font-bold text-text-secondary uppercase tracking-wider">Event</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-text-secondary uppercase tracking-wider hidden md:table-cell">Type</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-text-secondary uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-text-secondary uppercase tracking-wider hidden lg:table-cell">Start</th>
                  <th className="text-left px-4 py-3.5 text-xs font-bold text-text-secondary uppercase tracking-wider hidden lg:table-cell">Created</th>
                  <th className="px-4 py-3.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => (
                  <tr key={event.id} className="hover:bg-surface-light/60 transition-colors">
                    <td className="px-5 py-4">
                      <div>
                        <p className="font-semibold text-text-primary line-clamp-1">{event.title}</p>
                        {event.external_id && (
                          <p className="text-xs text-text-secondary font-mono mt-0.5">
                            {event.external_provider}: {event.external_id}
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 hidden md:table-cell">
                      <EventTypeBadge eventType={event.event_type} />
                    </td>
                    <td className="px-4 py-4">
                      <EventStatusBadge
                        status={event.status}
                        startAt={event.start_at}
                        endAt={event.end_at}
                      />
                    </td>
                    <td className="px-4 py-4 text-xs text-text-secondary hidden lg:table-cell whitespace-nowrap">
                      {formatDate(event.start_at)}
                    </td>
                    <td className="px-4 py-4 text-xs text-text-secondary hidden lg:table-cell whitespace-nowrap">
                      {formatDate(event.created_at)}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/dashboard/admin/events/${event.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-primary bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg transition-colors"
                      >
                        Manage →
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
