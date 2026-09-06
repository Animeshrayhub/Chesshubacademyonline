'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { playDailyChime, speakCheer } from '@/utils/kidAudio';
import { PETS } from '@/features/student/KidsPetCompanionCard';

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
  shields: number;
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
  equippedPet = 'dragon',
}: DailyLoginCelebrationModalProps) {
  const [confettiPieces, setConfettiPieces] = useState<
    { id: number; left: number; color: string; delay: number; duration: number; size: number }[]
  >([]);

  const pet = PETS.find((p) => p.id === equippedPet) || PETS[0];

  useEffect(() => {
    if (!isOpen) return;

    // Play sparkling chime sound
    playDailyChime();

    // Friendly vocal cheer
    const timer = setTimeout(() => {
      speakCheer(`Welcome back, ${studentName}! Day ${streak} attendance checked in!`);
    }, 250);

    // Generate confetti pieces
    const colors = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#3b82f6', '#eab308'];
    const pieces = Array.from({ length: 36 }).map((_, i) => ({
      id: i,
      left: Math.random() * 100,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 0.8,
      duration: 1.8 + Math.random() * 1.5,
      size: 6 + Math.random() * 8,
    }));
    setConfettiPieces(pieces);

    return () => clearTimeout(timer);
  }, [isOpen, studentName, streak]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      {/* Falling Confetti Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {confettiPieces.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-sm animate-fall"
            style={{
              left: `${p.left}%`,
              top: '-20px',
              backgroundColor: p.color,
              width: `${p.size}px`,
              height: `${p.size * 1.4}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              opacity: 0.9,
            }}
          />
        ))}
      </div>

      {/* Modal Container */}
      <div className="relative w-full max-w-md rounded-3xl border-2 border-amber-400/50 bg-gradient-to-b from-slate-900 via-indigo-950 to-slate-950 p-6 shadow-[0_0_60px_rgba(245,158,11,0.35)] text-center text-white overflow-hidden animate-scale-up">
        {/* Glow ambient circle */}
        <div className="absolute -top-16 -right-16 w-44 h-44 bg-amber-500/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-purple-500/25 rounded-full blur-3xl pointer-events-none" />

        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center text-sm font-bold transition-all z-20"
        >
          ✕
        </button>

        {/* Header Ribbon */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/20 border border-amber-400/50 text-amber-300 text-xs font-black uppercase tracking-wider mb-4 shadow-sm">
          <span>☀️ DAILY CHECK-IN COMPLETE</span>
        </div>

        {/* Companion Avatar & Dialogue */}
        <div className="flex flex-col items-center gap-2 mb-4 relative z-10">
          <div
            className={`w-20 h-20 rounded-2xl border-2 flex items-center justify-center text-4xl shadow-xl transition-transform hover:scale-105 ${pet.avatarRing}`}
          >
            {pet.emoji}
          </div>

          <div className="relative mt-1 px-4 py-2 rounded-2xl bg-slate-950/80 border border-slate-800 max-w-xs shadow-md">
            {/* Speech bubble tail */}
            <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-950 border-t border-l border-slate-800 rotate-45" />
            <p className="text-xs text-slate-200 font-medium italic relative z-10">
              &ldquo;Welcome back, {studentName}! Day {streak} Attendance secured! Let&apos;s conquer today&apos;s tactics!&rdquo;
            </p>
            <span className="text-[10px] text-amber-400 font-bold block pt-0.5">
              — {pet.name}
            </span>
          </div>
        </div>

        {/* Rewards Breakdown Card */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-amber-500/30 space-y-3 mb-5 text-left relative z-10">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">🔥</span>
              <div>
                <span className="text-xs font-black text-amber-300 block">
                  {streak} Day Daily Streak
                </span>
                <span className="text-[10px] text-slate-400">Consecutive attendance on site</span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
              Locked In
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-lg">⚡</span>
              <div>
                <span className="text-xs font-black text-yellow-400 block">
                  +{xpEarned} Academy XP
                </span>
                <span className="text-[10px] text-slate-400">Added to your real XP account</span>
              </div>
            </div>
            <span className="text-xs font-black text-yellow-400 font-mono">
              ✓ EARNED
            </span>
          </div>

          {/* If shield was used */}
          {wasProtected && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 text-xs font-semibold">
              <span>🛡️</span>
              <span>Streak Shield Used! Your streak was preserved from yesterday.</span>
            </div>
          )}

          {/* If Milestone Unlocked */}
          {unlockedMilestone && (
            <div className="p-2.5 rounded-xl bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border border-amber-400/60 text-amber-300 space-y-1">
              <div className="flex items-center gap-1.5 font-black text-xs">
                <span>🎉</span>
                <span>MILESTONE UNLOCKED: {unlockedMilestone.title}!</span>
              </div>
              <p className="text-[11px] text-slate-200">
                Bonus Reward: <span className="font-bold text-yellow-400">+{unlockedMilestone.bonusXp} XP</span> &amp;{' '}
                <span className="font-bold text-indigo-300">🛡️ +{unlockedMilestone.bonusShields} Streak Shield</span>!
              </p>
            </div>
          )}

          {/* Puzzle prompt */}
          <div className="flex items-center gap-2 pt-0.5 text-[11px] text-slate-300">
            <span>💡</span>
            <span>
              Tip: Solve today&apos;s daily tactical puzzle for an extra{' '}
              <strong className="text-amber-300">+10 XP bonus</strong>!
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5 relative z-10">
          <Link
            href="/dashboard/student/puzzles"
            onClick={onClose}
            className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-300 hover:via-yellow-300 hover:to-orange-400 text-slate-950 font-black text-xs rounded-2xl shadow-gold active:scale-95 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
          >
            <span>🧩</span>
            <span>SOLVE TODAY&apos;S PUZZLE (+10 XP) ➔</span>
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-2xl transition-all"
          >
            Awesome, Let&apos;s Play! ➔
          </button>
        </div>
      </div>
    </div>
  );
}
