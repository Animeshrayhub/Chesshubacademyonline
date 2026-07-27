'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';

const Chessboard = dynamic(
  () => import('react-chessboard').then((mod) => mod.Chessboard),
  { ssr: false }
) as any;

interface CompactPuzzle {
  id: string;
  fen: string;
  moves: string; // e.g. "e8d7 a2e6 d7d8 f7f8"
  rating: number;
  themes: string[];
}

interface StudentBattleArenaProps {
  studentName?: string;
}

export default function StudentBattleArena({ studentName = 'Student' }: StudentBattleArenaProps) {
  const [inBattle, setInBattle] = useState(true);
  const [timeLeft, setTimeLeft] = useState(60);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [totalAttempts, setTotalAttempts] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  const [puzzleList, setPuzzleList] = useState<CompactPuzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentPuzzle = puzzleList[currentIndex] || null;

  // Board & game state for active puzzle
  const [game, setGame] = useState<Chess>(new Chess());
  const [solution, setSolution] = useState<string[]>([]);
  const [turnColor, setTurnColor] = useState<'white' | 'black'>('white');
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Load puzzles from local API
  const loadPuzzles = useCallback(async () => {
    try {
      const res = await fetch('/api/puzzles/local?count=40');
      if (res.ok) {
        const data = await res.json();
        if (data.puzzles && data.puzzles.length > 0) {
          setPuzzleList(data.puzzles);
        }
      }
    } catch (err) {
      console.error('Failed to load battle arena puzzles:', err);
    }
  }, []);

  useEffect(() => {
    loadPuzzles();
  }, [loadPuzzles]);

  // Setup current puzzle position
  useEffect(() => {
    if (!currentPuzzle) return;

    try {
      const moves = currentPuzzle.moves ? currentPuzzle.moves.split(' ') : [];
      if (moves.length < 2) return;

      const oppMoveUci = moves[0];
      const sol = moves.slice(1);

      const c = new Chess(currentPuzzle.fen);
      const from = oppMoveUci.substring(0, 2);
      const to = oppMoveUci.substring(2, 4);
      const promo = oppMoveUci.length > 4 ? oppMoveUci.substring(4, 5) : undefined;
      c.move({ from, to, promotion: promo });

      setGame(c);
      setSolution(sol);
      setTurnColor(c.turn() === 'w' ? 'white' : 'black');
      setFeedback({ text: `Your turn! (${c.turn() === 'w' ? 'White' : 'Black'} to move)`, type: 'info' });
    } catch (err) {
      console.error('Error initializing speed puzzle position:', err);
    }
  }, [currentPuzzle]);

  // 60s Timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (inBattle && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && inBattle) {
      setInBattle(false);
      setGameOver(true);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [inBattle, timeLeft]);

  const handleStartDuel = async () => {
    await loadPuzzles();
    setInBattle(true);
    setTimeLeft(60);
    setPuzzlesSolved(0);
    setTotalAttempts(0);
    setCurrentIndex(0);
    setGameOver(false);
  };

  const advanceToNextPuzzle = () => {
    if (currentIndex + 1 < puzzleList.length) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      loadPuzzles().then(() => setCurrentIndex(0));
    }
  };

  const handlePieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (!inBattle || !currentPuzzle || solution.length === 0) return false;

    setTotalAttempts((prev) => prev + 1);

    const expectedNextUci = solution[0];
    const expectedFrom = expectedNextUci.substring(0, 2);
    const expectedTo = expectedNextUci.substring(2, 4);

    // Validate if move matches expected solution
    if (sourceSquare === expectedFrom && targetSquare === expectedTo) {
      // Try playing move on board
      const temp = new Chess(game.fen());
      const moveRes = temp.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });

      if (moveRes) {
        setGame(temp);
        setPuzzlesSolved((prev) => prev + 1);
        setFeedback({ text: '✓ Correct! Next puzzle...', type: 'success' });

        setTimeout(() => {
          advanceToNextPuzzle();
        }, 300);
        return true;
      }
    }

    // Incorrect move
    setFeedback({ text: '❌ Incorrect move! Try another tactic or skip.', type: 'error' });
    return false;
  };

  const accuracyPercent = totalAttempts > 0 ? Math.round((puzzlesSolved / totalAttempts) * 100) : 100;

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-5 shadow-xl text-white space-y-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-2xl shadow-lg">
            ⚔️
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-indigo-300 flex items-center gap-2">
              <span>60-Second Tactical Speed Run</span>
              <span className="text-[10px] bg-red-500/20 border border-red-500/40 text-red-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
                Live Rush
              </span>
            </h3>
            <p className="text-xs text-slate-400">Solve as many tactical puzzles as you can in 60 seconds!</p>
          </div>
        </div>

        {inBattle && (
          <div className="bg-slate-950 border border-indigo-500/40 px-3.5 py-1.5 rounded-2xl text-center shadow-inner">
            <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wider">TIME REMAINING</span>
            <span className="text-base font-extrabold text-amber-400 font-mono">⏱️ {timeLeft}s</span>
          </div>
        )}
      </div>

      {/* Pre-game lobby */}
      {!inBattle && !gameOver && (
        <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-sm font-bold text-slate-200">Ready for the 60-Second Puzzle Sprint?</h4>
            <p className="text-xs text-slate-400">
              Clean interactive board — solve tactics continuously against the clock to set your daily record!
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartDuel}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-gold transition-all active:scale-95 whitespace-nowrap flex items-center gap-2"
          >
            <span>⚔️ Start 60s Speed Run</span>
          </button>
        </div>
      )}

      {/* Active Battle Board */}
      {inBattle && (
        <div className="space-y-4">
          {/* Live Scorebar */}
          <div className="flex items-center justify-between bg-slate-950 border border-slate-800 p-3 rounded-2xl">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">Puzzles Solved:</span>
              <span className="text-lg font-extrabold text-emerald-400 font-mono">🎯 {puzzlesSolved}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-bold">Accuracy:</span>
              <span className="text-xs font-mono font-bold text-amber-400">{accuracyPercent}%</span>
            </div>
            <button
              type="button"
              onClick={advanceToNextPuzzle}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-bold rounded-lg border border-slate-700 transition-colors"
            >
              ⏭️ Skip Puzzle
            </button>
          </div>

          {/* Feedback bar */}
          {feedback && (
            <div
              className={`p-2 rounded-xl text-center text-xs font-bold transition-all ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                  : feedback.type === 'error'
                  ? 'bg-red-950/60 border border-red-500/40 text-red-300'
                  : 'bg-indigo-950/60 border border-indigo-500/40 text-indigo-300'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* CLEAN CHESSBOARD ONLY */}
          <div className="flex justify-center items-center py-2 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3">
            <div className="w-full max-w-[420px] aspect-square rounded-xl overflow-hidden shadow-2xl border border-slate-700/60">
              <Chessboard
                position={game.fen()}
                onPieceDrop={(source: string, target: string) => handlePieceDrop(source, target)}
                boardOrientation={turnColor}
                options={{
                  position: game.fen(),
                  onPieceDrop: ({ sourceSquare, targetSquare }: any) => handlePieceDrop(sourceSquare, targetSquare),
                  boardOrientation: turnColor,
                  boardStyle: {
                    borderRadius: '12px',
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                  },
                }}
                customBoardStyle={{
                  borderRadius: '12px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Game Over Summary Modal */}
      {gameOver && (
        <div className="p-6 bg-slate-950 border border-indigo-500/40 rounded-2xl text-center space-y-4 shadow-2xl">
          <div className="text-5xl animate-bounce">⏱️</div>
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-indigo-300">Time&apos;s Up! 60s Speed Run Complete</h4>
            <p className="text-xs text-slate-400">Here is how you performed under time pressure:</p>
          </div>

          <div className="grid grid-cols-2 gap-3 max-w-xs mx-auto text-center py-2">
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Puzzles Solved</span>
              <span className="text-2xl font-extrabold text-emerald-400 font-mono">{puzzlesSolved}</span>
            </div>
            <div className="bg-slate-900 border border-slate-800 p-3 rounded-2xl">
              <span className="text-[10px] text-slate-400 font-bold uppercase block">Accuracy</span>
              <span className="text-2xl font-extrabold text-amber-400 font-mono">{accuracyPercent}%</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleStartDuel}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow-gold transition-all"
          >
            🔄 Start New 60s Speed Run
          </button>
        </div>
      )}
    </div>
  );
}
