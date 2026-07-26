import React from 'react';
import { fetchDailyPuzzle } from '@/lib/lichess';
import ChessWorkspace from '@/components/dashboard/ui/ChessWorkspace';

export const dynamic = 'force-dynamic';

export default async function StudentPuzzlesPage() {
  const result = await fetchDailyPuzzle();
  const puzzle = result.success && result.data ? result.data : null;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl border border-border shadow-card p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h3 className="text-base font-bold text-text-primary">
              Tactics Practice: Lichess Daily Puzzle
            </h3>
            <p className="text-xs text-text-secondary">
              Sharpen your middle-game tactics and endgame patterns with today&apos;s official Chess puzzle.
            </p>
          </div>
          {puzzle && (
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20 text-xs font-bold">
                Difficulty Rating: {puzzle.rating}
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-accent text-surface-dark text-xs font-bold shadow-gold">
                Type: {puzzle.title || 'Daily Tactics'}
              </span>
            </div>
          )}
        </div>

        {puzzle ? (
          <div className="space-y-4">
            <ChessWorkspace initialFen={puzzle.fen} />
            <div className="p-4 bg-slate-50 border border-border rounded-2xl space-y-2 mt-4">
              <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Solution Clues & Info</span>
              <p className="text-xs text-text-primary leading-relaxed">
                Try to solve it move-by-move. If you get stuck, click the <strong>Ask Stockfish</strong> button to trigger live engine evaluations.
              </p>
              <div className="text-[11px] text-text-secondary font-mono">
                Puzzle ID: <span className="font-bold">{puzzle.id}</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-8 text-center bg-slate-50 border border-dashed border-border rounded-2xl">
            <p className="text-xs text-text-secondary italic">
              Lichess daily puzzle is temporarily unavailable. Check back shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
