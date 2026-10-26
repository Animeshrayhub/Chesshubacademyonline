'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface StreakMilestone {
  days: number;
  bonusXp: number;
  bonusShields: number;
  title: string;
}

interface DailyLoginCelebrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  streak: number;
  xpEarned: number;
  shields?: number;
  wasProtected?: boolean;
  unlockedMilestone?: StreakMilestone | null;
  studentName?: string;
  equippedPet?: string;
}

export default function DailyLoginCelebrationModal({
  isOpen,
  onClose,
  streak = 1,
  xpEarned = 15,
  shields = 0,
  wasProtected = false,
  unlockedMilestone = null,
  studentName = 'Champion',
}: DailyLoginCelebrationModalProps) {
  const [isClaimed, setIsClaimed] = useState<boolean>(false);

  useEffect(() => {
    if (!isOpen) {
      setIsClaimed(false);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleClaim = () => {
    setIsClaimed(true);
    try {
      window.dispatchEvent(
        new CustomEvent('chesshub_xp_updated', {
          detail: { addedXp: xpEarned },
        })
      );
    } catch {}
  };

  const currentWeekDay = ((streak - 1) % 7) + 1;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-2xl text-slate-900 dark:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center justify-center text-xl">
              ☀️
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Daily Attendance
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Welcome back, {studentName}!
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-base transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* 7-Day Mini Track */}
        <div className="my-4">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 mb-2">
            <span className="font-medium">7-Day Streak</span>
            <span>Day {currentWeekDay} of 7</span>
          </div>
          <div className="grid grid-cols-7 gap-1.5 text-center">
            {Array.from({ length: 7 }).map((_, idx) => {
              const dayNum = idx + 1;
              const isPast = dayNum < currentWeekDay;
              const isToday = dayNum === currentWeekDay;
              const isDay7 = dayNum === 7;

              return (
                <div
                  key={dayNum}
                  className={`py-2 px-1 rounded-lg border text-xs font-semibold flex flex-col items-center justify-center gap-0.5 ${
                    isToday
                      ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                      : isPast
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                      : 'bg-slate-50 dark:bg-slate-800/50 text-slate-400 border-slate-200 dark:border-slate-800'
                  }`}
                >
                  <span className="text-[10px]">D{dayNum}</span>
                  <span className="text-xs">
                    {isDay7 ? '🎁' : isPast ? '✓' : isToday ? '🔥' : '·'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-3 my-4">
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
              <span>🔥</span>
              <span>Streak</span>
            </div>
            <div className="text-lg font-bold text-slate-900 dark:text-white">
              {streak} {streak === 1 ? 'Day' : 'Days'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400 text-xs mb-1">
              <span>⚡</span>
              <span>Reward</span>
            </div>
            <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
              +{xpEarned} XP
            </div>
          </div>
        </div>

        {/* Shield info if any */}
        {shields > 0 && (
          <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-cyan-50 dark:bg-cyan-950/30 border border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-300 text-xs">
            <span>🛡️</span>
            <span>Streak Shield active ({shields} {shields === 1 ? 'shield' : 'shields'})</span>
          </div>
        )}

        {wasProtected && (
          <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300 text-xs">
            <span>🛡️</span>
            <span>Your streak was saved yesterday by your streak shield.</span>
          </div>
        )}

        {unlockedMilestone && (
          <div className="p-3 mb-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
            <span className="font-bold">🎉 Milestone Unlocked: {unlockedMilestone.title}!</span>
            <p className="mt-0.5 text-slate-600 dark:text-slate-300">
              Bonus: +{unlockedMilestone.bonusXp} XP &amp; +{unlockedMilestone.bonusShields} Shield
            </p>
          </div>
        )}

        {/* Action Button */}
        <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800">
          {!isClaimed ? (
            <button
              type="button"
              onClick={handleClaim}
              className="w-full py-2.5 px-4 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm"
            >
              Claim Attendance Reward (+{xpEarned} XP)
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/student/puzzles"
                onClick={onClose}
                className="flex-1 py-2 px-3 text-center bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 font-semibold text-xs rounded-xl transition-colors"
              >
                Solve Daily Puzzle (+10 XP)
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium text-xs rounded-xl transition-colors"
              >
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
