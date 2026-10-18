'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  updateEventAction,
  publishEventAction,
  cancelEventAction,
  archiveEventAction,
} from '@/actions/events';
import type { DbEvent, EventVisibility, EventType } from '@/types/events';
import { EventStatusBadge, EventTypeBadge } from '@/features/events/EventUIComponents';

export default function AdminEventDetailClient({ event }: { event: DbEvent }) {
  const router = useRouter();

  // Form State
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description || '');
  const [visibility, setVisibility] = useState<EventVisibility>(event.visibility);
  const [eventType, setEventType] = useState<EventType>(event.event_type);
  const [timeControl, setTimeControl] = useState(event.time_control || '');
  const [externalUrl, setExternalUrl] = useState(event.external_url || '');

  // Format dates for datetime-local
  const toLocalInput = (iso: string | null) => {
    if (!iso) return '';
    const d = new Date(iso);
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  };

  const [startAt, setStartAt] = useState(toLocalInput(event.start_at));
  const [endAt, setEndAt] = useState(toLocalInput(event.end_at));
  const [showOnHomepage, setShowOnHomepage] = useState(event.show_on_homepage);
  const [showOnStudentDashboard, setShowOnStudentDashboard] = useState(event.show_on_student_dashboard);
  const [showOnCoachDashboard, setShowOnCoachDashboard] = useState(event.show_on_coach_dashboard);

  // Status & loading
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Handle Update
  async function handleUpdate() {
    setIsSaving(true);
    setStatusMessage(null);

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      visibility,
      event_type: eventType,
      time_control: timeControl.trim() || null,
      external_url: externalUrl.trim() || null,
      start_at: startAt ? new Date(startAt).toISOString() : null,
      end_at: endAt ? new Date(endAt).toISOString() : null,
      show_on_homepage: showOnHomepage,
      show_on_student_dashboard: showOnStudentDashboard,
      show_on_coach_dashboard: showOnCoachDashboard,
    };

    const res = await updateEventAction(event.id, payload);
    setIsSaving(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: 'Event details updated successfully.' });
      router.refresh();
    } else {
      setStatusMessage({ type: 'error', text: res.error.message });
    }
  }

  // Handle Lifecycle Action
  async function handleLifecycleAction(action: 'publish' | 'cancel' | 'archive') {
    const confirmMsg = {
      publish: 'Publish this event now? Notifications will be dispatched to students.',
      cancel: 'Are you sure you want to cancel this event?',
      archive: 'Are you sure you want to archive this event?',
    }[action];

    if (!confirm(confirmMsg)) return;

    setIsSaving(true);
    setStatusMessage(null);

    let res;
    if (action === 'publish') res = await publishEventAction(event.id);
    else if (action === 'cancel') res = await cancelEventAction(event.id);
    else res = await archiveEventAction(event.id);

    setIsSaving(false);

    if (res.success) {
      setStatusMessage({ type: 'success', text: `Event ${action}ed successfully.` });
      router.refresh();
    } else {
      setStatusMessage({ type: 'error', text: res.error.message });
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className="bg-white p-5 rounded-2xl border border-border shadow-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <EventTypeBadge eventType={event.event_type} />
          <EventStatusBadge
            status={event.status}
            startAt={event.start_at}
            endAt={event.end_at}
            rawImportData={event.raw_import_data}
          />
          {event.external_provider && (
            <span className="text-xs font-mono text-text-secondary bg-surface-light px-2.5 py-1 rounded-full border border-border">
              {event.external_provider}: {event.external_id}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {event.status === 'DRAFT' && (
            <button
              type="button"
              onClick={() => handleLifecycleAction('publish')}
              disabled={isSaving}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
            >
              🚀 Publish Event
            </button>
          )}

          {event.status === 'PUBLISHED' && (
            <button
              type="button"
              onClick={() => handleLifecycleAction('cancel')}
              disabled={isSaving}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
            >
              Cancel Event
            </button>
          )}

          {event.status !== 'ARCHIVED' && (
            <button
              type="button"
              onClick={() => handleLifecycleAction('archive')}
              disabled={isSaving}
              className="px-3 py-2 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-600 font-semibold text-xs rounded-xl transition-colors border border-border"
            >
              Archive
            </button>
          )}
        </div>
      </div>

      {statusMessage && (
        <div
          className={`p-4 rounded-xl text-xs font-medium border ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          {statusMessage.text}
        </div>
      )}

      {/* Main Edit Form */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-6">
        <h2 className="text-base font-bold text-text-primary border-b border-border pb-3">
          Edit Event Details
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Event Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Event Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as EventType)}
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="LICHESS_TOURNAMENT">Lichess Tournament</option>
              <option value="INTERNAL_TOURNAMENT">Academy Tournament</option>
              <option value="WORKSHOP">Workshop</option>
              <option value="MASTERCLASS">Masterclass</option>
              <option value="PUZZLE_CHALLENGE">Puzzle Challenge</option>
              <option value="ANNOUNCEMENT">Announcement</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Audience Visibility
            </label>
            <select
              value={visibility}
              onChange={(e) => setVisibility(e.target.value as EventVisibility)}
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="PUBLIC">Public (Website & Students)</option>
              <option value="STUDENTS_ONLY">Students & Coaches Only</option>
              <option value="PRIVATE">Private (Admins Only)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Start Time (IST)
            </label>
            <input
              type="datetime-local"
              value={startAt}
              onChange={(e) => setStartAt(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              End Time (IST)
            </label>
            <input
              type="datetime-local"
              value={endAt}
              onChange={(e) => setEndAt(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Time Control
            </label>
            <input
              type="text"
              value={timeControl}
              onChange={(e) => setTimeControl(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Join Link
            </label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Display Toggles */}
        <div className="pt-4 border-t border-border space-y-3">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Display Settings
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnHomepage}
                onChange={(e) => setShowOnHomepage(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-text-primary font-medium">Feature on Homepage</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnStudentDashboard}
                onChange={(e) => setShowOnStudentDashboard(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-text-primary font-medium">Show on Student Dashboard</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showOnCoachDashboard}
                onChange={(e) => setShowOnCoachDashboard(e.target.checked)}
                className="rounded border-border text-primary focus:ring-primary"
              />
              <span className="text-text-primary font-medium">Show on Coach Dashboard</span>
            </label>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
          <button
            type="button"
            onClick={handleUpdate}
            disabled={isSaving}
            className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSaving ? 'Saving Changes...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
