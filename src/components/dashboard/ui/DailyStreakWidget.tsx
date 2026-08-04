'use client';

import React, { useState } from 'react';

interface DailyStreakWidgetProps {
  currentStreak?: number;
  totalXp?: number;
  todaySolved?: boolean;
}

export default function DailyStreakWidget({
  currentStreak = 5,
  totalXp = 450,
  todaySolved = false,
}: DailyStreakWidgetProps) {
  const [solved, setSolved] = useState(todaySolved);
  const [streak, setStreak] = useState(currentStreak);
  const [xp, setXp] = useState(totalXp);

  const weekDays = [
    { day: 'Mon', solved: true },
    { day: 'Tue', solved: true },
    { day: 'Wed', solved: true },
    { day: 'Thu', solved: true },
    { day: 'Fri', solved: true },
    { day: 'Sat', solved: solved },
    { day: 'Sun', solved: false },
  ];

  const handleClaimDailyPuzzle = () => {
    if (!solved) {
      setSolved(true);
      setStreak((prev) => prev + 1);
      setXp((prev) => prev + 50);
    }
  };

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-indigo-950 border border-amber-500/30 rounded-3xl p-5 shadow-xl text-white space-y-4 relative overflow-hidden">
      {/* Background glow circle */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/20 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header with Streak Counter & XP */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-lg">
            🔥
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-amber-300 flex items-center gap-2">
              <span>{streak} Day Puzzle Streak</span>
              <span className="text-[10px] bg-amber-500/20 border border-amber-500/40 text-amber-300 px-2 py-0.5 rounded-full font-bold">
                Active
              </span>
            </h3>
            <p className="text-xs text-slate-400">Solve 1 puzzle daily to maintain your streak!</p>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Academy XP</span>
          <span className="text-sm font-extrabold text-yellow-400 font-mono flex items-center justify-end gap-1">
            ⚡ {xp} XP
          </span>
        </div>
      </div>

      {/* 7-Day Visual Calendar Tracker */}
      <div>
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
          This Week&apos;s Activity
        </span>
        <div className="grid grid-cols-7 gap-2 text-center">
          {weekDays.map((w, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                w.solved
                  ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-sm'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
              }`}
            >
              <span className="text-[10px] font-bold uppercase">{w.day}</span>
              <span className="text-xs">{w.solved ? '🔥' : '⚪'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Puzzle Solver Action */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-300">
          {solved ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              ✓ Today&apos;s Puzzle Completed (+50 XP)
            </span>
          ) : (
            <span className="text-amber-300 font-medium">Today&apos;s Tactical Puzzle is ready!</span>
          )}
        </div>
        {!solved ? (
          <a
            href="/dashboard/student/puzzles"
            onClick={handleClaimDailyPuzzle}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5"
          >
            <span>🧩 Solve Puzzle</span>
          </a>
        ) : (
          <a
            href="/dashboard/student/puzzles"
            className="text-[11px] bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 px-3 py-1 rounded-xl font-bold hover:bg-emerald-500/30 transition-colors"
          >
            ✓ Solve More Puzzles
          </a>
        )}
      </div>
    </div>
  );
}
