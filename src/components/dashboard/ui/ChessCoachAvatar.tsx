'use client';

import React from 'react';
import Image from 'next/image';

export type CoachAvatarState =
  | 'idle'
  | 'puzzle_start'
  | 'thinking'
  | 'correct'
  | 'incorrect'
  | 'hint'
  | 'completed';

interface ChessCoachAvatarProps {
  state?: CoachAvatarState;
  customMessage?: string;
  className?: string;
  compact?: boolean;
}

const DEFAULT_MESSAGES: Record<CoachAvatarState, string> = {
  idle: "Let's solve this one!",
  puzzle_start: 'Your turn! Find the best move.',
  thinking: 'Take your time and calculate carefully.',
  incorrect: 'Almost! Try another move.',
  correct: "Excellent! That's the move!",
  completed: 'Great job! Puzzle solved!',
  hint: 'Look carefully for a forcing move.',
};

export default function ChessCoachAvatar({
  state = 'puzzle_start',
  customMessage,
  className = '',
  compact = false,
}: ChessCoachAvatarProps) {
  const message = customMessage || DEFAULT_MESSAGES[state] || DEFAULT_MESSAGES.puzzle_start;

  // Subtle accent tint on speech bubble based on puzzle state
  const stateStyles: Record<CoachAvatarState, { border: string; bg: string; text: string; badge: string }> = {
    idle: {
      border: 'border-slate-700/80 dark:border-slate-800',
      bg: 'bg-slate-100/90 dark:bg-slate-950/80',
      text: 'text-slate-800 dark:text-slate-200',
      badge: 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
    },
    puzzle_start: {
      border: 'border-indigo-500/30 dark:border-indigo-500/30',
      bg: 'bg-indigo-50/90 dark:bg-slate-950/80',
      text: 'text-indigo-950 dark:text-indigo-200',
      badge: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300',
    },
    thinking: {
      border: 'border-blue-500/30 dark:border-blue-500/30',
      bg: 'bg-blue-50/90 dark:bg-slate-950/80',
      text: 'text-blue-950 dark:text-blue-200',
      badge: 'bg-blue-500/20 text-blue-700 dark:text-blue-300',
    },
    correct: {
      border: 'border-emerald-500/40 dark:border-emerald-500/40',
      bg: 'bg-emerald-50/90 dark:bg-slate-950/80',
      text: 'text-emerald-950 dark:text-emerald-200',
      badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    },
    incorrect: {
      border: 'border-amber-500/40 dark:border-amber-500/40',
      bg: 'bg-amber-50/90 dark:bg-slate-950/80',
      text: 'text-amber-950 dark:text-amber-200',
      badge: 'bg-amber-500/20 text-amber-800 dark:text-amber-300',
    },
    hint: {
      border: 'border-purple-500/40 dark:border-purple-500/40',
      bg: 'bg-purple-50/90 dark:bg-slate-950/80',
      text: 'text-purple-950 dark:text-purple-200',
      badge: 'bg-purple-500/20 text-purple-700 dark:text-purple-300',
    },
    completed: {
      border: 'border-emerald-500/50 dark:border-emerald-500/50',
      bg: 'bg-emerald-50/90 dark:bg-slate-950/80',
      text: 'text-emerald-950 dark:text-emerald-200',
      badge: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300',
    },
  };

  const currentStyle = stateStyles[state] || stateStyles.puzzle_start;

  return (
    <div
      className={`flex items-center gap-3 select-none transition-all duration-300 motion-reduce:transition-none ${className}`}
      aria-live="polite"
    >
      {/* Coach Avatar Image (Transparent background preserved, no box/rectangle) */}
      <div className="relative flex-shrink-0 flex items-center justify-center">
        <div
          className={`relative ${
            compact
              ? 'h-16 w-16 sm:h-20 sm:w-20'
              : 'h-20 w-20 sm:h-24 sm:w-24 md:h-28 md:w-28 lg:h-32 lg:w-32'
          }`}
        >
          <Image
            src="/images/chesshub-coach-avatar.png"
            alt="ChessHub Academy Coach"
            fill
            sizes="(max-width: 640px) 80px, (max-width: 768px) 100px, 130px"
            className="object-contain drop-shadow-md transition-transform duration-300 motion-reduce:transition-none hover:scale-105"
            priority
          />
        </div>
      </div>

      {/* Speech / Message Card */}
      <div
        className={`relative flex-1 p-3 rounded-2xl border ${currentStyle.border} ${currentStyle.bg} backdrop-blur-xs shadow-sm transition-all duration-300 motion-reduce:transition-none`}
      >
        {/* Speech Bubble Arrow pointing left toward coach */}
        <div
          className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 border-l border-b ${currentStyle.border} ${currentStyle.bg}`}
          aria-hidden="true"
        />

        <div className="relative z-10 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${currentStyle.badge}`}
            >
              Coach Advice
            </span>
          </div>
          <p className={`text-xs font-bold leading-relaxed ${currentStyle.text}`}>
            &ldquo;{message}&rdquo;
          </p>
        </div>
      </div>
    </div>
  );
}
