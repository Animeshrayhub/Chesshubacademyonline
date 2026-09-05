'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStudentPuzzleStats } from '@/lib/puzzles/progress';

interface DailyStreakWidgetProps {
  currentStreak?: number;
  totalXp?: number;
  todaySolved?: boolean;
  /** ISO date strings (YYYY-MM-DD) on which the student solved at least one puzzle */
  solvedDates?: string[];
}

function getWeekDays(solvedDates: string[], isTodaySolved: boolean): { day: string; solved: boolean; isToday: boolean }[] {
  const solvedSet = new Set(solvedDates);
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const todayLoc = today.toLocaleDateString('en-CA');
  if (isTodaySolved) {
    solvedSet.add(todayIso);
    solvedSet.add(todayLoc);
  }

  const days = [];

  // Build Mon→Sun of the current week
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7)); // Monday of this week

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const loc = d.toLocaleDateString('en-CA');
    const dayName = d.toLocaleString('en-US', { weekday: 'short' });
    const isToday = iso === todayIso || loc === todayLoc;
    days.push({
      day: dayName,
      solved: solvedSet.has(iso) || solvedSet.has(loc),
      isToday,
    });
  }

  return days;
}

export default function DailyStreakWidget({
  currentStreak = 0,
  totalXp = 0,
  todaySolved = false,
  solvedDates = [],
}: DailyStreakWidgetProps) {
  const [solved, setSolved] = useState(todaySolved);
  const [streak, setStreak] = useState(currentStreak);
  const [xp, setXp] = useState(totalXp);
  const [activeSolvedDates, setActiveSolvedDates] = useState<string[]>(solvedDates);

  // Sync with incoming server props
  useEffect(() => {
    setSolved(todaySolved);
  }, [todaySolved]);

  useEffect(() => {
    setStreak(currentStreak);
  }, [currentStreak]);

  useEffect(() => {
    setXp(totalXp);
  }, [totalXp]);

  useEffect(() => {
    setActiveSolvedDates(solvedDates);
  }, [solvedDates]);

  // Client hydration check: check if student solved puzzles locally in current session
  useEffect(() => {
    try {
      const local = getStudentPuzzleStats();
      if (local) {
        if (local.currentStreak > streak) {
          setStreak(local.currentStreak);
        }
        if (local.xp > xp) {
          setXp(local.xp);
        }
        if (local.todaySolvedCount > 0) {
          setSolved(true);
        }
      }
    } catch {}
  }, []);

  const weekDays = getWeekDays(activeSolvedDates, solved);

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
              {streak > 0 ? (
                <span className="text-[10px] bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                  Active
                </span>
              ) : (
                <span className="text-[10px] bg-slate-800 border border-slate-700 text-slate-400 px-2 py-0.5 rounded-full font-medium">
                  Solve 1 to Start
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400">Solve daily tactics to keep your streak burning!</p>
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
                  : w.isToday
                  ? 'bg-indigo-950/70 border-indigo-500/50 text-indigo-300'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
              }`}
            >
              <span className={`text-[10px] font-bold uppercase ${w.isToday ? 'text-amber-300 font-extrabold' : ''}`}>
                {w.day}
              </span>
              <span className="text-xs">{w.solved ? '🔥' : w.isToday ? '⏳' : '⚪'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Daily Puzzle Solver Action */}
      <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-3">
        <div className="text-xs text-slate-300">
          {solved ? (
            <span className="text-emerald-400 font-bold flex items-center gap-1">
              ✓ Today&apos;s Tactical Practice Completed
            </span>
          ) : (
            <span className="text-amber-300 font-medium">Today&apos;s Tactical Challenge is ready!</span>
          )}
        </div>
        <Link
          href="/dashboard/student/puzzles"
          className={`px-4 py-2 font-bold text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 whitespace-nowrap ${
            solved
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/30'
              : 'bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-gold'
          }`}
        >
          {solved ? (
            <>
              <span>✓</span>
              <span>Train More Puzzles ➔</span>
            </>
          ) : (
            <>
              <span>🧩</span>
              <span>Solve Puzzle ➔</span>
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
