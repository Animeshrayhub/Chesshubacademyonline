'use client';

import React from 'react';
import type { DbHomeworkProgress } from '@/types/homework-puzzles';
import { UNLOCK_THRESHOLD } from '@/types/homework-puzzles';

interface HomeworkProgressCardProps {
  progress: DbHomeworkProgress | null;
  chapterTitle?: string;
  workbookTitle?: string;
  className?: string;
}

export default function HomeworkProgressCard({
  progress, chapterTitle, workbookTitle, className = '',
}: HomeworkProgressCardProps) {
  if (!progress) {
    return (
      <div className={`p-4 bg-slate-50 border border-dashed border-border rounded-xl text-center ${className}`}>
        <p className="text-xs text-text-secondary italic">No puzzle progress recorded yet.</p>
      </div>
    );
  }

  const {
    total_puzzles, solved_puzzles, failed_puzzles,
    total_score, accuracy, avg_time_seconds, total_hints_used, status,
  } = progress;

  const isPassed = accuracy >= UNLOCK_THRESHOLD;

  return (
    <div className={`bg-white rounded-2xl border border-border p-5 shadow-card ${className}`}>
      {chapterTitle && (
        <div className="mb-4 pb-3 border-b border-border">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">{workbookTitle || 'Workbook'}</span>
          <h4 className="text-sm font-bold text-text-primary">{chapterTitle}</h4>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 mb-4">
        <div>
          <div className="text-[11px] font-bold text-text-secondary uppercase">Accuracy</div>
          <div className={`text-2xl font-extrabold mt-0.5 ${accuracy >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
            {accuracy}%
          </div>
        </div>

        <div className="text-right">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
            status === 'passed' ? 'bg-emerald-100 text-emerald-800' :
            status === 'failed' ? 'bg-red-100 text-red-800' :
            status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
            'bg-slate-100 text-slate-700'
          }`}>
            {status === 'passed' ? 'Passed ✅' :
             status === 'failed' ? 'Retry Required ⚠️' :
             status === 'in_progress' ? 'In Progress ⏳' : 'Not Started'}
          </span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-4 flex">
        <div
          className="bg-emerald-500 h-full transition-all"
          style={{ width: `${(solved_puzzles / (total_puzzles || 1)) * 100}%` }}
        />
        <div
          className="bg-red-400 h-full transition-all"
          style={{ width: `${(failed_puzzles / (total_puzzles || 1)) * 100}%` }}
        />
      </div>

      {/* Grid Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-slate-50 p-2.5 rounded-xl border border-border">
          <div className="text-[10px] text-text-secondary font-bold uppercase">Solved</div>
          <div className="font-bold text-text-primary mt-0.5">{solved_puzzles} / {total_puzzles}</div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-border">
          <div className="text-[10px] text-text-secondary font-bold uppercase">Score</div>
          <div className="font-bold text-primary mt-0.5">{total_score} pts</div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-border">
          <div className="text-[10px] text-text-secondary font-bold uppercase">Avg Time</div>
          <div className="font-bold text-text-primary mt-0.5">{Math.round(avg_time_seconds)}s</div>
        </div>

        <div className="bg-slate-50 p-2.5 rounded-xl border border-border">
          <div className="text-[10px] text-text-secondary font-bold uppercase">Hints Used</div>
          <div className="font-bold text-amber-600 mt-0.5">{total_hints_used}</div>
        </div>
      </div>

      {/* Chapter Unlock Banner */}
      <div className={`mt-4 p-3 rounded-xl text-xs flex items-center justify-between ${
        isPassed ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-slate-50 text-slate-700 border border-border'
      }`}>
        <div className="flex items-center gap-2 font-medium">
          <span>{isPassed ? '🔓' : '🔒'}</span>
          <span>Next Chapter Access</span>
        </div>
        <span className="font-bold">
          {isPassed ? 'Unlocked (≥90%)' : `Requires 90% (Current: ${accuracy}%)`}
        </span>
      </div>
    </div>
  );
}
