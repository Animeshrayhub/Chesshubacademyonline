'use client';

import React, { useState } from 'react';

interface DailyPuzzle {
  id: string;
  title: string;
  fen: string;
  solution: string;
  rating: number;
  solved: boolean;
}

export default function DailyPuzzleChallengeWidget() {
  const [puzzles, setPuzzles] = useState<DailyPuzzle[]>([
    {
      id: 'p1',
      title: 'Back-Rank Mate Threat',
      fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
      solution: 'Rb8#',
      rating: 1100,
      solved: true,
    },
    {
      id: 'p2',
      title: 'Knight Fork Attack',
      fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/4n3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
      solution: 'Nxe5',
      rating: 1250,
      solved: false,
    },
    {
      id: 'p3',
      title: 'Pin & Sacrifice Tactics',
      fen: 'r2q1rk1/ppp2ppp/2n5/3p4/3P4/2PB1Q2/P1P2PPP/R4RK1 w - - 0 1',
      solution: 'Bxh7+',
      rating: 1400,
      solved: false,
    },
  ]);

  const solvedCount = puzzles.filter((p) => p.solved).length;

  const handleSolvePuzzle = (id: string) => {
    setPuzzles((prev) =>
      prev.map((p) => (p.id === id ? { ...p, solved: true } : p))
    );
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl select-none">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg shadow-gold">
            🔥
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-white">
              Daily 3-Puzzle Challenge Streak
            </h3>
            <p className="text-xs text-slate-400">
              Solve today&apos;s 3 tailored puzzles to maintain your daily streak!
            </p>
          </div>
        </div>

        <div className="px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 font-mono text-xs font-bold rounded-xl">
          {solvedCount} / 3 Solved
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {puzzles.map((p, idx) => (
          <div
            key={p.id}
            className={`p-3.5 rounded-2xl border transition-all ${
              p.solved
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-200'
                : 'bg-slate-950 border-slate-800 hover:border-amber-400/50 text-white'
            }`}
          >
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-bold text-amber-400">Puzzle #{idx + 1}</span>
              <span className="font-mono text-[10px] text-slate-400">{p.rating} Elo</span>
            </div>

            <p className="text-xs font-semibold mb-2">{p.title}</p>

            {p.solved ? (
              <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                <span>✅ Solved (+50 XP)</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={() => handleSolvePuzzle(p.id)}
                className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-[11px] transition-all shadow-gold"
              >
                Solve Challenge
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
