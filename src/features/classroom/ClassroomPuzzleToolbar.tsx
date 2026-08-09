'use client';

import React from 'react';
import type { TeachingPosition } from '@/types/curriculum.types';

interface ClassroomPuzzleToolbarProps {
  currentPosition: TeachingPosition | null;
  totalPositions: number;
  currentIndex: number;
  onPrev: () => void;
  onNext: () => void;
  onReset: () => void;
  solverMode: 'auto_reply' | 'free_move';
  onToggleSolverMode: (mode: 'auto_reply' | 'free_move') => void;
  hintsEnabled: boolean;
  onToggleHints: () => void;
  revealSolution: boolean;
  onToggleRevealSolution: () => void;
  onPushToStudents?: () => void;
  isPushing?: boolean;
}

export default function ClassroomPuzzleToolbar({
  currentPosition,
  totalPositions,
  currentIndex,
  onPrev,
  onNext,
  onReset,
  solverMode,
  onToggleSolverMode,
  hintsEnabled,
  onToggleHints,
  revealSolution,
  onToggleRevealSolution,
  onPushToStudents,
  isPushing,
}: ClassroomPuzzleToolbarProps) {
  if (!currentPosition) return null;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-3 shadow-xl text-white select-none flex flex-wrap items-center justify-between gap-3">
      {/* Left: Position Title & Index Badge */}
      <div className="flex items-center gap-3">
        <span className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/30">
          #{currentIndex + 1}/{totalPositions > 0 ? totalPositions : 1}
        </span>

        <div>
          <h4 className="font-heading font-extrabold text-xs text-white truncate max-w-[200px] sm:max-w-[280px]">
            {currentPosition.title}
          </h4>
          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400">
            <span className="px-1.5 py-0.2 rounded bg-slate-800 font-semibold">{currentPosition.difficulty}</span>
            {currentPosition.theme && <span className="text-amber-400">&bull; {currentPosition.theme}</span>}
          </div>
        </div>
      </div>

      {/* Middle: Navigation Controls */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={onPrev}
          disabled={currentIndex <= 0}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center gap-1"
          title="Previous Puzzle"
        >
          <span>⏮️</span>
          <span className="hidden sm:inline">Prev</span>
        </button>

        <button
          type="button"
          onClick={onReset}
          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all flex items-center gap-1"
          title="Reset Position FEN"
        >
          <span>🔄</span>
          <span className="hidden sm:inline">Reset</span>
        </button>

        <button
          type="button"
          onClick={onNext}
          disabled={currentIndex >= totalPositions - 1}
          className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-30 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-gold flex items-center gap-1"
          title="Next Puzzle"
        >
          <span className="hidden sm:inline">Next</span>
          <span>⏭️</span>
        </button>
      </div>

      {/* Right: Coach Mode Toggles & Push Button */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Solver Mode Choice */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 text-[10px] font-bold">
          <button
            type="button"
            onClick={() => onToggleSolverMode('auto_reply')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              solverMode === 'auto_reply'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-gold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            ⚡ Auto Reply
          </button>
          <button
            type="button"
            onClick={() => onToggleSolverMode('free_move')}
            className={`px-2.5 py-1 rounded-lg transition-all ${
              solverMode === 'free_move'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-gold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            🎯 Free Practice
          </button>
        </div>

        {/* Reveal Solution Toggle */}
        <button
          type="button"
          onClick={onToggleRevealSolution}
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
            revealSolution
              ? 'bg-emerald-950 border-emerald-500/50 text-emerald-300'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Reveal Solution SAN Moves"
        >
          👁️ {revealSolution ? 'Hide Sol' : 'Reveal'}
        </button>

        {/* Hints Toggle */}
        <button
          type="button"
          onClick={onToggleHints}
          className={`px-2.5 py-1.5 rounded-xl border text-xs font-bold transition-all ${
            hintsEnabled
              ? 'bg-amber-950 border-amber-500/50 text-amber-300'
              : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
          }`}
          title="Enable/Disable Student Get Hint button"
        >
          💡 {hintsEnabled ? 'Hints On' : 'Hints Off'}
        </button>

        {/* Push to Live Student Boards */}
        {onPushToStudents && (
          <button
            type="button"
            onClick={onPushToStudents}
            disabled={isPushing}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-extrabold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5"
          >
            <span>📡</span>
            <span>{isPushing ? 'Pushing...' : 'Push to Board'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
