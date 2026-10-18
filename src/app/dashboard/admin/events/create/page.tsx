'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createEventAction } from '@/actions/events';
import type { EventType, EventVisibility, LichessImportPreview } from '@/types/events';

export default function CreateEventPage() {
  const router = useRouter();

  // Mode: 'lichess' or 'custom'
  const [mode, setMode] = useState<'lichess' | 'custom'>('lichess');

  // Lichess Import State
  const [lichessUrl, setLichessUrl] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [preview, setPreview] = useState<LichessImportPreview | null>(null);

  // Form State
  const [eventType, setEventType] = useState<EventType>('LICHESS_TOURNAMENT');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<EventVisibility>('PUBLIC');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [timeControl, setTimeControl] = useState('');
  const [variant, setVariant] = useState('standard');
  const [format, setFormat] = useState('arena');
  const [isRated, setIsRated] = useState(false);
  const [showOnHomepage, setShowOnHomepage] = useState(false);
  const [showOnStudentDashboard, setShowOnStudentDashboard] = useState(true);
  const [showOnCoachDashboard, setShowOnCoachDashboard] = useState(true);
  const [externalUrl, setExternalUrl] = useState('');
  const [externalId, setExternalId] = useState('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Handle Lichess Import
  async function handleLichessImport() {
    if (!lichessUrl.trim()) {
      setImportError('Please enter a valid Lichess tournament URL.');
      return;
    }

    setIsImporting(true);
    setImportError(null);

    try {
      const res = await fetch('/api/events/import-lichess', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: lichessUrl.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setImportError(data.error || 'Failed to import tournament from Lichess.');
        return;
      }

      const p: LichessImportPreview = data.preview;
      setPreview(p);

      // Pre-fill form fields
      setEventType('LICHESS_TOURNAMENT');
      setTitle(p.title);
      setDescription(p.description || '');
      setTimeControl(p.timeControl);
      setVariant(p.variant);
      setFormat(p.format);
      setIsRated(p.isRated);
      setExternalUrl(p.externalUrl);
      setExternalId(p.tournamentId);

      if (p.startAt) {
        // Convert ISO UTC to local datetime-local format
        const d = new Date(p.startAt);
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setStartAt(localIso);
      }

      if (p.endAt) {
        const d = new Date(p.endAt);
        const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
          .toISOString()
          .slice(0, 16);
        setEndAt(localIso);
      }
    } catch (err) {
      setImportError('Network error while connecting to Lichess.');
    } finally {
      setIsImporting(false);
    }
  }

  // Handle Submit
  async function handleSubmit(asDraft: boolean) {
    if (!title.trim()) {
      setSubmitError('Title is required.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const payload = {
        event_type: eventType,
        title: title.trim(),
        description: description.trim() || null,
        status: (asDraft ? 'DRAFT' : 'PUBLISHED') as 'DRAFT' | 'PUBLISHED',
        visibility,
        start_at: startAt ? new Date(startAt).toISOString() : null,
        end_at: endAt ? new Date(endAt).toISOString() : null,
        time_control: timeControl.trim() || null,
        variant: variant.trim() || null,
        format: format.trim() || null,
        is_rated: isRated,
        show_on_homepage: showOnHomepage,
        show_on_student_dashboard: showOnStudentDashboard,
        show_on_coach_dashboard: showOnCoachDashboard,
        external_provider: mode === 'lichess' ? 'LICHESS' : null,
        external_id: externalId || null,
        external_url: externalUrl || null,
        raw_import_data: preview?.rawData as unknown as Record<string, unknown> || null,
      };

      const result = await createEventAction(payload);

      if (!result.success) {
        setSubmitError(result.error.message);
        return;
      }

      router.push('/dashboard/admin/events');
    } catch (err) {
      setSubmitError('Failed to save event. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <Link
            href="/dashboard/admin/events"
            className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 mb-1"
          >
            ← Back to Events
          </Link>
          <h1 className="text-2xl font-bold text-text-primary">Create New Event</h1>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex gap-4 p-1 bg-surface-light rounded-xl border border-border">
        <button
          type="button"
          onClick={() => setMode('lichess')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all ${
            mode === 'lichess'
              ? 'bg-white text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          ♟️ Import from Lichess URL
        </button>
        <button
          type="button"
          onClick={() => setMode('custom')}
          className={`flex-1 py-2.5 px-4 text-xs font-bold rounded-lg transition-all ${
            mode === 'custom'
              ? 'bg-white text-primary shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          ✏️ Custom / Workshop Event
        </button>
      </div>

      {/* Lichess Import Box */}
      {mode === 'lichess' && (
        <div className="p-6 bg-amber-50/50 border border-amber-200/80 rounded-2xl space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">⚡</span>
            <div>
              <h2 className="text-sm font-bold text-amber-950">Import Lichess Tournament</h2>
              <p className="text-xs text-amber-800">
                Paste any public Lichess arena or swiss tournament URL (e.g. https://lichess.org/tournament/RjKXaR5C)
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="https://lichess.org/tournament/..."
              value={lichessUrl}
              onChange={(e) => setLichessUrl(e.target.value)}
              className="flex-1 px-4 py-2 text-sm bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            <button
              type="button"
              onClick={handleLichessImport}
              disabled={isImporting}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-colors disabled:opacity-50"
            >
              {isImporting ? 'Importing...' : 'Fetch Tournament'}
            </button>
          </div>

          {importError && (
            <div className="p-3 bg-red-100 border border-red-200 rounded-xl text-xs text-red-700 font-medium">
              ⚠️ {importError}
            </div>
          )}

          {preview && (
            <div className="p-4 bg-white border border-amber-200 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-text-primary">
                <span>{preview.title}</span>
                <span className="text-emerald-600 font-mono">
                  {preview.timeControl} · {preview.variant}
                </span>
              </div>
              <p className="text-text-secondary">
                Duration: {preview.rawData.minutes} min · System: {preview.format} · Rated:{' '}
                {preview.isRated ? 'Yes' : 'No'} · Players: {preview.nbPlayers}
              </p>
              <p className="text-emerald-700 font-semibold">
                ✓ Tournament details fetched and populated into form below!
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Event Form */}
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 space-y-6">
        <h2 className="text-base font-bold text-text-primary border-b border-border pb-3">
          Event Details
        </h2>

        {submitError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 font-medium">
            ⚠️ {submitError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Event Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. ChessHub Weekly Blitz Arena"
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Event Type */}
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

          {/* Visibility */}
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

          {/* Start Time */}
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

          {/* End Time */}
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

          {/* Time Control */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Time Control
            </label>
            <input
              type="text"
              value={timeControl}
              onChange={(e) => setTimeControl(e.target.value)}
              placeholder="e.g. 5+0 Blitz, 10+0 Rapid"
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Variant */}
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Chess Variant
            </label>
            <input
              type="text"
              value={variant}
              onChange={(e) => setVariant(e.target.value)}
              placeholder="standard, crazyhouse, etc."
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* External URL */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Join / External Link (Lichess URL or Google Meet)
            </label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://lichess.org/tournament/..."
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-text-secondary mb-1">
              Description / Instructions
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Provide event details, rules, or prizes..."
              className="w-full px-3.5 py-2 text-sm bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>

        {/* Display Toggles */}
        <div className="pt-4 border-t border-border space-y-3">
          <p className="text-xs font-bold text-text-secondary uppercase tracking-wider">
            Display & Notification Settings
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

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
          <Link
            href="/dashboard/admin/events"
            className="px-4 py-2 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
          >
            Cancel
          </Link>
          <button
            type="button"
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-semibold text-text-primary bg-surface-light hover:bg-slate-100 border border-border rounded-xl transition-colors disabled:opacity-50"
          >
            Save as Draft
          </button>
          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="px-5 py-2 text-xs font-bold text-white bg-primary hover:bg-primary/90 rounded-xl transition-colors disabled:opacity-50 shadow-sm"
          >
            {isSubmitting ? 'Publishing...' : '🚀 Publish Event'}
          </button>
        </div>
      </div>
    </div>
  );
}
