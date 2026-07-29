'use client';

import React from 'react';
import type { AiGameReviewResult } from '@/lib/gameReview/aiGameReviewService';

interface AiGameReviewCardProps {
  review: AiGameReviewResult;
}

export default function AiGameReviewCard({ review }: AiGameReviewCardProps) {
  if (!review.success) return null;

  const score = review.accuracyScore || 80;
  const scoreColor =
    score >= 85 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' :
    score >= 70 ? 'text-amber-400 border-amber-500/30 bg-amber-500/10' :
    'text-red-400 border-red-500/30 bg-red-500/10';

  return (
    <div className="space-y-6">
      {/* Overview & Score Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative overflow-hidden space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl shadow-gold">
              🤖
            </div>
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                FIDE AI Grandmaster Report
              </span>
              <h3 className="font-heading font-extrabold text-lg text-white">
                {review.openingName || 'Chess Game Analysis'}
              </h3>
            </div>
          </div>

          <div className={`px-4 py-2 rounded-2xl border ${scoreColor} flex items-center gap-2 self-start sm:self-auto`}>
            <span className="text-[10px] font-bold uppercase tracking-wider">Accuracy Score:</span>
            <span className="text-xl font-extrabold font-mono">{score}%</span>
          </div>
        </div>

        <div className="bg-slate-950/80 border border-slate-800/80 p-4 rounded-2xl text-xs text-slate-300 leading-relaxed">
          <p className="font-bold text-white mb-1 flex items-center gap-1.5">
            <span>💬 Grandmaster Summary:</span>
          </p>
          <p>{review.gameSummary}</p>
        </div>
      </div>

      {/* Best Move & Blunder Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Best Move */}
        {review.bestMove && (
          <div className="bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-heading font-bold text-xs text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>🌟 Best Move Highlight</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono text-xs font-bold">
                Move {review.bestMove.moveNumber}: {review.bestMove.san}
              </span>
            </div>

            <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800/80 font-mono text-[11px] text-amber-200/90 truncate">
              FEN: {review.bestMove.fen}
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {review.bestMove.description}
            </p>
          </div>
        )}

        {/* Key Blunder */}
        {review.keyBlunder && (
          <div className="bg-slate-900 border border-red-500/30 rounded-3xl p-6 space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="font-heading font-bold text-xs text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                <span>⚠️ Critical Blunder / Opportunity</span>
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/30 text-red-300 font-mono text-xs font-bold">
                Move {review.keyBlunder.moveNumber}: {review.keyBlunder.san}
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              {review.keyBlunder.description}
            </p>

            {review.keyBlunder.alternativeMove && (
              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs flex items-center justify-between text-slate-400">
                <span>Better Alternative:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {review.keyBlunder.alternativeMove}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Key Tactical Lesson Box */}
      {review.tacticalLesson && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-6 space-y-2">
          <h4 className="font-heading font-bold text-xs text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
            <span>🎯 Key Tactical Lesson to Practice</span>
          </h4>
          <p className="text-xs text-slate-200 leading-relaxed font-medium">
            {review.tacticalLesson}
          </p>
        </div>
      )}
    </div>
  );
}
