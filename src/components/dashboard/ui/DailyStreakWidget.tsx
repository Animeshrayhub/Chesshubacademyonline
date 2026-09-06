'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStudentPuzzleStats } from '@/lib/puzzles/progress';
import { STREAK_MILESTONES } from '@/lib/puzzles/properties';

interface DailyStreakWidgetProps {
  currentStreak?: number;
  totalXp?: number;
  shields?: number;
  todaySolved?: boolean;
  todayLoggedIn?: boolean;
  /** ISO date strings (YYYY-MM-DD) on which the student was active (login or puzzle) */
  solvedDates?: string[];
  equippedPet?: string;
}

function getWeekDays(
  activeDates: string[],
  isTodayActive: boolean,
  isTodaySolved: boolean
): { day: string; dateStr: string; isActive: boolean; isToday: boolean; isSolved: boolean }[] {
  const activeSet = new Set(activeDates);
  const today = new Date();
  const todayIso = today.toISOString().split('T')[0];
  const todayLoc = today.toLocaleDateString('en-CA');
  if (isTodayActive) {
    activeSet.add(todayIso);
    activeSet.add(todayLoc);
  }

  const days = [];

  // Build Mon→Sun of current week
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((today.getDay() + 6) % 7));

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const iso = d.toISOString().split('T')[0];
    const loc = d.toLocaleDateString('en-CA');
    const dayName = d.toLocaleString('en-US', { weekday: 'short' });
    const isToday = iso === todayIso || loc === todayLoc;
    const isActive = activeSet.has(iso) || activeSet.has(loc);
    days.push({
      day: dayName,
      dateStr: iso,
      isActive,
      isToday,
      isSolved: isToday ? isTodaySolved : isActive,
    });
  }

  return days;
}

export default function DailyStreakWidget({
  currentStreak = 0,
  totalXp = 0,
  shields = 0,
  todaySolved = false,
  todayLoggedIn = true,
  solvedDates = [],
}: DailyStreakWidgetProps) {
  const [solved, setSolved] = useState(todaySolved);
  const [streak, setStreak] = useState(currentStreak);
  const [xp, setXp] = useState(totalXp);
  const [shieldCount, setShieldCount] = useState(shields);
  const [activeDates, setActiveDates] = useState<string[]>(solvedDates);
  const [showShieldTip, setShowShieldTip] = useState(false);

  // Synchronize incoming props
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
    setShieldCount(shields);
  }, [shields]);

  useEffect(() => {
    setActiveDates(solvedDates);
  }, [solvedDates]);

  // Client hydration check
  useEffect(() => {
    try {
      const local = getStudentPuzzleStats();
      if (local) {
        if (local.currentStreak > streak) setStreak(local.currentStreak);
        if (local.xp > xp) setXp(local.xp);
        if (local.todaySolvedCount > 0) setSolved(true);
      }
    } catch {}
  }, []);

  // Listen for real-time XP changes across the app
  useEffect(() => {
    const handleXpUpdate = (e: CustomEvent<{ xp?: number }>) => {
      if (typeof e.detail?.xp === 'number') {
        setXp(e.detail.xp);
      }
    };
    window.addEventListener('chesshub_xp_updated', handleXpUpdate as EventListener);
    return () => window.removeEventListener('chesshub_xp_updated', handleXpUpdate as EventListener);
  }, []);

  const weekDays = getWeekDays(activeDates, todayLoggedIn, solved);

  // Compute next milestone
  const nextMilestone =
    STREAK_MILESTONES.find((m) => m.days > streak) || STREAK_MILESTONES[STREAK_MILESTONES.length - 1];
  const prevMilestoneDays =
    [...STREAK_MILESTONES]
      .reverse()
      .find((m) => m.days <= streak)?.days || 0;
  const milestoneRange = Math.max(1, nextMilestone.days - prevMilestoneDays);
  const milestoneProgress = Math.min(
    100,
    Math.max(10, Math.round(((streak - prevMilestoneDays) / milestoneRange) * 100))
  );

  return (
    <div className="bg-gradient-to-br from-amber-500/10 via-slate-900 to-indigo-950 border-2 border-amber-500/30 rounded-3xl p-5 shadow-2xl text-white space-y-4 relative overflow-hidden">
      {/* Background glow circle */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-amber-500/20 rounded-full blur-2xl pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-emerald-500/15 rounded-full blur-2xl pointer-events-none" />

      {/* ── Header: Streak & Shields & XP ──────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-400/50 flex items-center justify-center text-2xl shadow-lg shadow-amber-950/50 animate-pulse">
            🔥
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-black text-base text-amber-300">
                {streak} Day Streak
              </h3>
              <span className="text-[10px] bg-emerald-500/25 border border-emerald-500/50 text-emerald-300 px-2 py-0.5 rounded-full font-extrabold uppercase tracking-wider shadow-sm">
                Active Today
              </span>
            </div>
            <p className="text-xs text-slate-300 font-medium">
              Daily check-ins & tactics keep your streak on fire!
            </p>
          </div>
        </div>

        {/* Shields & XP Badges */}
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex items-center gap-2">
            {/* Streak Shield Button / Tooltip */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowShieldTip(!showShieldTip)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold border transition-all ${
                  shieldCount > 0
                    ? 'bg-indigo-950/80 border-indigo-400/50 text-indigo-300 hover:bg-indigo-900/80 shadow-sm'
                    : 'bg-slate-900/80 border-slate-700/60 text-slate-400 hover:text-slate-300'
                }`}
              >
                <span>🛡️</span>
                <span>{shieldCount} Shield{shieldCount !== 1 ? 's' : ''}</span>
              </button>

              {showShieldTip && (
                <div className="absolute right-0 top-8 z-50 w-60 bg-slate-900 border border-indigo-500/40 rounded-2xl p-3 shadow-2xl text-xs space-y-1 text-left text-slate-200">
                  <div className="font-bold text-indigo-300 flex items-center gap-1">
                    <span>🛡️ Streak Shield Protection</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    If you miss a day, 1 Shield is consumed automatically to save your streak from resetting!
                  </p>
                  <p className="text-[10px] text-amber-300/90 font-semibold pt-1 border-t border-slate-800">
                    Earn free shields at 3, 7, 14, and 30-day streak milestones, or auto-unlock at 100 XP!
                  </p>
                </div>
              )}
            </div>

            {/* Academy XP */}
            <div className="px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono font-black text-xs shadow-sm">
              ⚡ {xp} XP
            </div>
          </div>
        </div>
      </div>

      {/* ── Dual-Status Daily Habit Checklists ────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 relative z-10">
        {/* Daily Attendance Item */}
        <div className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 border border-emerald-500/30">
          <div className="flex items-center gap-2">
            <span className="text-base">☀️</span>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Daily Attendance</span>
              <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                ✓ Check-in Complete (+15 XP)
              </span>
            </div>
          </div>
          <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 flex items-center justify-center text-[10px] font-black">
            ✓
          </span>
        </div>

        {/* Daily Tactical Puzzle Item */}
        <div
          className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all ${
            solved
              ? 'bg-slate-950/60 border-emerald-500/30'
              : 'bg-amber-950/20 border-amber-500/30 hover:border-amber-400/50'
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">♟️</span>
            <div>
              <span className="text-xs font-bold text-slate-200 block">Tactical Challenge</span>
              {solved ? (
                <span className="text-[10px] text-emerald-400 font-medium flex items-center gap-1">
                  ✓ Practice Solved (+10 XP)
                </span>
              ) : (
                <span className="text-[10px] text-amber-400 font-bold animate-pulse">
                  Ready (+10 XP Bonus)
                </span>
              )}
            </div>
          </div>
          {solved ? (
            <span className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-400/60 text-emerald-300 flex items-center justify-center text-[10px] font-black">
              ✓
            </span>
          ) : (
            <span className="w-5 h-5 rounded-full bg-amber-500/20 border border-amber-400/60 text-amber-300 flex items-center justify-center text-[10px] font-black">
              •
            </span>
          )}
        </div>
      </div>

      {/* ── 7-Day Mon→Sun Visual Attendance & Tactics Calendar ────────────── */}
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
            This Week&apos;s Activity Track
          </span>
          <span className="text-[10px] text-amber-400/90 font-bold">
            {weekDays.filter((w) => w.isActive).length}/7 Days Active
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 text-center">
          {weekDays.map((w, idx) => (
            <div
              key={idx}
              className={`p-2 rounded-2xl border flex flex-col items-center gap-1 transition-all ${
                w.isActive
                  ? 'bg-gradient-to-b from-amber-500/25 to-amber-950/40 border-amber-400/50 text-amber-300 shadow-sm'
                  : w.isToday
                  ? 'bg-indigo-950/70 border-indigo-400/60 text-indigo-200 ring-2 ring-indigo-500/30'
                  : 'bg-slate-950/60 border-slate-800 text-slate-500'
              }`}
            >
              <span
                className={`text-[10px] font-bold uppercase ${
                  w.isToday ? 'text-amber-300 font-black' : ''
                }`}
              >
                {w.day}
              </span>
              <span className="text-sm">
                {w.isActive ? '🔥' : w.isToday ? '☀️' : '⚪'}
              </span>
              <span
                className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                  w.isActive
                    ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
                    : w.isToday
                    ? 'bg-amber-400 animate-ping'
                    : 'bg-slate-700'
                }`}
              />
            </div>
          ))}
        </div>
      </div>

      {/* ── Streak Milestone Progress Gauge ─────────────────────────────────── */}
      <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5 relative z-10">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-300 font-bold flex items-center gap-1.5">
            <span>🎯 Next Goal:</span>
            <span className="text-amber-300 font-extrabold">{nextMilestone.title}</span>
          </span>
          <span className="text-[11px] text-yellow-400 font-mono font-extrabold">
            +{nextMilestone.bonusXp} XP & 🛡️ +{nextMilestone.bonusShields} Shield
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden relative">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 transition-all duration-700 shadow-gold"
            style={{ width: `${milestoneProgress}%` }}
          />
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span>
            {streak >= nextMilestone.days
              ? '★ Milestone Mastered!'
              : `${Math.max(1, nextMilestone.days - streak)} day${
                  nextMilestone.days - streak === 1 ? '' : 's'
                } remaining`}
          </span>
          <span>{streak} / {nextMilestone.days} Days</span>
        </div>
      </div>

      {/* ── Bottom Actions: Solve Tactics & Gear Shop ─────────────────────── */}
      <div className="pt-1 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5 relative z-10">
        <a
          href="#pet-gear"
          className="text-xs text-amber-300/80 hover:text-amber-200 font-bold flex items-center gap-1 transition-colors"
        >
          <span>🎩 Spend XP in Gear Shop ➔</span>
        </a>

        <Link
          href="/dashboard/student/puzzles"
          className={`px-4 py-2 font-black text-xs rounded-xl transition-all shadow-md active:scale-95 flex items-center gap-1.5 whitespace-nowrap ${
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
              <span>Solve Daily Tactics (+10 XP) ➔</span>
            </>
          )}
        </Link>
      </div>
    </div>
  );
}
