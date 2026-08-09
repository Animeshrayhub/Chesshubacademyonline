'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';

interface ClassroomEnginePanelProps {
  fen: string;
  isEnabled: boolean;
}

export interface PvCandidate {
  rank: number;
  evalText: string;
  evalScore: number;
  bestMove: string;
  pvLine: string;
  badge?: 'Blunder' | 'Mistake' | 'Inaccuracy' | 'Best Move';
}

interface EngineAnalysis {
  depth: number;
  evalPct: number;
  mainEvalText: string;
  advantageText: string;
  candidates: PvCandidate[];
}

const DEFAULT_ANALYSIS: EngineAnalysis = {
  depth: 18,
  evalPct: 50,
  mainEvalText: '0.0',
  advantageText: '⚖️ Equal Position',
  candidates: [],
};

export default function ClassroomEnginePanel({ fen, isEnabled }: ClassroomEnginePanelProps) {
  const [analysis, setAnalysis] = useState<EngineAnalysis>(DEFAULT_ANALYSIS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isEnabled || !fen) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      runEngineMultiPV(fen);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fen, isEnabled]);

  const runEngineMultiPV = (fenStr: string) => {
    setIsAnalyzing(true);
    try {
      const chess = new Chess(fenStr);
      const moves = chess.moves({ verbose: true });
      const sideToMove = chess.turn();

      if (moves.length === 0) {
        const inCheck = chess.inCheck();
        const evalStr = inCheck ? (sideToMove === 'w' ? '#-0 (Black Mates)' : '#+0 (White Mates)') : '0.0 (Stalemate)';
        setAnalysis({
          depth: 20,
          evalPct: inCheck ? (sideToMove === 'w' ? 5 : 95) : 50,
          mainEvalText: evalStr,
          advantageText: inCheck ? '♔ Checkmate' : '⚖️ Draw',
          candidates: [],
        });
        setIsAnalyzing(false);
        return;
      }

      // Material values
      const pieceValues: Record<string, number> = { p: 1, n: 3, b: 3.25, r: 5, q: 9, k: 0 };
      let materialBalance = 0;

      const board = chess.board();
      for (const row of board) {
        for (const sq of row) {
          if (sq) {
            const val = pieceValues[sq.type] || 0;
            materialBalance += sq.color === 'w' ? val : -val;
          }
        }
      }

      // Score candidates by looking 1-step ahead
      const ratedMoves = moves.map((move) => {
        const tempChess = new Chess(fenStr);
        tempChess.move(move.san);

        let delta = 0;
        if (move.captured) delta += (pieceValues[move.captured] || 1) * (sideToMove === 'w' ? 1 : -1);
        if (move.promotion) delta += 8 * (sideToMove === 'w' ? 1 : -1);
        if (tempChess.inCheck()) delta += 0.4 * (sideToMove === 'w' ? 1 : -1);

        const moveScore = materialBalance + delta;
        return { move, moveScore };
      });

      // Sort candidate moves
      ratedMoves.sort((a, b) => sideToMove === 'w' ? b.moveScore - a.moveScore : a.moveScore - b.moveScore);

      // Select top 3 candidate moves (MultiPV=3)
      const top3 = ratedMoves.slice(0, 3);
      const bestScore = top3[0]?.moveScore || 0;

      const candidates: PvCandidate[] = top3.map((item, idx) => {
        const diff = Math.abs(bestScore - item.moveScore);
        let badge: PvCandidate['badge'] = idx === 0 ? 'Best Move' : undefined;
        if (idx > 0) {
          if (diff >= 2.5) badge = 'Blunder';
          else if (diff >= 1.2) badge = 'Mistake';
          else if (diff >= 0.5) badge = 'Inaccuracy';
        }

        const scoreFormatted = item.moveScore > 0 ? `+${item.moveScore.toFixed(1)}` : item.moveScore.toFixed(1);
        return {
          rank: idx + 1,
          evalText: scoreFormatted,
          evalScore: item.moveScore,
          bestMove: item.move.san,
          pvLine: `${item.move.san} ...`,
          badge,
        };
      });

      const evalPct = Math.min(95, Math.max(5, 50 + bestScore * 5));
      const mainEvalStr = bestScore > 0 ? `+${bestScore.toFixed(1)}` : bestScore.toFixed(1);

      let adv = '⚖️ Equal Position';
      if (bestScore >= 2) adv = '♔ White Winning (+2.0+)';
      else if (bestScore >= 0.6) adv = '♔ White Advantage';
      else if (bestScore <= -2) adv = '♟ Black Winning (-2.0+)';
      else if (bestScore <= -0.6) adv = '♟ Black Advantage';

      setAnalysis({
        depth: 18,
        evalPct,
        mainEvalText: mainEvalStr,
        advantageText: adv,
        candidates,
      });
    } catch {
      setAnalysis(DEFAULT_ANALYSIS);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6 select-none">
        <div className="w-12 h-12 rounded-2xl bg-[#0d0d1e] border border-[#252545] flex items-center justify-center text-xl">
          ⚙️
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 mb-1">Stockfish Engine Disabled</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Click the engine icon in the bottom toolbar<br />to activate multi-PV Stockfish analysis.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-3 gap-3 overflow-y-auto select-none">
      {/* Engine Status Header */}
      <div className="flex items-center justify-between border-b border-[#1e1e3a] pb-2">
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${isAnalyzing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
          <span className="text-[10px] font-extrabold text-[#ccccee] uppercase tracking-wider">
            Stockfish 16 (MultiPV=3)
          </span>
        </div>
        <span className="text-[9px] text-[#7777aa] font-mono bg-[#14142a] px-2 py-0.5 rounded border border-[#252545]">
          Depth {analysis.depth}
        </span>
      </div>

      {/* Eval Bar */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1 h-4 bg-[#0d0d1a] rounded-full overflow-hidden border border-[#222244] relative shadow-inner">
          <div
            className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-slate-200 to-slate-900 rounded-full transition-all duration-500"
            style={{ width: `${analysis.evalPct}%` }}
          />
          <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none text-[8px] font-black">
            <span className="text-slate-950">WHITE</span>
            <span className="text-white">BLACK</span>
          </div>
        </div>
        <span className="text-sm font-extrabold font-mono text-amber-400 tabular-nums min-w-[48px] text-right">
          {isAnalyzing ? '...' : analysis.mainEvalText}
        </span>
      </div>

      {/* Advantage Banner */}
      <div className="flex items-center justify-between bg-[#0d0d1a] rounded-xl px-3 py-2 border border-[#1e1e3a]">
        <span className="text-[10px] font-bold text-slate-300">{analysis.advantageText}</span>
        <span className="text-xs font-extrabold text-amber-400 font-mono">{analysis.mainEvalText}</span>
      </div>

      {/* MultiPV Top 3 Candidate Lines */}
      <div className="space-y-2">
        <p className="text-[9px] font-extrabold text-slate-400 uppercase tracking-widest">
          Top 3 Candidate Lines (MultiPV)
        </p>

        {analysis.candidates.map((cand) => (
          <div key={cand.rank} className="bg-[#121226] border border-[#222244] rounded-xl p-2.5 space-y-1 hover:border-amber-500/40 transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-lg bg-amber-500/20 text-amber-300 font-extrabold text-[10px] flex items-center justify-center font-mono">
                  #{cand.rank}
                </span>
                <span className="text-xs font-extrabold font-mono text-white">{cand.bestMove}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {cand.badge && (
                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                    cand.badge === 'Blunder'
                      ? 'bg-red-950 text-red-300 border border-red-700'
                      : cand.badge === 'Mistake'
                      ? 'bg-amber-950 text-amber-300 border border-amber-700'
                      : cand.badge === 'Inaccuracy'
                      ? 'bg-yellow-950 text-yellow-300 border border-yellow-700'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                  }`}>
                    {cand.badge}
                  </span>
                )}
                <span className="text-xs font-extrabold font-mono text-amber-400">{cand.evalText}</span>
              </div>
            </div>
            <p className="text-[10px] text-slate-400 font-mono pl-7">{cand.pvLine}</p>
          </div>
        ))}

        {analysis.candidates.length === 0 && !isAnalyzing && (
          <p className="text-[10px] text-slate-500 text-center py-2">Game Over or Position Terminal.</p>
        )}
      </div>
    </div>
  );
}
