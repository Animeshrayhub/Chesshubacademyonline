'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';

export type EngineStrengthLevel = 'Beginner' | 'Easy' | 'Medium' | 'Hard' | 'Advanced' | 'Maximum';

const STRENGTH_CONFIGS: Record<EngineStrengthLevel, { skill: number; depth: number; label: string }> = {
  Beginner: { skill: 3, depth: 6, label: 'Beginner (Depth 6)' },
  Easy: { skill: 6, depth: 10, label: 'Easy (Depth 10)' },
  Medium: { skill: 10, depth: 14, label: 'Medium (Depth 14)' },
  Hard: { skill: 15, depth: 18, label: 'Hard (Depth 18)' },
  Advanced: { skill: 18, depth: 20, label: 'Advanced (Depth 20)' },
  Maximum: { skill: 20, depth: 22, label: 'Maximum (Depth 22)' },
};

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
  numericScore: number;
  mainEvalText: string;
  advantageText: string;
  candidates: PvCandidate[];
}

const DEFAULT_ANALYSIS: EngineAnalysis = {
  depth: 14,
  evalPct: 50,
  numericScore: 0.0,
  mainEvalText: '0.00 EQUAL',
  advantageText: '⚖️ Equal Position',
  candidates: [],
};

/**
 * Converts UCI PV string to readable SAN moves using chess.js
 */
function uciPvToSan(initialFen: string, uciPvStr: string): { bestMoveSan: string; pvLineSan: string } {
  try {
    const tempChess = new Chess(initialFen);
    const uciMoves = uciPvStr.trim().split(/\s+/);
    const sanMoves: string[] = [];
    let bestMoveSan = '';

    for (let i = 0; i < Math.min(uciMoves.length, 12); i++) {
      const uci = uciMoves[i];
      if (!uci || uci.length < 4) break;
      const from = uci.slice(0, 2);
      const to = uci.slice(2, 4);
      const promotion = uci.length > 4 ? uci[4] : undefined;

      const res = tempChess.move({ from, to, promotion });
      if (!res) break;
      if (i === 0) bestMoveSan = res.san;
      sanMoves.push(res.san);
    }

    return {
      bestMoveSan: bestMoveSan || uciMoves[0] || '...',
      pvLineSan: sanMoves.join(' ') || uciPvStr,
    };
  } catch {
    const uciMoves = uciPvStr.trim().split(/\s+/);
    return {
      bestMoveSan: uciMoves[0] || '...',
      pvLineSan: uciPvStr,
    };
  }
}

export default function ClassroomEnginePanel({ fen, isEnabled }: ClassroomEnginePanelProps) {
  const [strengthLevel, setStrengthLevel] = useState<EngineStrengthLevel>('Medium');
  const [targetDepth, setTargetDepth] = useState<number>(14);
  const [analysis, setAnalysis] = useState<EngineAnalysis>(DEFAULT_ANALYSIS);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      try {
        workerRef.current.postMessage('stop');
        workerRef.current.terminate();
      } catch {}
      workerRef.current = null;
    }
  }, []);

  const handleSelectStrength = (level: EngineStrengthLevel) => {
    setStrengthLevel(level);
    setTargetDepth(STRENGTH_CONFIGS[level].depth);
  };

  const analyzeFen = useCallback((fenStr: string, depthToUse: number, skillLevel: number) => {
    terminateWorker();

    if (typeof window === 'undefined') return;

    try {
      const chess = new Chess(fenStr);
      const sideToMove = chess.turn(); // 'w' or 'b'

      // Handle terminal game state
      if (chess.isGameOver()) {
        const inCheck = chess.inCheck();
        const evalStr = inCheck
          ? (sideToMove === 'w' ? '#-0 (Black Mates) BAD' : '#+0 (White Mates) GOOD')
          : '0.00 EQUAL';
        setAnalysis({
          depth: depthToUse,
          evalPct: inCheck ? (sideToMove === 'w' ? 5 : 95) : 50,
          numericScore: inCheck ? (sideToMove === 'w' ? -10 : 10) : 0,
          mainEvalText: evalStr,
          advantageText: inCheck ? '♔ Checkmate' : '⚖️ Draw',
          candidates: [],
        });
        setIsAnalyzing(false);
        return;
      }

      setIsAnalyzing(true);
      const worker = new Worker('/stockfish/stockfish.js');
      workerRef.current = worker;

      // Collect MultiPV lines: multipv index -> data
      const pvLinesMap: Record<number, { depth: number; cp?: number; mate?: number; pvStr: string }> = {};

      worker.onerror = (err) => {
        console.warn('[Stockfish Worker Warning]', err);
        setIsAnalyzing(false);
      };

      worker.onmessage = (event: MessageEvent) => {
        const line: string = typeof event.data === 'string' ? event.data : '';

        if (line.startsWith('info depth')) {
          const depthMatch = line.match(/depth (\d+)/);
          const scoreCpMatch = line.match(/score cp (-?\d+)/);
          const scoreMateMatch = line.match(/score mate (-?\d+)/);
          const multipvMatch = line.match(/multipv (\d+)/);
          const pvMatch = line.match(/ pv (.+)/);

          if (depthMatch && pvMatch) {
            const currentDepth = parseInt(depthMatch[1], 10);
            const multipv = multipvMatch ? parseInt(multipvMatch[1], 10) : 1;
            const pvStr = pvMatch[1];
            const cp = scoreCpMatch ? parseInt(scoreCpMatch[1], 10) : undefined;
            const mate = scoreMateMatch ? parseInt(scoreMateMatch[1], 10) : undefined;

            pvLinesMap[multipv] = { depth: currentDepth, cp, mate, pvStr };

            // Process collected top lines (up to 3)
            const ranks = Object.keys(pvLinesMap)
              .map(Number)
              .sort((a, b) => a - b)
              .slice(0, 3);

            if (ranks.length > 0) {
              const bestRank = ranks[0];
              const bestData = pvLinesMap[bestRank];
              let mainScoreFromWhite = 0;
              let mainEvalStr = '0.00 EQUAL';

              if (bestData.mate !== undefined) {
                const mateCount = sideToMove === 'w' ? bestData.mate : -bestData.mate;
                mainScoreFromWhite = mateCount > 0 ? 10 : -10;
                mainEvalStr = `#${mateCount > 0 ? '+' : ''}${mateCount} ${mateCount > 0 ? 'GOOD' : 'BAD'}`;
              } else if (bestData.cp !== undefined) {
                const cpFromWhite = sideToMove === 'w' ? bestData.cp : -bestData.cp;
                mainScoreFromWhite = cpFromWhite / 100;
                const formattedNum = mainScoreFromWhite > 0 ? `+${mainScoreFromWhite.toFixed(2)}` : mainScoreFromWhite.toFixed(2);
                const qualityLabel = mainScoreFromWhite > 0.4 ? 'GOOD' : mainScoreFromWhite < -0.4 ? 'BAD' : 'EQUAL';
                mainEvalStr = `${formattedNum} ${qualityLabel}`;
              }

              const evalPct = Math.min(95, Math.max(5, Math.round(50 + mainScoreFromWhite * 5)));

              let adv = '⚖️ Equal Position';
              if (mainScoreFromWhite >= 2.0) adv = '♔ White Winning (+2.0+)';
              else if (mainScoreFromWhite >= 0.6) adv = '♔ White Advantage';
              else if (mainScoreFromWhite <= -2.0) adv = '♟ Black Winning (-2.0+)';
              else if (mainScoreFromWhite <= -0.6) adv = '♟ Black Advantage';

              const candidates: PvCandidate[] = ranks.map((rank) => {
                const item = pvLinesMap[rank];
                let itemScore = 0;
                let itemEvalText = '0.00';

                if (item.mate !== undefined) {
                  const m = sideToMove === 'w' ? item.mate : -item.mate;
                  itemEvalText = `#${m > 0 ? '+' : ''}${m}`;
                  itemScore = m > 0 ? 10 : -10;
                } else if (item.cp !== undefined) {
                  const cpWhite = sideToMove === 'w' ? item.cp : -item.cp;
                  itemScore = cpWhite / 100;
                  itemEvalText = itemScore > 0 ? `+${itemScore.toFixed(2)}` : itemScore.toFixed(2);
                }

                const { bestMoveSan, pvLineSan } = uciPvToSan(fenStr, item.pvStr);

                let badge: PvCandidate['badge'] = rank === 1 ? 'Best Move' : undefined;
                if (rank > 1) {
                  const diff = Math.abs(mainScoreFromWhite - itemScore);
                  if (diff >= 2.0) badge = 'Blunder';
                  else if (diff >= 1.0) badge = 'Mistake';
                  else if (diff >= 0.4) badge = 'Inaccuracy';
                }

                return {
                  rank,
                  evalText: itemEvalText,
                  evalScore: itemScore,
                  bestMove: bestMoveSan,
                  pvLine: pvLineSan,
                  badge,
                };
              });

              setAnalysis({
                depth: currentDepth,
                evalPct,
                numericScore: mainScoreFromWhite,
                mainEvalText: mainEvalStr,
                advantageText: adv,
                candidates,
              });
            }
          }
        } else if (line.startsWith('bestmove')) {
          setIsAnalyzing(false);
        }
      };

      // Initialize UCI engine with selected strength and depth
      worker.postMessage('uci');
      worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
      worker.postMessage('setoption name MultiPV value 3');
      worker.postMessage('ucinewgame');
      worker.postMessage(`position fen ${fenStr}`);
      worker.postMessage(`go depth ${depthToUse}`);
    } catch (err) {
      console.warn('[Engine Start Error]', err);
      setIsAnalyzing(false);
    }
  }, [terminateWorker]);

  useEffect(() => {
    if (!isEnabled || !fen) {
      terminateWorker();
      setIsAnalyzing(false);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const cfg = STRENGTH_CONFIGS[strengthLevel];
      analyzeFen(fen, targetDepth, cfg.skill);
    }, 200);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      terminateWorker();
    };
  }, [fen, isEnabled, strengthLevel, targetDepth, analyzeFen, terminateWorker]);

  useEffect(() => {
    return () => {
      terminateWorker();
    };
  }, [terminateWorker]);

  if (!isEnabled) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-center p-6 select-none bg-slate-900">
        <div className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-xl">
          ⚙️
        </div>
        <div>
          <p className="text-xs font-bold text-slate-300 mb-1">Stockfish Engine Idle</p>
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Switch to the Engine tab to activate live MultiPV Stockfish analysis for this position.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0 select-none bg-slate-900 text-white overflow-hidden">
      {/* Scrollable Engine Viewport */}
      <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
        {/* Engine Status & Strength Selector */}
        <div className="flex flex-col gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${isAnalyzing ? 'bg-amber-400 animate-ping' : 'bg-emerald-400'}`} />
              <span className="text-[11px] font-extrabold text-slate-200 uppercase tracking-wider">
                Stockfish 16 (MultiPV=3)
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              Depth {analysis.depth}/{targetDepth}
            </span>
          </div>

          {/* Strength Level & Depth Controls */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 flex-1">
              <span className="text-[10px] font-bold text-slate-400">Strength:</span>
              <select
                value={strengthLevel}
                onChange={(e) => handleSelectStrength(e.target.value as EngineStrengthLevel)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-200 focus:outline-none focus:border-indigo-500 flex-1"
              >
                {(Object.keys(STRENGTH_CONFIGS) as EngineStrengthLevel[]).map((lvl) => (
                  <option key={lvl} value={lvl}>
                    {STRENGTH_CONFIGS[lvl].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setTargetDepth((d) => Math.max(4, d - 2))}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center border border-slate-700"
                title="Decrease Depth"
              >
                -
              </button>
              <span className="text-[10px] font-mono font-bold text-slate-300 w-6 text-center">
                d{targetDepth}
              </span>
              <button
                type="button"
                onClick={() => setTargetDepth((d) => Math.min(26, d + 2))}
                className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-slate-300 flex items-center justify-center border border-slate-700"
                title="Increase Depth"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Evaluation Banner with Numeric Score & GOOD / BAD / EQUAL label */}
        <div className="bg-slate-950 rounded-xl p-2.5 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Evaluation:</span>
            <span className="text-xs font-black text-amber-400 font-mono tracking-tight">
              {analysis.mainEvalText}
            </span>
          </div>

          {/* Eval Bar */}
          <div className="flex items-center gap-2">
            <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800 relative shadow-inner">
              <div
                className="absolute inset-0 bg-gradient-to-r from-emerald-500 via-slate-200 to-slate-900 rounded-full transition-all duration-300"
                style={{ width: `${analysis.evalPct}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none text-[7px] font-black">
                <span className="text-slate-950">W</span>
                <span className="text-white">B</span>
              </div>
            </div>
            <span className="text-[11px] font-bold text-slate-300 min-w-[70px] text-right">
              {analysis.advantageText}
            </span>
          </div>
        </div>

        {/* Exactly 3 Principal Variations */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest">
              Top 3 Principal Variations
            </p>
            {isAnalyzing && (
              <span className="text-[9px] text-amber-400 font-semibold animate-pulse">Calculating…</span>
            )}
          </div>

          {analysis.candidates.map((cand) => (
            <div
              key={cand.rank}
              className="bg-slate-950/80 border border-slate-800 hover:border-amber-500/40 rounded-xl p-2.5 space-y-1.5 transition-all"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-black text-[10px] font-mono">
                    Line {cand.rank}
                  </span>
                  <span className="text-xs font-black font-mono text-white">{cand.bestMove}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {cand.badge && (
                    <span
                      className={`text-[8px] font-black px-1.5 py-0.5 rounded uppercase ${
                        cand.badge === 'Blunder'
                          ? 'bg-rose-950 text-rose-300 border border-rose-700'
                          : cand.badge === 'Mistake'
                          ? 'bg-amber-950 text-amber-300 border border-amber-700'
                          : cand.badge === 'Inaccuracy'
                          ? 'bg-yellow-950 text-yellow-300 border border-yellow-700'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      }`}
                    >
                      {cand.badge}
                    </span>
                  )}
                  <span className="text-xs font-extrabold font-mono text-amber-400">{cand.evalText}</span>
                </div>
              </div>

              {/* Variation Line with Horizontal Scroll & Wrap Support */}
              <div className="overflow-x-auto max-w-full pl-1 py-0.5 scrollbar-thin scrollbar-thumb-slate-700">
                <p className="text-[10px] text-slate-300 font-mono whitespace-nowrap break-words leading-relaxed">
                  {cand.pvLine}
                </p>
              </div>
            </div>
          ))}

          {analysis.candidates.length === 0 && !isAnalyzing && (
            <p className="text-[10px] text-slate-500 text-center py-4">Position terminal or game over.</p>
          )}
        </div>
      </div>

      {/* Footer Notice */}
      <div className="p-2 border-t border-slate-800 text-center bg-slate-950/40 shrink-0">
        <p className="text-[9px] text-slate-500 font-semibold">
          Stockfish analysis is coach-only and never moves pieces automatically.
        </p>
      </div>
    </div>
  );
}
