'use client';

import React from 'react';

interface WeakMotif {
  name: string;
  accuracy: number;
  missedCount: number;
  icon: string;
}

interface AiBlunderRadarWidgetProps {
  /** Real weak motifs derived from puzzle_results DB records. Empty array = new student with no history. */
  weakMotifs?: WeakMotif[];
  onStartRetry?: (motif: string) => void;
  onOpenStressTest?: () => void;
}

/**
 * AiBlunderRadarWidget
 *
 * Displays the student's weakest tactical themes based on real puzzle_results data.
 * Previously contained hardcoded fake motifs (Pin Tactics 58%, Knight Forks 64%, etc.) — removed.
 * Now accepts real motifs as props; shows empty state when the student has no history yet.
 */
export default function AiBlunderRadarWidget({
  weakMotifs = [],
  onStartRetry,
  onOpenStressTest,
}: AiBlunderRadarWidgetProps) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl select-none">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex items-center justify-center text-lg shadow-md">
            🎯
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-white">
              AI Tactical Blunder Radar
            </h3>
            <p className="text-xs text-slate-400">
              Identified weak motifs from your recent games &amp; puzzles
            </p>
          </div>
        </div>

        {onOpenStressTest && (
          <button
            type="button"
            onClick={onOpenStressTest}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-gold transition-all self-start sm:self-auto"
          >
            ⚡ 30s Stress Test
          </button>
        )}
      </div>

      {weakMotifs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-6 gap-3 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-2xl">
            🧠
          </div>
          <div>
            <p className="text-sm font-bold text-slate-300">No blunder data yet</p>
            <p className="text-xs text-slate-500 max-w-xs mt-1">
              Solve puzzles to build your tactical profile. Your weak motifs will appear here after your first sessions.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {weakMotifs.map((motif) => (
              <div
                key={motif.name}
                className="bg-slate-950 border border-slate-800/80 rounded-2xl p-3.5 space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <span>{motif.icon}</span>
                    <span>{motif.name}</span>
                  </span>
                  <span className="font-mono text-red-400 font-bold">{motif.accuracy}%</span>
                </div>

                <div className="w-full bg-slate-900 h-1.5 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-red-500 to-amber-400 h-full rounded-full"
                    style={{ width: `${motif.accuracy}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{motif.missedCount} missed recently</span>
                  <button
                    type="button"
                    onClick={() => onStartRetry?.(motif.name)}
                    className="text-amber-400 hover:text-amber-300 font-semibold underline underline-offset-2"
                  >
                    Retry →
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <span>🧠</span>
              <span>AI Insight: Rushing moves under 3s increases blunder rate by 40%. Take 5s to check king safety!</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}
