'use client';

import React from 'react';
import { calculateStudentRank } from '@/lib/gamification/xpService';

interface StudentXpBadgeProps {
  totalXp?: number;
  streakDays?: number;
}

export default function StudentXpBadge({ totalXp = 750, streakDays = 5 }: StudentXpBadgeProps) {
  const rank = calculateStudentRank(totalXp);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg select-none">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-gold shrink-0">
          <span>{rank.badgeIcon}</span>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <span className="font-heading font-extrabold text-sm text-white">
              Level {rank.level} {rank.rankTitle}
            </span>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
              {rank.currentXp} XP
            </span>
          </div>

          <div className="w-48 sm:w-56 bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800 mt-1.5">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500"
              style={{ width: `${rank.progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs font-bold text-slate-300 self-end sm:self-auto">
        <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 text-emerald-400 font-mono">
          <span>🔥</span>
          <span>{streakDays} Day Streak</span>
        </div>
        <div className="px-2.5 py-1.5 rounded-xl bg-blue-950/80 border border-blue-800/80 text-blue-300 text-[11px]" title="Streak Shield Active">
          <span>🛡️ Shield ON</span>
        </div>
      </div>
    </div>
  );
}
