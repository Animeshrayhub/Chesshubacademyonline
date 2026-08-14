'use client';

import React from 'react';
import Link from 'next/link';
import type { DbStudentOpeningMistake } from '@/types/opening-teacher';

interface WeaknessPanelProps {
  mistakes: DbStudentOpeningMistake[];
  language?: 'en' | 'hi';
}

const MISTAKE_LABELS: Record<string, { label: string; label_hindi: string; icon: string; bg: string }> = {
  wrong_move:    { label: 'Theory Deviation', label_hindi: 'थ्योरी से भटकाव', icon: '♟️', bg: 'bg-amber-950/60 border-amber-800/40 text-amber-300' },
  illegal_move:  { label: 'Illegal Move',     label_hindi: 'गैर-कानूनी चाल', icon: '🚫', bg: 'bg-red-950/60 border-red-800/40 text-red-300' },
  missed_tactic: { label: 'Missed Tactic',   label_hindi: 'छूटा हुआ टैक्टिक', icon: '⚔️', bg: 'bg-purple-950/60 border-purple-800/40 text-purple-300' },
  wrong_plan:    { label: 'Wrong Strategic Plan', label_hindi: 'गलत रणनीतिक योजना', icon: '🧠', bg: 'bg-blue-950/60 border-blue-800/40 text-blue-300' },
  premature_move:{ label: 'Premature Advance', label_hindi: 'समय से पहले अग्रिम', icon: '⏳', bg: 'bg-orange-950/60 border-orange-800/40 text-orange-300' },
};

export default function WeaknessPanel({ mistakes, language = 'en' }: WeaknessPanelProps) {
  const isHindi = language === 'hi';
  const unresolved = mistakes.filter(m => !m.is_resolved);

  // Group mistakes by type
  const typeCounts = unresolved.reduce((acc, m) => {
    acc[m.mistake_type] = (acc[m.mistake_type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  if (unresolved.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-400">
        <div className="text-4xl mb-3">✨</div>
        <h3 className="text-lg font-bold text-white mb-1">
          {isHindi ? 'कोई अनसुलझी गलतियां नहीं!' : 'No Unresolved Weaknesses!'}
        </h3>
        <p className="text-sm">
          {isHindi
            ? 'शानदार काम! आपने अपनी सभी रिकॉर्ड की गई गलतियों में सुधार कर लिया है।'
            : 'Great job! You have successfully resolved all your recorded opening mistakes.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🧠</span>
            <h2 className="text-xl font-bold text-white">
              {isHindi ? 'कमजोरी और पुनरीक्षण केंद्र' : 'Weakness Memory & Revision'}
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {isHindi
              ? `${unresolved.length} स्थिति अभ्यास के लिए उपलब्ध हैं`
              : `${unresolved.length} custom revision exercises ready for practice`}
          </p>
        </div>

        <Link
          href="/dashboard/student/openings/revision"
          className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-medium text-sm rounded-xl transition-all shadow-lg shadow-amber-600/20 text-center flex items-center justify-center gap-2"
        >
          <span>🎯</span>
          <span>{isHindi ? 'कमजोरियों का अभ्यास करें' : 'Practice Weaknesses Now'}</span>
        </Link>
      </div>

      {/* Mistake Category Breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {Object.entries(typeCounts).map(([type, count]) => {
          const info = MISTAKE_LABELS[type] ?? { label: type, label_hindi: type, icon: '⚠️', bg: 'bg-slate-800 border-slate-700 text-slate-200' };
          return (
            <div key={type} className={`p-3 rounded-xl border ${info.bg}`}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-lg">{info.icon}</span>
                <span className="text-sm font-bold font-mono px-2 py-0.5 rounded-full bg-black/40">
                  {count}
                </span>
              </div>
              <p className="text-xs font-semibold truncate">
                {isHindi ? info.label_hindi : info.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Recent Mistake List */}
      <div className="space-y-2">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
          {isHindi ? 'हाल की गलतियां' : 'Recent Recorded Mistakes'}
        </h3>

        {unresolved.slice(0, 5).map((m) => {
          const info = MISTAKE_LABELS[m.mistake_type] ?? { label: m.mistake_type, icon: '⚠️', bg: 'bg-slate-800 text-slate-200' };
          return (
            <div
              key={m.id}
              className="flex items-center justify-between bg-slate-800/50 border border-slate-700/50 rounded-xl p-3 text-xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-base flex-shrink-0">{info.icon}</span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-blue-300 font-medium">
                      Played: {m.student_move}
                    </span>
                    <span className="text-slate-500">→</span>
                    <span className="font-mono text-emerald-300 font-medium">
                      Expected: {m.expected_move}
                    </span>
                  </div>
                  <p className="text-slate-500 font-mono text-[11px] truncate mt-0.5">
                    FEN: {m.position_fen}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-slate-400">
                  Attempts: <span className="font-bold text-white">{m.attempt_count}</span>
                </span>
                <span className="text-amber-400 font-medium">
                  {m.successful_recovery_count}/3 recovered
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
