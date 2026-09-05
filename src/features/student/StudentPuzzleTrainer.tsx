'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';
import { recordStudentActivityAction } from '@/actions/activity';
import { playChessSound } from '@/utils/chessAudio';
import { recordPuzzleAttempt, getStudentPuzzleStats } from '@/lib/puzzles/progress';

const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

export type PuzzleCategory = 'TACTICS' | 'CHECKMATE' | 'CALCULATION' | 'ENDGAME' | 'MIXED';

export interface LichessPuzzle {
  id: string;
  rating: number;
  fen: string;
  solution: string[];
  themes: string[];
  category: string;
  sideToMove: 'white' | 'black';
  title?: string;
}

export default function StudentPuzzleTrainer() {
  const [practiceMode, setPracticeMode] = useState<'daily' | 'unlimited'>('daily');
  const [selectedCategory, setSelectedCategory] = useState<PuzzleCategory>('TACTICS');
  const [categoryIndex, setCategoryIndex] = useState(0);

  const [currentPuzzle, setCurrentPuzzle] = useState<LichessPuzzle | null>(null);
  const [loading, setLoading] = useState(true);

  // Chessboard state
  const [boardFen, setBoardFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [solutionStep, setSolutionStep] = useState(0);
  const [userMoveInput, setUserMoveInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'neutral'; text: string }>({
    type: 'neutral',
    text: 'Analyze the position and play your move on the board or enter UCI notation (e.g. f3f7).',
  });

  // Solving stats & metrics
  const [attempts, setAttempts] = useState(1);
  const [solveStartTime, setSolveStartTime] = useState<number>(Date.now());
  const [isSolved, setIsSolved] = useState(false);
  const [streak, setStreak] = useState(0);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [studentRating, setStudentRating] = useState<number>(1200);

  const chessRef = useRef<Chess>(new Chess());

  // Fetch puzzle from Lichess proxy route
  const fetchPuzzle = useCallback(async (mode: 'daily' | 'unlimited', category: PuzzleCategory, idx: number) => {
    setLoading(true);
    setIsSolved(false);
    setSolutionStep(0);
    setAttempts(1);
    setUserMoveInput('');

    try {
      const url = mode === 'daily'
        ? '/api/puzzles/lichess?type=daily'
        : `/api/puzzles/lichess?category=${category}&index=${idx}`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.success && data.puzzle) {
        const p: LichessPuzzle = data.puzzle;
        setCurrentPuzzle(p);
        setBoardFen(p.fen);

        try {
          chessRef.current = new Chess(p.fen);
        } catch (e) {
          chessRef.current = new Chess();
        }

        setSolveStartTime(Date.now());
        setFeedback({
          type: 'neutral',
          text: `Find the best move for ${p.sideToMove === 'white' ? 'White ⚪' : 'Black ⬛'}!`,
        });
      }
    } catch (err) {
      setFeedback({
        type: 'error',
        text: 'Failed to load puzzle. Please check your connection.',
      });
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchPuzzle(practiceMode, selectedCategory, categoryIndex);
  }, [practiceMode, selectedCategory, categoryIndex, fetchPuzzle]);

  // Hydrate real local stats on mount
  useEffect(() => {
    const stats = getStudentPuzzleStats();
    if (stats) {
      if (stats.currentStreak > 0) setStreak(stats.currentStreak);
      if (stats.tacticalRating > 0) setStudentRating(stats.tacticalRating);
      if (stats.totalSolved > 0) setPuzzlesSolved(stats.totalSolved);
    }
  }, []);

  // Handle move validation
  const checkMoveUci = (uciMove: string): boolean => {
    if (!currentPuzzle || isSolved) return false;

    const cleanMove = uciMove.trim().toLowerCase();
    const expectedMove = currentPuzzle.solution[solutionStep]?.toLowerCase();

    if (!expectedMove) return false;

    if (cleanMove === expectedMove) {
      // Execute move on chess engine
      try {
        const from = cleanMove.substring(0, 2);
        const to = cleanMove.substring(2, 4);
        const promotion = cleanMove.length > 4 ? cleanMove.substring(4, 5) : undefined;
        chessRef.current.move({ from: from as any, to: to as any, promotion: promotion as any });
        setBoardFen(chessRef.current.fen());
        playChessSound('move');
      } catch (e) {}

      const nextStep = solutionStep + 1;
      setSolutionStep(nextStep);

      // Check if puzzle is fully solved
      if (nextStep >= currentPuzzle.solution.length) {
        handlePuzzleSolved();
        return true;
      }

      // Play opponent automated reply if there are more moves in solution
      const opponentReply = currentPuzzle.solution[nextStep];
      if (opponentReply) {
        setTimeout(() => {
          try {
            const oppFrom = opponentReply.substring(0, 2);
            const oppTo = opponentReply.substring(2, 4);
            const oppProm = opponentReply.length > 4 ? opponentReply.substring(4, 5) : undefined;
            chessRef.current.move({ from: oppFrom as any, to: oppTo as any, promotion: oppProm as any });
            setBoardFen(chessRef.current.fen());
            setSolutionStep(nextStep + 1);
            playChessSound('capture');
          } catch (e) {}
        }, 400);
      }

      setFeedback({
        type: 'success',
        text: 'Best move! Continue the combination...',
      });
      return true;
    } else {
      setAttempts((a) => a + 1);
      setStreak(0);
      setFeedback({
        type: 'error',
        text: `❌ Move ${uciMove} is not the best. Try again!`,
      });
      return false;
    }
  };

  // On Complete Solve
  const handlePuzzleSolved = async () => {
    setIsSolved(true);
    playChessSound('victory');

    const durationSec = Math.max(1, Math.round((Date.now() - solveStartTime) / 1000));
    const accuracyVal = attempts === 1 ? 100 : Math.max(50, Math.round(100 / attempts));

    setFeedback({
      type: 'success',
      text: `🎉 PUZZLE SOLVED in ${durationSec}s! Perfect tactical vision!`,
    });

    // Update local progress engine
    if (currentPuzzle) {
      const recordRes = recordPuzzleAttempt(
        currentPuzzle.id,
        currentPuzzle.rating,
        true,
        currentPuzzle.themes
      );
      setStreak(recordRes.newStats.currentStreak);
      setPuzzlesSolved(recordRes.newStats.totalSolved);
      setStudentRating(recordRes.newStats.tacticalRating);
    } else {
      setStreak((s) => s + 1);
      setPuzzlesSolved((p) => p + 1);
      setStudentRating((r) => r + (attempts === 1 ? 12 : 5));
    }

    // Record real activity in database & save puzzle result
    if (currentPuzzle) {
      try {
        await Promise.allSettled([
          recordStudentActivityAction({
            activityType: practiceMode === 'daily' ? 'DAILY_PUZZLE' : 'PUZZLE',
            activityId: currentPuzzle.id,
            durationSeconds: durationSec,
            result: 'SOLVED',
            accuracy: accuracyVal,
            metadata: {
              puzzleRating: currentPuzzle.rating,
              category: selectedCategory,
              attempts,
              themes: currentPuzzle.themes,
            },
          }),
          fetch('/api/puzzles/result', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              puzzleId: currentPuzzle.id,
              puzzleSource: 'LICHESS',
              puzzleRating: currentPuzzle.rating,
              puzzleThemes: currentPuzzle.themes,
              solved: true,
              attempts,
              timeSeconds: durationSec,
              accuracy: accuracyVal,
            }),
          }),
        ]);
      } catch (err) {
        console.error('Failed to sync puzzle result to database:', err);
      }
    }
  };

  // Piece drop handler on board
  const handlePieceDrop = (sourceOrObj: any, targetArg?: string): boolean => {
    if (isSolved || loading || !currentPuzzle) return false;

    let source = '';
    let target = '';
    if (sourceOrObj && typeof sourceOrObj === 'object' && sourceOrObj.sourceSquare) {
      source = sourceOrObj.sourceSquare;
      target = sourceOrObj.targetSquare;
    } else if (typeof sourceOrObj === 'string' && targetArg) {
      source = sourceOrObj;
      target = targetArg;
    }

    if (!source || !target) return false;

    const uci = `${source}${target}`.toLowerCase();
    return checkMoveUci(uci);
  };

  const handleNextPuzzle = () => {
    if (practiceMode === 'daily') {
      // Switch to unlimited for continuous practice
      setPracticeMode('unlimited');
      setCategoryIndex((prev) => prev + 1);
    } else {
      setCategoryIndex((prev) => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode & Category Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Mode Selector */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setPracticeMode('daily');
              fetchPuzzle('daily', selectedCategory, 0);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              practiceMode === 'daily'
                ? 'bg-amber-500 text-slate-950 shadow-gold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>⭐</span>
            <span>Daily Puzzle</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setPracticeMode('unlimited');
              fetchPuzzle('unlimited', selectedCategory, categoryIndex);
            }}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
              practiceMode === 'unlimited'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            <span>♾️</span>
            <span>Unlimited Practice</span>
          </button>
        </div>

        {/* Category Selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {(['TACTICS', 'CHECKMATE', 'CALCULATION', 'ENDGAME', 'MIXED'] as PuzzleCategory[]).map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                setSelectedCategory(cat);
                setPracticeMode('unlimited');
                setCategoryIndex(0);
                fetchPuzzle('unlimited', cat, 0);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedCategory === cat && practiceMode === 'unlimited'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Tactics Rating</p>
            <p className="text-xl font-extrabold font-mono text-amber-400 mt-0.5">{studentRating}</p>
          </div>
          <span className="text-2xl">⭐</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Solving Streak</p>
            <p className="text-xl font-extrabold font-mono text-emerald-400 mt-0.5">{streak} 🔥</p>
          </div>
          <span className="text-2xl">🔥</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Puzzles Solved</p>
            <p className="text-xl font-extrabold font-mono text-blue-400 mt-0.5">{puzzlesSolved}</p>
          </div>
          <span className="text-2xl">🎯</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Puzzle Difficulty</p>
            <p className="text-xl font-extrabold font-mono text-purple-400 mt-0.5">
              {currentPuzzle?.rating || '—'}
            </p>
          </div>
          <span className="text-2xl">⚡</span>
        </div>
      </div>

      {/* Main Solver Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Board Column */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-5 flex flex-col items-center justify-center">
          <div className="w-full max-w-[500px] aspect-square relative rounded-xl overflow-hidden shadow-2xl">
            {loading ? (
              <div className="absolute inset-0 bg-slate-950/80 flex flex-col items-center justify-center text-slate-400 text-xs font-bold gap-3 z-10">
                <span className="text-3xl animate-spin">⏳</span>
                <span>Loading real position from Lichess...</span>
              </div>
            ) : null}

            <ChessboardComponent
              position={boardFen}
              onPieceDrop={handlePieceDrop}
              boardOrientation={currentPuzzle?.sideToMove === 'black' ? 'black' : 'white'}
              customBoardStyle={{ borderRadius: '0.75rem', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}
            />
          </div>
        </div>

        {/* Puzzle Details & Controls */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-4">
              <span className="text-[10px] font-extrabold text-amber-400 uppercase tracking-widest block">
                {practiceMode === 'daily' ? 'Official Lichess Daily Challenge' : `${selectedCategory} Practice`}
              </span>
              <h3 className="font-heading font-extrabold text-lg text-white mt-1">
                {currentPuzzle?.sideToMove === 'white' ? 'White to Play & Win' : 'Black to Play & Win'}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Puzzle ID: <strong className="text-slate-300 font-mono">{currentPuzzle?.id || '—'}</strong>
              </p>
            </div>

            {/* Themes */}
            {currentPuzzle?.themes && currentPuzzle.themes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {currentPuzzle.themes.slice(0, 4).map((th) => (
                  <span key={th} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-[10px] font-semibold">
                    #{th}
                  </span>
                ))}
              </div>
            )}

            {/* Move Input Form (Alternative to drag & drop) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                checkMoveUci(userMoveInput);
              }}
              className="space-y-2"
            >
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userMoveInput}
                  onChange={(e) => setUserMoveInput(e.target.value)}
                  placeholder="Or enter move (e.g. e2e4)..."
                  className="flex-grow px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-xs focus:outline-none focus:border-amber-400"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs"
                >
                  Submit
                </button>
              </div>
            </form>

            {/* Feedback Alert */}
            <div
              className={`p-3.5 rounded-xl text-xs font-semibold ${
                feedback.type === 'success'
                  ? 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-300'
                  : feedback.type === 'error'
                  ? 'bg-red-500/15 border border-red-500/30 text-red-300'
                  : 'bg-slate-800/60 border border-slate-700/60 text-slate-300'
              }`}
            >
              {feedback.text}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (currentPuzzle?.solution[solutionStep]) {
                  setFeedback({
                    type: 'neutral',
                    text: `💡 Hint: Focus on piece starting at ${currentPuzzle.solution[solutionStep].substring(0, 2).toUpperCase()}`,
                  });
                }
              }}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold"
            >
              💡 Hint
            </button>

            <button
              type="button"
              onClick={handleNextPuzzle}
              className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-gold transition-all flex items-center gap-1.5"
            >
              <span>Next Puzzle →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
