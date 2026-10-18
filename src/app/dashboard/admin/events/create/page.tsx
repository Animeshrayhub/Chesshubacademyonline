'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createEventAction } from '@/actions/events';
import type { EventType, EventVisibility, LichessImportPreview } from '@/types/events';
import { EventStatusBadge, EventTypeBadge } from '@/features/events/EventUIComponents';

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
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Quick Date Helpers
  function setQuickDate(type: '1hour' | 'tomorrow' | 'sunday') {
    const now = new Date();
    let target = new Date();

    if (type === '1hour') {
      target = new Date(now.getTime() + 60 * 60 * 1000);
    } else if (type === 'tomorrow') {
      target.setDate(target.getDate() + 1);
      target.setHours(18, 0, 0, 0);
    } else if (type === 'sunday') {
      const day = target.getDay();
      const diff = target.getDate() + (7 - day) % 7;
      target.setDate(diff);
      target.setHours(11, 0, 0, 0);
    }

    const localIso = new Date(target.getTime() - target.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setStartAt(localIso);

    // Default duration: 90 minutes
    const endTarget = new Date(target.getTime() + 90 * 60 * 1000);
    const endLocalIso = new Date(endTarget.getTime() - endTarget.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
    setEndAt(endLocalIso);
  }

  // Handle Lichess Import
  async function handleLichessImport() {
    if (!lichessUrl.trim()) {
      setImportError('Please enter a valid Lichess tournament URL or 8-character ID.');
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
        const d = new Date(p.startAt);
        if (!isNaN(d.getTime())) {
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setStartAt(localIso);
        }
      }

      if (p.endAt) {
        const d = new Date(p.endAt);
        if (!isNaN(d.getTime())) {
          const localIso = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
          setEndAt(localIso);
        }
      }
    } catch {
      setImportError('Network error while connecting to Lichess. Please check URL or connection.');
    } finally {
      setIsImporting(false);
    }
  }

  // Handle Submit
  async function handleSubmit(asDraft: boolean) {
    if (!title.trim()) {
      setSubmitError('Please enter an Event Title before saving.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(null);

    try {
      const parsedStartAt = startAt && !isNaN(new Date(startAt).getTime())
        ? new Date(startAt).toISOString()
        : null;

      const parsedEndAt = endAt && !isNaN(new Date(endAt).getTime())
        ? new Date(endAt).toISOString()
        : null;

      const payload = {
        event_type: eventType,
        title: title.trim(),
        description: description.trim() || null,
        status: (asDraft ? 'DRAFT' : 'PUBLISHED') as 'DRAFT' | 'PUBLISHED',
        visibility,
        start_at: parsedStartAt,
        end_at: parsedEndAt,
        time_control: timeControl.trim() || null,
        variant: variant.trim() || null,
        format: format.trim() || null,
        is_rated: isRated,
        show_on_homepage: showOnHomepage,
        show_on_student_dashboard: showOnStudentDashboard,
        show_on_coach_dashboard: showOnCoachDashboard,
        external_provider: mode === 'lichess' ? 'LICHESS' : null,
        external_id: externalId || null,
        external_url: externalUrl.trim() || null,
        raw_import_data: (preview?.rawData as unknown as Record<string, unknown>) || null,
      };

      const result = await createEventAction(payload);

      if (!result.success) {
        setSubmitError(result.error?.message || 'Failed to save event. Please check inputs.');
        return;
      }

      setSubmitSuccess(asDraft ? '✅ Event saved as draft!' : '🚀 Event published successfully!');
      setTimeout(() => {
        router.push('/dashboard/admin/events');
      }, 700);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to save event. Please check inputs.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-border">
        <div>
          <Link
            href="/dashboard/admin/events"
            className="text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1 mb-1.5"
          >
            ← Back to Events
          </Link>
          <h1 className="text-2xl font-extrabold text-text-primary">Create New Event</h1>
          <p className="text-xs text-text-secondary mt-0.5">
            Publish tournaments, workshops, and academy masterclasses for students and public visitors.
          </p>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
        <button
          type="button"
          onClick={() => setMode('lichess')}
          className={`flex-1 py-3 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            mode === 'lichess'
              ? 'bg-white text-primary shadow-sm border border-slate-200/60'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/50'
          }`}
        >
          <span className="text-base">♟️</span>
          <span>Import from Lichess URL</span>
        </button>
        <button
          type="button"
          onClick={() => setMode('custom')}
          className={`flex-1 py-3 px-4 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            mode === 'custom'
              ? 'bg-white text-primary shadow-sm border border-slate-200/60'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/50'
          }`}
        >
          <span className="text-base">✏️</span>
          <span>Custom / Workshop Event</span>
        </button>
      </div>

      {/* Lichess Import Box */}
      {mode === 'lichess' && (
        <div className="p-6 bg-gradient-to-br from-amber-50 to-orange-50/40 border-2 border-amber-200/80 rounded-3xl space-y-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-xl flex-shrink-0">
              ⚡
            </div>
            <div>
              <h2 className="text-sm font-extrabold text-amber-950">Import Lichess Tournament</h2>
              <p className="text-xs text-amber-800/90 leading-relaxed mt-0.5">
                Paste any public Lichess arena or swiss tournament URL (e.g.{' '}
                <code className="bg-amber-100/80 px-1 py-0.5 rounded text-[11px] font-mono">
                  https://lichess.org/tournament/RjKXaR5C
                </code>
                ).
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              placeholder="https://lichess.org/tournament/..."
              value={lichessUrl}
              onChange={(e) => setLichessUrl(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleLichessImport();
                }
              }}
              className="flex-1 px-4 py-2.5 text-xs font-medium bg-white border border-amber-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
            />
            <button
              type="button"
              onClick={handleLichessImport}
              disabled={isImporting}
              className="px-6 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2"
            >
              {isImporting ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Fetching Lichess API...</span>
                </>
              ) : (
                <>
                  <span>📥 Fetch Tournament</span>
                </>
              )}
            </button>
          </div>

          {importError && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-center justify-between">
              <span>⚠️ {importError}</span>
              <button
                type="button"
                onClick={() => setImportError(null)}
                className="text-red-500 hover:text-red-800 font-bold ml-2"
              >
                ✕
              </button>
            </div>
          )}

          {preview && (
            <div className="p-4 bg-white border-2 border-emerald-300 rounded-2xl space-y-3 text-xs shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-extrabold text-text-primary text-sm">{preview.title}</span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold font-mono text-[11px]">
                  {preview.timeControl} · {preview.variant}
                </span>
              </div>
              <div className="flex flex-wrap gap-2 text-text-secondary text-[11px]">
                <span className="bg-slate-100 px-2 py-0.5 rounded">Duration: {preview.rawData.minutes} min</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded">System: {preview.format}</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded">Rated: {preview.isRated ? 'Yes' : 'No'}</span>
                <span className="bg-slate-100 px-2 py-0.5 rounded">Players: {preview.nbPlayers}</span>
              </div>
              <p className="text-emerald-700 font-bold flex items-center gap-1.5">
                <span>✓</span>
                <span>Tournament details successfully fetched and populated into form below!</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Form + Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left 2 Cols: Form */}
        <div className="lg:col-span-2 bg-white rounded-3xl border border-border shadow-card p-6 sm:p-8 space-y-6">
          <div className="flex items-center justify-between border-b border-border pb-4">
            <h2 className="text-base font-extrabold text-text-primary">Event Information</h2>
            <span className="text-[10px] text-text-tertiary uppercase font-bold tracking-wider">
              Required fields marked with *
            </span>
          </div>

          {submitError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 font-semibold flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-base">⚠️</span>
                <span>{submitError}</span>
              </div>
              <button
                type="button"
                onClick={() => setSubmitError(null)}
                className="text-red-500 hover:text-red-800 font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {submitSuccess && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-800 font-bold flex items-center gap-2 animate-fadeIn">
              <span className="text-base">🎉</span>
              <span>{submitSuccess}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Event Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ChessHub Weekly Blitz Arena"
                required
                className="w-full px-4 py-2.5 text-xs font-semibold bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Event Type */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Event Type
              </label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as EventType)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
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
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Audience Visibility
              </label>
              <select
                value={visibility}
                onChange={(e) => setVisibility(e.target.value as EventVisibility)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="PUBLIC">Public (Website & Students)</option>
                <option value="STUDENTS_ONLY">Students & Coaches Only</option>
                <option value="PRIVATE">Private (Admins Only)</option>
              </select>
            </div>

            {/* Start Time */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Start Time (IST)
              </label>
              <input
                type="datetime-local"
                value={startAt}
                onChange={(e) => setStartAt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* End Time */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                End Time (IST)
              </label>
              <input
                type="datetime-local"
                value={endAt}
                onChange={(e) => setEndAt(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Quick Date Presets */}
            <div className="md:col-span-2 flex flex-wrap items-center gap-1.5 pt-1 pb-1">
              <span className="text-[10px] font-bold text-text-tertiary uppercase mr-1">Quick Presets:</span>
              <button
                type="button"
                onClick={() => setQuickDate('1hour')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-text-secondary font-medium transition-colors"
              >
                In 1 Hour
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('tomorrow')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-text-secondary font-medium transition-colors"
              >
                Tomorrow 6 PM
              </button>
              <button
                type="button"
                onClick={() => setQuickDate('sunday')}
                className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-text-secondary font-medium transition-colors"
              >
                Sunday 11 AM
              </button>
            </div>

            {/* Time Control */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Time Control
              </label>
              <input
                type="text"
                value={timeControl}
                onChange={(e) => setTimeControl(e.target.value)}
                placeholder="e.g. 5+0 Blitz, 10+0 Rapid"
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Variant */}
            <div>
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Chess Variant
              </label>
              <input
                type="text"
                value={variant}
                onChange={(e) => setVariant(e.target.value)}
                placeholder="standard, crazyhouse, etc."
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* External URL */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Join Link / External URL (Lichess, Zoom, or Google Meet)
              </label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://lichess.org/tournament/..."
                className="w-full px-3.5 py-2.5 text-xs font-semibold bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-bold text-text-secondary mb-1">
                Description & Instructions
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide event details, tournament rules, target rating group, or prizes..."
                className="w-full px-3.5 py-2.5 text-xs font-medium bg-surface-light border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>
          </div>

          {/* Display & Visibility Settings */}
          <div className="pt-4 border-t border-border space-y-3">
            <p className="text-xs font-extrabold text-text-secondary uppercase tracking-wider">
              Display & Notification Targets
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-slate-100 bg-surface-light hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showOnHomepage}
                  onChange={(e) => setShowOnHomepage(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-text-primary font-semibold">Feature on Homepage</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-slate-100 bg-surface-light hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showOnStudentDashboard}
                  onChange={(e) => setShowOnStudentDashboard(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-text-primary font-semibold">Student Dashboard</span>
              </label>

              <label className="flex items-center gap-2 cursor-pointer p-2.5 rounded-xl border border-slate-100 bg-surface-light hover:bg-slate-100 transition-colors">
                <input
                  type="checkbox"
                  checked={showOnCoachDashboard}
                  onChange={(e) => setShowOnCoachDashboard(e.target.checked)}
                  className="rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-text-primary font-semibold">Coach Dashboard</span>
              </label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-border">
            <Link
              href="/dashboard/admin/events"
              className="px-4 py-2.5 text-xs font-semibold text-text-secondary hover:text-text-primary transition-colors"
            >
              Cancel
            </Link>
            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting}
              className="px-5 py-2.5 text-xs font-bold text-text-primary bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded-xl transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : '💾 Save as Draft'}
            </button>
            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting}
              className="px-6 py-2.5 text-xs font-extrabold text-white bg-primary hover:bg-primary-dark rounded-xl transition-all disabled:opacity-50 shadow-md flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Publishing...</span>
                </>
              ) : (
                <>
                  <span>🚀 Publish Event</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Col: Live Card Preview */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-text-secondary uppercase tracking-wider">
              Live Card Preview
            </h3>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
              Real-time
            </span>
          </div>

          <div className="rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-5 text-white shadow-xl space-y-4">
            <div className="flex items-center justify-between gap-2">
              <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wide bg-amber-500/20 text-amber-300 border border-amber-500/30">
                {eventType.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] font-bold text-slate-400">
                {visibility}
              </span>
            </div>

            <div>
              <h4 className="font-heading font-extrabold text-base text-white line-clamp-2">
                {title.trim() || 'Your Event Title Will Appear Here'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                {description.trim() || 'Event instructions, rules, or curriculum details...'}
              </p>
            </div>

            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 space-y-2 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span>⏱️ {timeControl || 'Standard'}</span>
                <span className="capitalize">{variant || 'Standard'}</span>
              </div>
              <div className="text-[11px] text-amber-300 font-medium">
                📅 {startAt && !isNaN(new Date(startAt).getTime()) ? new Date(startAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : 'Date: To Be Announced'}
              </div>
            </div>

            {externalUrl && (
              <a
                href={externalUrl}
                target="_blank"
                rel="noreferrer"
                className="block w-full py-2.5 px-4 rounded-xl text-center text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors shadow-gold"
              >
                Join Event Link ↗
              </a>
            )}
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-text-secondary space-y-1">
            <p className="font-bold text-text-primary text-[11px]">💡 Admin Tip</p>
            <p className="leading-relaxed text-[11px]">
              Publishing will automatically alert enrolled students on their dashboard feed. Drafts remain visible only to administrators.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
