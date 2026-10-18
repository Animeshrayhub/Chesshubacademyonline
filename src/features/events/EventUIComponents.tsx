'use client';

import { useState, useEffect } from 'react';
import type { EventStatus } from '@/types/events';
import { computeEventDisplayStatus } from '@/types/events';

// ─── Status Badge ─────────────────────────────────────────────────────────────

interface EventStatusBadgeProps {
  status: EventStatus;
  startAt?: string | null;
  endAt?: string | null;
  rawImportData?: { minutes?: number } | Record<string, unknown> | null;
  className?: string;
}

export function EventStatusBadge({ status, startAt, endAt, rawImportData, className = '' }: EventStatusBadgeProps) {
  const displayStatus = computeEventDisplayStatus(status, startAt ?? null, endAt ?? null, rawImportData);

  const config: Record<string, { label: string; cls: string; dot: string }> = {
    UPCOMING: { label: 'Upcoming', cls: 'bg-blue-100 text-blue-700 border-blue-200', dot: 'bg-blue-500' },
    LIVE:     { label: '● Live',   cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500 animate-pulse' },
    COMPLETED:{ label: 'Completed',cls: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' },
    CANCELLED:{ label: 'Cancelled',cls: 'bg-red-100 text-red-600 border-red-200', dot: 'bg-red-400' },
    DRAFT:    { label: 'Draft',    cls: 'bg-amber-100 text-amber-700 border-amber-200', dot: 'bg-amber-400' },
    ARCHIVED: { label: 'Archived', cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' },
  };

  const c = config[displayStatus] ?? config.UPCOMING;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.cls} ${className}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}

// ─── Countdown Timer ──────────────────────────────────────────────────────────

interface EventCountdownProps {
  startAt: string;   // ISO UTC timestamp
  timezone?: string;
  compact?: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  expired: boolean;
}

function computeTimeLeft(startAt: string): TimeLeft {
  const diff = new Date(startAt).getTime() - Date.now();
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, expired: true };
  const days    = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours   = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  return { days, hours, minutes, seconds, expired: false };
}

export function EventCountdown({ startAt, timezone = 'Asia/Kolkata', compact = false }: EventCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => computeTimeLeft(startAt));

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(computeTimeLeft(startAt)), 1000);
    return () => clearInterval(id);
  }, [startAt]);

  if (timeLeft.expired) {
    return (
      <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
        🟢 Started
      </span>
    );
  }

  if (compact) {
    return (
      <span className="font-mono text-sm font-bold text-amber-600">
        {timeLeft.days > 0 ? `${timeLeft.days}d ` : ''}
        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </span>
    );
  }

  const units = [
    { label: 'Days',    value: timeLeft.days },
    { label: 'Hours',   value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds },
  ];

  return (
    <div className="flex items-center gap-2" aria-label={`Event starts in ${timeLeft.days} days ${timeLeft.hours} hours`}>
      {units.map((u, i) => (
        <div key={u.label} className="flex items-center gap-2">
          <div className="flex flex-col items-center">
            <div className="bg-slate-900 text-white rounded-xl px-3 py-2 min-w-[3.5rem] text-center">
              <span className="block text-xl font-mono font-black leading-none">
                {String(u.value).padStart(2, '0')}
              </span>
              <span className="text-[9px] text-slate-400 uppercase tracking-widest font-semibold mt-1 block">
                {u.label}
              </span>
            </div>
          </div>
          {i < units.length - 1 && (
            <span className="text-slate-500 font-bold text-lg leading-none mb-2">:</span>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Event Type Badge ─────────────────────────────────────────────────────────

interface EventTypeBadgeProps {
  eventType: string;
  className?: string;
}

export function EventTypeBadge({ eventType, className = '' }: EventTypeBadgeProps) {
  const config: Record<string, { label: string; emoji: string; cls: string }> = {
    LICHESS_TOURNAMENT:  { label: 'Lichess Tournament', emoji: '♟️', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
    INTERNAL_TOURNAMENT: { label: 'Academy Tournament', emoji: '🏆', cls: 'bg-purple-100 text-purple-800 border-purple-200' },
    WORKSHOP:            { label: 'Workshop',           emoji: '🎓', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
    MASTERCLASS:         { label: 'Masterclass',        emoji: '👑', cls: 'bg-indigo-100 text-indigo-800 border-indigo-200' },
    PUZZLE_CHALLENGE:    { label: 'Puzzle Challenge',   emoji: '🧩', cls: 'bg-green-100 text-green-800 border-green-200' },
    ANNOUNCEMENT:        { label: 'Announcement',       emoji: '📢', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  };

  const c = config[eventType] ?? { label: eventType, emoji: '📅', cls: 'bg-slate-100 text-slate-700 border-slate-200' };
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${c.cls} ${className}`}>
      <span>{c.emoji}</span> {c.label}
    </span>
  );
}
