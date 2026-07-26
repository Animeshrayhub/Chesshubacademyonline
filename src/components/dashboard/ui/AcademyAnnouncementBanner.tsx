'use client';

import React, { useState } from 'react';

interface AcademyAnnouncementBannerProps {
  title?: string;
  message?: string;
  date?: string;
  badge?: string;
}

export default function AcademyAnnouncementBanner({
  title = '🏆 Upcoming Academy Blitz Championship!',
  message = 'Join our weekly Lichess arena tournament this Sunday at 5:00 PM IST. Prizes for top 3 rankers!',
  date = 'Sunday, 5:00 PM IST',
  badge = 'ACADEMY EVENT',
}: AcademyAnnouncementBannerProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-indigo-600 to-purple-600 rounded-2xl p-4 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-4 relative overflow-hidden">
      {/* Subtle shine effect */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-xl pointer-events-none"></div>

      <div className="flex items-center gap-3 z-10">
        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner shrink-0">
          📣
        </div>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-extrabold bg-white/20 border border-white/30 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
              {badge}
            </span>
            <span className="text-xs text-amber-200 font-bold">{date}</span>
          </div>
          <h4 className="text-sm font-bold leading-snug">{title}</h4>
          <p className="text-xs text-white/90 font-medium">{message}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 z-10">
        <a
          href="/dashboard/student/tournaments"
          className="px-4 py-2 bg-white text-slate-950 hover:bg-slate-100 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 whitespace-nowrap"
        >
          🏆 View Details
        </a>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="w-8 h-8 rounded-xl bg-black/20 hover:bg-black/40 text-white font-bold flex items-center justify-center text-sm transition-colors"
          title="Dismiss Announcement"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
