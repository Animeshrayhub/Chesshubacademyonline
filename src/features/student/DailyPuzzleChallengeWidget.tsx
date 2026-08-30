'use client';

import React from 'react';
import Link from 'next/link';

/**
 * DailyPuzzleChallengeWidget
 *
 * Directs the student to the real puzzle trainer.
 * Previously contained 3 hardcoded fake puzzles — removed because they displayed
 * fictional FENs and solutions unrelated to any real student activity.
 * Real daily puzzles are served by the Lichess puzzle bank via the puzzle trainer.
 */
export default function DailyPuzzleChallengeWidget() {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg shadow-gold">
            🔥
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-white">
              Daily 3-Puzzle Challenge Streak
            </h3>
            <p className="text-xs text-slate-400">
              Solve today&apos;s puzzles from the live puzzle trainer to maintain your daily streak!
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-3xl">
          🧩
        </div>
        <div>
          <p className="text-sm font-bold text-white mb-1">Ready for Today&apos;s Challenges?</p>
          <p className="text-xs text-slate-400 max-w-xs">
            Your daily puzzles are loaded fresh from the puzzle trainer. Solve 3 to keep your streak alive!
          </p>
        </div>
        <Link
          href="/dashboard/student/puzzles"
          className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-black text-xs rounded-xl transition-all shadow-gold flex items-center gap-2"
        >
          <span>🧩</span>
          <span>Open Puzzle Trainer</span>
        </Link>
      </div>
    </div>
  );
}
