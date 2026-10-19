'use client';

import React, { useState } from 'react';

interface AcademyAnnouncementBannerProps {
  title?: string;
  message?: string;
  date?: string;
  badge?: string;
  actionUrl?: string;
}

export default function AcademyAnnouncementBanner({
  title,
  message,
  date,
  badge = 'ACADEMY ANNOUNCEMENT',
  actionUrl = '/dashboard/student/announcements',
}: AcademyAnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || !title) return null;

  // Detect and handle JSON payload in announcement body (e.g. Lichess tournament data)
  let cleanMessage = message;
  let customActionUrl = actionUrl;
  let actionLabel = 'View Details';
  let isTournament = false;
  let tournamentMeta = '';

  if (message && (message.trim().startsWith('{') || message.includes('"event_type"'))) {
    try {
      const parsed = JSON.parse(message);
      isTournament = parsed.event_type === 'LICHESS_TOURNAMENT' || !!parsed.external_url;
      if (parsed.external_url) {
        customActionUrl = parsed.external_url;
        actionLabel = 'Join on Lichess ↗';
      }
      
      const parts: string[] = [];
      if (parsed.time_control) parts.push(`Format: ${parsed.time_control}`);
      if (parsed.description) parts.push(parsed.description);
      if (parsed.startsAt) {
        try {
          const startTime = new Date(parsed.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          parts.push(`Starts at ${startTime}`);
        } catch {}
      }

      tournamentMeta = parts.length > 0 ? parts.join(' • ') : 'Official Academy Lichess Arena';
      cleanMessage = parsed.description || tournamentMeta;
    } catch {
      // Fallback: clean any trailing JSON
      cleanMessage = 'Academy event updates and schedule details.';
    }
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-white border border-amber-200/80 shadow-sm p-4 text-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all">
      {/* Soft left accent strip */}
      <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-500 to-indigo-600" />

      <div className="flex items-start md:items-center gap-3.5 pl-2 z-10 min-w-0">
        <div className="w-10 h-10 rounded-xl bg-amber-50 border border-amber-200/70 text-amber-600 flex items-center justify-center text-xl shrink-0 shadow-xs">
          {isTournament ? '🏆' : '📣'}
        </div>
        <div className="min-w-0 space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 uppercase tracking-wider">
              {isTournament ? 'TOURNAMENT' : badge}
            </span>
            {date && <span className="text-[11px] text-slate-500 font-medium">{date}</span>}
          </div>
          <h4 className="text-sm font-bold text-slate-900 truncate">{title}</h4>
          {cleanMessage && (
            <p className="text-xs text-slate-600 line-clamp-1 font-medium">{cleanMessage}</p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 z-10 self-end md:self-auto">
        {customActionUrl && (
          <a
            href={customActionUrl}
            target={customActionUrl.startsWith('http') ? '_blank' : undefined}
            rel={customActionUrl.startsWith('http') ? 'noopener noreferrer' : undefined}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors"
          >
            <span>{actionLabel}</span>
          </a>
        )}
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="w-8 h-8 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-400 hover:text-slate-700 flex items-center justify-center text-xs transition-colors"
          title="Dismiss notification"
          aria-label="Dismiss notification"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
