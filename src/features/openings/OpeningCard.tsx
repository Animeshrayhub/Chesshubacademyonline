'use client';

import React from 'react';
import Link from 'next/link';
import type { OpeningWithProgress } from '@/types/opening-teacher';
import { MASTERY_LABELS, MASTERY_COLORS } from '@/types/opening-teacher';

interface OpeningCardProps {
  opening: OpeningWithProgress;
  className?: string;
}

const STYLE_ICONS: Record<string, string> = {
  Tactical: '⚔️',
  Positional: '🏰',
  Aggressive: '🔥',
  Solid: '🛡️',
  Universal: '♾️',
};

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
  Intermediate: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  Advanced: 'text-red-400 bg-red-500/10 border-red-500/30',
};

const COLOR_ICONS: Record<string, string> = {
  white: '⬜',
  black: '⬛',
  both: '🔲',
};

export default function OpeningCard({ opening, className = '' }: OpeningCardProps) {
  const progress = opening.progress;
  const scores = opening.scores;
  const mastery = progress?.mastery_level ?? 'not_started';
  const overallScore = scores?.overall_score ?? progress?.overall_score ?? 0;
  const chaptersCompleted = opening.chapters?.filter(c => c.progress?.status === 'completed').length ?? 0;
  const totalChapters = opening.chapters?.length ?? 8;

  const href = `/dashboard/student/openings/${opening.id}`;

  return (
    <Link href={href} className={`group block ${className}`}>
      <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/60 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-500/50 hover:shadow-[0_0_30px_rgba(59,130,246,0.15)] hover:-translate-y-0.5">

        {/* Top accent bar */}
        <div className={`h-0.5 w-full ${
          mastery === 'mastered' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
          mastery === 'strong'   ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
          mastery === 'familiar' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
          mastery === 'learning' ? 'bg-gradient-to-r from-blue-500 to-indigo-500' :
          'bg-slate-700'
        }`} />

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-mono text-slate-500">{opening.eco_code}</span>
                <span className="text-slate-600">·</span>
                <span className="text-xs">{COLOR_ICONS[opening.color]}</span>
                <span className="text-xs text-slate-400">{opening.color === 'both' ? 'Both Colors' : `Playing as ${opening.color}`}</span>
              </div>
              <h3 className="font-bold text-white text-base leading-tight group-hover:text-blue-200 transition-colors truncate">
                {opening.name}
              </h3>
              {opening.name_hindi && (
                <p className="text-xs text-slate-500 mt-0.5">{opening.name_hindi}</p>
              )}
            </div>

            {/* Style + Difficulty badges */}
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${DIFFICULTY_COLORS[opening.difficulty]}`}>
                {opening.difficulty}
              </span>
              <span className="text-xs text-slate-400">
                {STYLE_ICONS[opening.style]} {opening.style}
              </span>
            </div>
          </div>

          {/* Description */}
          {opening.description && (
            <p className="text-xs text-slate-400 leading-relaxed mb-4 line-clamp-2">
              {opening.description}
            </p>
          )}

          {/* Progress section */}
          <div className="space-y-2.5">
            {/* Chapter progress */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="text-slate-400">
                  {chaptersCompleted}/{totalChapters} chapters
                </span>
                <span className="text-slate-400">{overallScore}%</span>
              </div>
              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    mastery === 'mastered' ? 'bg-gradient-to-r from-purple-500 to-pink-500' :
                    mastery === 'strong'   ? 'bg-gradient-to-r from-emerald-500 to-teal-500' :
                    mastery === 'familiar' ? 'bg-gradient-to-r from-amber-500 to-orange-500' :
                    'bg-gradient-to-r from-blue-500 to-indigo-600'
                  }`}
                  style={{ width: `${Math.max(overallScore, totalChapters > 0 ? (chaptersCompleted / totalChapters) * 100 : 0)}%` }}
                />
              </div>
            </div>

            {/* Mastery badge + CTA */}
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${MASTERY_COLORS[mastery]}`}>
                {MASTERY_LABELS[mastery]}
              </span>

              <span className="text-xs font-semibold text-blue-400 group-hover:text-blue-300 flex items-center gap-1 transition-colors">
                {mastery === 'not_started' ? 'Start Learning' :
                 mastery === 'learning'    ? 'Continue' :
                 mastery === 'mastered'    ? 'Completed ✓' :
                 'Continue'}
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform">
                  <path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z" />
                </svg>
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
