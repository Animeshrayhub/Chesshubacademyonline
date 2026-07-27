'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import DashboardIcon from './DashboardIcon';
import Button from '@/components/ui/Button';
import type { PuzzleData, PuzzleResult } from '@/lib/puzzles/types';
import { customChessPieces } from './ChessPieces';
import {
  getStudentPuzzleStats,
  recordPuzzleAttempt,
  getStudentRankTitle,
  getWeakestTheme,
  type StudentPuzzleStats,
} from '@/lib/puzzles/progress';

// react-chessboard v5 — Chessboard takes a single `options` prop
const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => mod.Chessboard),
  { ssr: false }
) as any;

interface PuzzleBoardProps {
  puzzle: PuzzleData;
  onSolveComplete?: (result: PuzzleResult) => void;
  token?: string;
}

export default function PuzzleBoard({ puzzle, onSolveComplete, token }: PuzzleBoardProps) {
  const [selectedLevel, setSelectedLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master'>('Beginner');
  const [selectedTheme, setSelectedTheme] = useState('ALL');
  const [currentPuzzle, setCurrentPuzzle] = useState<PuzzleData>(puzzle);
  const [loadingNext, setLoadingNext] = useState(false);

  // Student Tactical Progress State
  const [studentStats, setStudentStats] = useState<StudentPuzzleStats | null>(null);
  const [lastAttemptReward, setLastAttemptReward] = useState<{
    ratingDelta: number;
    xpGain: number;
    isGoalJustCompleted: boolean;
    rankTitle: string;
    rankBadge: string;
  } | null>(null);

  useEffect(() => {
    setStudentStats(getStudentPuzzleStats());
  }, []);

  // Sync state if puzzle prop changes from outside
  useEffect(() => {
    setCurrentPuzzle(puzzle);
  }, [puzzle]);

  // Source of truth for chess game
  const gameRef = useRef<Chess>(new Chess(currentPuzzle.initialFen));
  const [fen, setFen] = useState(currentPuzzle.initialFen);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>(
    currentPuzzle.playerToMove
  );
  
  // Game state
  const [solutionIndex, setSolutionIndex] = useState(0);
  const [status, setStatus] = useState<'intro' | 'solving' | 'solved' | 'failed'>('intro');
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' }>({
    text: `Opponent to play...`,
    type: 'info',
  });
  
  // Stats tracking
  const [attempts, setAttempts] = useState(1);
  const [mistakes, setMistakes] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number | null>(null);

  // Square highlights
  const [rightSquareGold, setRightSquareGold] = useState<string | null>(null);
  const [wrongSquareRed, setWrongSquareRed] = useState<string | null>(null);

  // Selection & option squares for legal move dots
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  // Stockfish analysis (available after completion)
  const [bestMove, setBestMove] = useState('');
  const [evalScore, setEvalScore] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const stockfishRef = useRef<Worker | null>(null);

  // AI Explanation States
  const [lastWrongMove, setLastWrongMove] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // Hint state & highlights
  const [hintSquare, setHintSquare] = useState<string | null>(null);
  const [hintTargetSquare, setHintTargetSquare] = useState<string | null>(null);
  const [hintText, setHintText] = useState<string | null>(null);

  const handleGetHint = () => {
    if (status !== 'solving') return;

    const expectedMove = currentPuzzle?.solution?.[solutionIndex];
    if (!expectedMove) return;

    const from = expectedMove.substring(0, 2);
    const to = expectedMove.substring(2, 4);

    if (!hintSquare) {
      // Step 1: Highlight piece to move
      setHintSquare(from);
      const piece = gameRef.current.get(from as any);
      const pieceName = piece
        ? { p: 'Pawn', n: 'Knight', b: 'Bishop', r: 'Rook', q: 'Queen', k: 'King' }[piece.type] || 'Piece'
        : 'Piece';
      setHintText(`💡 Hint: Move the ${pieceName} on ${from.toUpperCase()}`);
    } else if (!hintTargetSquare) {
      // Step 2: Highlight target destination square too
      setHintTargetSquare(to);
      setHintText(`💡 Hint: Move from ${from.toUpperCase()} to ${to.toUpperCase()}`);
    }
  };

  // Sync state helper
  const syncState = useCallback(() => {
    setFen(gameRef.current.fen());
    setHistory(gameRef.current.history());
  }, []);

  const handleNextPuzzle = async () => {
    await fetchLevelPuzzle(selectedLevel, selectedTheme);
  };

  const fetchLevelPuzzle = async (levelName: string, themeName: string = selectedTheme) => {
    setLoadingNext(true);
    setMessage({ text: `Loading next ${levelName} puzzle...`, type: 'info' });
    try {
      // 1. Check custom imported Lichess CSV puzzles first!
      if (typeof window !== 'undefined') {
        const customStored = localStorage.getItem('custom_lichess_puzzles');
        if (customStored) {
          const customPuzzles: PuzzleData[] = JSON.parse(customStored);
          const filtered = customPuzzles.filter((p) => {
            if (themeName === 'ALL') return true;
            return p.themes.some((t) => t.toLowerCase() === themeName.toLowerCase());
          });
          if (filtered.length > 0) {
            const randP = filtered[Math.floor(Math.random() * filtered.length)];
            setCurrentPuzzle(randP);
            setLoadingNext(false);
            return;
          }
        }
      }

      // 2. Fetch from API
      const res = await fetch(`/api/puzzles/next?level=${levelName}&theme=${themeName}`, {
        cache: 'no-store',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        }
      });
      if (res.ok) {
        const nextPuzzle = await res.json();
        setCurrentPuzzle(nextPuzzle);
        setMessage({ text: `Practicing ${themeName === 'ALL' ? 'all' : themeName} puzzle`, type: 'info' });
      } else {
        const errData = await res.json().catch(() => ({}));
        setMessage({
          text: errData.error || `No ${themeName} puzzles found in active catalog. Please try another theme or import puzzles in Admin Manager.`,
          type: 'error',
        });
      }
    } catch {
      setMessage({ text: 'Network connection failed.', type: 'error' });
    } finally {
      setLoadingNext(false);
    }
  };

  const triggerFetchLevelPuzzle = (levelName: string) => {
    fetchLevelPuzzle(levelName);
  };

  // Cleanup stockfish
  useEffect(() => {
    return () => {
      stockfishRef.current?.terminate();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Start puzzle flow
  useEffect(() => {
    // Reset states
    const initialGame = new Chess(currentPuzzle.initialFen);
    gameRef.current = initialGame;
    setFen(currentPuzzle.initialFen);
    setSolutionIndex(0);
    setStatus('intro');
    setAttempts(1);
    setMistakes(0);
    setElapsedTime(0);
    setRightSquareGold(null);
    setWrongSquareRed(null);
    setBestMove('');
    setEvalScore('');
    setLastWrongMove(null);
    setAiExplanation(null);
    setBoardOrientation(currentPuzzle.playerToMove);
    setSelectedSquare(null);
    setOptionSquares({});
    setHintSquare(null);
    setHintTargetSquare(null);
    setHintText(null);
    
    if (timerRef.current) clearInterval(timerRef.current);
    startTimeRef.current = null;

    // 1. Play opponent's move on intro
    setMessage({ text: 'Opponent is making their move...', type: 'info' });
    
    const introTimeout = setTimeout(() => {
      if (currentPuzzle.opponentMoveUci) {
        try {
          const from = currentPuzzle.opponentMoveUci.substring(0, 2);
          const to = currentPuzzle.opponentMoveUci.substring(2, 4);
          const promotion = currentPuzzle.opponentMoveUci.substring(4, 5) || undefined;
          
          initialGame.move({ from, to, promotion });
          setFen(initialGame.fen());
          setHistory(initialGame.history());
          
          setMessage({
            text: `Your turn! Find the best move for ${currentPuzzle.playerToMove}.`,
            type: 'info',
          });
          setStatus('solving');
          startTimeRef.current = Date.now();
          
          // Start timer
          timerRef.current = setInterval(() => {
            if (startTimeRef.current) {
              setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
            }
          }, 1000);
        } catch (err) {
          console.error('Failed to make opponent move:', err);
          setStatus('solving');
        }
      } else {
        setStatus('solving');
        startTimeRef.current = Date.now();
      }
    }, 1200);

    return () => clearTimeout(introTimeout);
  }, [currentPuzzle]);

  // Selection & option squares for legal move dots
  const handleSquareClick = (square: string) => {
    if (status !== 'solving') return;

    // 1. If clicked on a valid move square, make the move
    if (optionSquares[square]) {
      const uciMove = `${selectedSquare}${square}`;
      const expectedMove = currentPuzzle.solution[solutionIndex];

      const isCorrect = 
        uciMove.toLowerCase() === expectedMove.toLowerCase() ||
        `${uciMove}q`.toLowerCase() === expectedMove.toLowerCase();

      if (isCorrect) {
        try {
          const from = expectedMove.substring(0, 2);
          const to = expectedMove.substring(2, 4);
          const promotion = expectedMove.substring(4, 5) || undefined;
          
          gameRef.current.move({ from, to, promotion });
          syncState();
          setRightSquareGold(square);
          setWrongSquareRed(null);
          setSelectedSquare(null);
          setOptionSquares({});

          const nextIndex = solutionIndex + 1;

          if (nextIndex >= currentPuzzle.solution.length) {
            handlePuzzleSolved(attempts, mistakes);
          } else {
            setSolutionIndex(nextIndex);
            setMessage({ text: 'Correct! Opponent responding...', type: 'success' });
            
            setTimeout(() => {
              const oppMove = currentPuzzle.solution[nextIndex];
              const oppFrom = oppMove.substring(0, 2);
              const oppTo = oppMove.substring(2, 4);
              const oppPromo = oppMove.substring(4, 5) || undefined;
              
              gameRef.current.move({ from: oppFrom, to: oppTo, promotion: oppPromo });
              syncState();
              
              setSolutionIndex(nextIndex + 1);
              setMessage({ text: 'Find the next move...', type: 'info' });
            }, 800);
          }
          return;
        } catch (err) {
          console.error(err);
        }
      } else {
        setAttempts((a) => a + 1);
        setMistakes((m) => m + 1);
        setWrongSquareRed(square);
        setLastWrongMove(uciMove);
        setAiExplanation(null);
        setMessage({ text: 'Incorrect move, try again.', type: 'error' });
        setSelectedSquare(null);
        setOptionSquares({});
        return;
      }
    }

    // 2. Otherwise, check if we clicked on our own piece to select it
    const piece = gameRef.current.get(square as any);
    if (piece && piece.color === gameRef.current.turn()) {
      setSelectedSquare(square);

      // Find legal moves
      const moves = gameRef.current.moves({ square: square as any, verbose: true });
      const newOptionSquares: Record<string, React.CSSProperties> = {};

      // Selection highlight (Chess.com style blue border/glow)
      newOptionSquares[square] = {
        boxShadow: 'inset 0 0 0 3.5px #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
      };

      moves.forEach((m) => {
        const targetPiece = gameRef.current.get(m.to as any);
        if (targetPiece) {
          newOptionSquares[m.to] = {
            background: 'radial-gradient(circle, transparent 75%, rgba(0, 0, 0, 0.18) 75%)',
          };
        } else {
          newOptionSquares[m.to] = {
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.18) 19%, transparent 19%)',
          };
        }
      });

      setOptionSquares(newOptionSquares);
    } else {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  };

  // Handle piece drops during solving — supports both positional args and object params
  const handlePieceDrop = (sourceOrObj: any, targetArg?: string | null): boolean => {
    let sourceSquare: string = '';
    let targetSquare: string | null = null;

    if (typeof sourceOrObj === 'object' && sourceOrObj !== null && 'sourceSquare' in sourceOrObj) {
      sourceSquare = sourceOrObj.sourceSquare;
      targetSquare = sourceOrObj.targetSquare || null;
    } else {
      sourceSquare = String(sourceOrObj || '');
      targetSquare = targetArg || null;
    }

    if ((status !== 'solving' && status !== 'intro') || !targetSquare) return false;
    setSelectedSquare(null);
    setOptionSquares({});

    const uciMove = `${sourceSquare}${targetSquare}`;
    const expectedMove = currentPuzzle?.solution?.[solutionIndex];
    if (!expectedMove) return false;

    // Check if it is the correct move (e.g. matching uci or with promotion q fallback)
    const isCorrect = 
      uciMove.toLowerCase() === expectedMove.toLowerCase() ||
      `${uciMove}q`.toLowerCase() === expectedMove.toLowerCase();

    if (isCorrect) {
      // Apply the correct move
      try {
        const from = expectedMove.substring(0, 2);
        const to = expectedMove.substring(2, 4);
        const promotion = expectedMove.substring(4, 5) || undefined;
        
        gameRef.current.move({ from, to, promotion });
        syncState();
        setRightSquareGold(targetSquare);
        setWrongSquareRed(null);

        const nextIndex = solutionIndex + 1;

        if (nextIndex >= currentPuzzle.solution.length) {
          // Solved!
          handlePuzzleSolved(attempts, mistakes);
        } else {
          // Play opponent reply
          setSolutionIndex(nextIndex);
          setMessage({ text: 'Correct! Opponent responding...', type: 'success' });
          
          setTimeout(() => {
            const oppMove = currentPuzzle.solution[nextIndex];
            const oppFrom = oppMove.substring(0, 2);
            const oppTo = oppMove.substring(2, 4);
            const oppPromo = oppMove.substring(4, 5) || undefined;
            
            gameRef.current.move({ from: oppFrom, to: oppTo, promotion: oppPromo });
            syncState();
            
            setSolutionIndex(nextIndex + 1);
            setMessage({ text: 'Find the next move...', type: 'info' });
          }, 800);
        }
        return true;
      } catch (err) {
        console.error('Correct move application error:', err);
        return false;
      }
    } else {
      // Incorrect move
      setAttempts((a) => a + 1);
      setMistakes((m) => m + 1);
      setWrongSquareRed(targetSquare);
      setLastWrongMove(uciMove);
      setAiExplanation(null);
      setMessage({ text: 'Incorrect move, try again.', type: 'error' });
      return false;
    }
  };

  const handlePuzzleSolved = async (totalAttempts: number, totalMistakes: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus('solved');
    setMessage({ text: 'Puzzle solved! Excellent job!', type: 'success' });

    // Record student stats & rating reward
    const recordRes = recordPuzzleAttempt(
      currentPuzzle.id,
      currentPuzzle.rating,
      totalMistakes === 0,
      currentPuzzle.themes
    );
    setStudentStats(recordRes.newStats);
    setLastAttemptReward({
      ratingDelta: recordRes.ratingDelta,
      xpGain: recordRes.xpGain,
      isGoalJustCompleted: recordRes.isGoalJustCompleted,
      rankTitle: recordRes.rank.title,
      rankBadge: recordRes.rank.badge,
    });

    const totalSeconds = startTimeRef.current
      ? Math.floor((Date.now() - startTimeRef.current) / 1000)
      : elapsedTime;

    // Calculate accuracy: perfect is 100. Each mistake reduces it.
    const expectedMovesCount = Math.ceil(currentPuzzle.solution.length / 2);
    const accuracy = Math.max(
      0,
      Math.round((expectedMovesCount / (expectedMovesCount + totalMistakes)) * 100)
    );

    const result: PuzzleResult = {
      puzzleId: currentPuzzle.id,
      puzzleSource: currentPuzzle.source,
      puzzleRating: currentPuzzle.rating,
      puzzleThemes: currentPuzzle.themes,
      solved: true,
      attempts: totalAttempts,
      timeSeconds: totalSeconds,
      accuracy,
    };

    // Save result to DB via API
    try {
      await fetch('/api/puzzles/result', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(result),
      });
    } catch (err) {
      console.error('Failed to auto-save puzzle result:', err);
    }

    if (onSolveComplete) {
      onSolveComplete(result);
    }
  };

  // Stockfish analysis (Only after solved)
  const triggerStockfishAnalysis = () => {
    if (typeof window === 'undefined' || status !== 'solved') return;
    setAnalyzing(true);
    setBestMove('');
    setEvalScore('');

    try {
      stockfishRef.current?.terminate();
      const worker = new Worker('/stockfish/stockfish.js');
      stockfishRef.current = worker;

      worker.onmessage = (event) => {
        const line: string = event.data;
        if (line.startsWith('info depth')) {
          const scoreMatch = line.match(/score cp (-?\d+)/);
          if (scoreMatch) {
            setEvalScore((parseInt(scoreMatch[1]) / 100).toFixed(2));
          }
        } else if (line.startsWith('bestmove')) {
          setBestMove(line.split(' ')[1] || 'none');
          setAnalyzing(false);
          worker.terminate();
        }
      };

      worker.postMessage('uci');
      worker.postMessage(`position fen ${gameRef.current.fen()}`);
      worker.postMessage('go depth 12');
    } catch {
      setAnalyzing(false);
    }
  };

  const handleAskAI = async () => {
    if (!lastWrongMove || status !== 'solving') return;
    setAiLoading(true);
    setAiExplanation(null);

    try {
      const res = await fetch('/api/ai/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen,
          moveAttempted: lastWrongMove,
          bestMove: currentPuzzle.solution[solutionIndex],
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAiExplanation(data.explanation);
      } else {
        const data = await res.json();
        setAiExplanation(data.error || 'Could not load coach explanation.');
      }
    } catch {
      setAiExplanation('Network connection failed. Could not reach coach AI.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleUndo = () => {
    if (status !== 'solved') return;
    gameRef.current.undo();
    syncState();
  };

  const handleReset = () => {
    // Reset to start of puzzle position
    const initialGame = new Chess(currentPuzzle.initialFen);
    gameRef.current = initialGame;
    setFen(currentPuzzle.initialFen);
    setSolutionIndex(0);
    setStatus('intro');
    setAttempts(1);
    setMistakes(0);
    setElapsedTime(0);
    setRightSquareGold(null);
    setWrongSquareRed(null);
    setBestMove('');
    setEvalScore('');
    setLastWrongMove(null);
    setAiExplanation(null);
    setSelectedSquare(null);
    setOptionSquares({});
    setHintSquare(null);
    setHintTargetSquare(null);
    setHintText(null);
    
    if (currentPuzzle.opponentMoveUci) {
      const from = currentPuzzle.opponentMoveUci.substring(0, 2);
      const to = currentPuzzle.opponentMoveUci.substring(2, 4);
      const promotion = currentPuzzle.opponentMoveUci.substring(4, 5) || undefined;
      initialGame.move({ from, to, promotion });
      setFen(initialGame.fen());
      setHistory(initialGame.history());
    }
    setStatus('solving');
    startTimeRef.current = Date.now();
    
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      if (startTimeRef.current) {
        setElapsedTime(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }
    }, 1000);
  };

  const expectedMovesCount = Math.ceil(currentPuzzle.solution.length / 2);
  const accuracyVal = status === 'solved' 
    ? Math.max(0, Math.round((expectedMovesCount / (expectedMovesCount + mistakes)) * 100))
    : 0;

  const THEME_OPTIONS = [
    { id: 'ALL', label: 'All Themes' },
    { id: 'mateIn1', label: '🎯 Mate in 1' },
    { id: 'mateIn2', label: '⚡ Mate in 2' },
    { id: 'mateIn3', label: '👑 Mate in 3' },
    { id: 'fork', label: '🍴 Fork' },
    { id: 'pin', label: '📌 Pin' },
    { id: 'skewer', label: '🗡️ Skewer' },
    { id: 'sacrifice', label: '💥 Sacrifice' },
    { id: 'discoveredAttack', label: '🛡️ Discovered Attack' },
    { id: 'endgame', label: '♟️ Endgame' },
    { id: 'opening', label: '📖 Opening' },
    { id: 'middlegame', label: '⚔️ Middlegame' },
    { id: 'zugzwang', label: '🌀 Zugzwang' },
  ];

  return (
    <div className="space-y-4">
      {/* 🏆 Student Tactical Progress & Growth Banner */}
      {studentStats && (
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/80 border border-slate-800 rounded-3xl p-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            
            {/* Left: Rank & Tactical Rating */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-gold">
                {getStudentRankTitle(studentStats.tacticalRating, studentStats.xp).badge}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-amber-400 uppercase tracking-wide">
                    {getStudentRankTitle(studentStats.tacticalRating, studentStats.xp).title}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {studentStats.xp} XP
                  </span>
                </div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className="text-xl font-extrabold text-white">
                    🏆 {studentStats.tacticalRating}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400">
                    Tactical Rating
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Daily Goal Progress Bar */}
            <div className="flex-1 max-w-xs space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-300 flex items-center gap-1">
                  🎯 Daily Goal: {studentStats.todaySolvedCount} / {studentStats.dailyGoal} Solved
                </span>
                <span className="text-amber-400">
                  {Math.min(100, Math.round((studentStats.todaySolvedCount / studentStats.dailyGoal) * 100))}%
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-emerald-400 rounded-full transition-all duration-500"
                  style={{
                    width: `${Math.min(100, (studentStats.todaySolvedCount / studentStats.dailyGoal) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Right: Streak & Practice Stats */}
            <div className="flex items-center gap-3">
              <div className="px-3.5 py-1.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-center">
                <span className="text-xs font-bold text-amber-400 block">
                  🔥 {studentStats.currentStreak} Day Streak
                </span>
                <span className="text-[10px] text-slate-400">Best: {studentStats.bestStreak}d</span>
              </div>

              <div className="px-3.5 py-1.5 rounded-2xl bg-slate-800/80 border border-slate-700 text-center">
                <span className="text-xs font-bold text-white block">
                  {studentStats.totalSolved} / {studentStats.totalAttempted}
                </span>
                <span className="text-[10px] text-slate-400">Total Solved</span>
              </div>
            </div>
          </div>

          {/* Smart Focus Recommendation Bar */}
          {(() => {
            const weak = getWeakestTheme(studentStats);
            if (!weak) return null;
            return (
              <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span className="text-amber-400 font-bold">🎯 Weakest Theme Focus:</span> 
                  You have <span className="font-bold text-amber-300">{weak.accuracy}% accuracy</span> in <span className="capitalize font-bold text-white">{weak.theme}</span> puzzles.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedTheme(weak.theme);
                    fetchLevelPuzzle(selectedLevel, weak.theme);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-[11px] transition-all"
                >
                  Practice {weak.theme} Puzzles →
                </button>
              </div>
            );
          })()}
        </div>
      )}

      {/* 🎉 Reward Toast Banner */}
      {lastAttemptReward && status === 'solved' && (
        <div className="bg-emerald-950/90 border border-emerald-500/40 text-emerald-200 rounded-2xl p-3.5 flex items-center justify-between shadow-xl animate-bounce">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🎉</span>
            <div>
              <span className="font-extrabold text-white text-sm block">
                Puzzle Solved! +{lastAttemptReward.ratingDelta} Rating | +{lastAttemptReward.xpGain} XP
              </span>
              <span className="text-xs text-emerald-300">
                {lastAttemptReward.isGoalJustCompleted
                  ? '🏆 Daily Goal Completed (+50 Bonus XP)!'
                  : `Current Rank: ${lastAttemptReward.rankBadge} ${lastAttemptReward.rankTitle}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setLastAttemptReward(null)}
            className="text-xs text-emerald-400 hover:text-white underline font-semibold px-2"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Lichess Theme Selector Bar */}
      <div className="bg-slate-900 border border-slate-800/80 rounded-2xl p-3 flex items-center gap-2 overflow-x-auto shadow-md">
        <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider whitespace-nowrap pl-1">
          🎯 Filter Theme:
        </span>
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {THEME_OPTIONS.map((theme) => {
            const isActive = selectedTheme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => {
                  setSelectedTheme(theme.id);
                  fetchLevelPuzzle(selectedLevel, theme.id);
                }}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-gold'
                    : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border-slate-800'
                }`}
              >
                {theme.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-surface-dark border border-slate-800 rounded-3xl p-6 shadow-2xl">
      
      {/* Board Panel */}
      <div className="lg:col-span-2 flex flex-col items-center gap-4">
        <div className="w-full max-w-[540px] aspect-square rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800 relative">
          <ChessboardComponent
            options={{
              position: fen,
              onPieceDrop: handlePieceDrop,
              onSquareClick: ({ square }: { square: string }) => handleSquareClick(square),
              boardOrientation: boardOrientation,
              allowDragging: status === 'solving' || status === 'solved',
              darkSquareStyle: { backgroundColor: 'transparent' },
              lightSquareStyle: { backgroundColor: 'transparent' },
              boardStyle: {
                backgroundImage: "url('https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/boards/walnut.png')",
                backgroundSize: 'cover',
              },
              squareStyles: {
                ...optionSquares,
                ...(rightSquareGold ? { [rightSquareGold]: { backgroundColor: 'rgba(212, 175, 55, 0.4)' } } : {}),
                ...(wrongSquareRed ? { [wrongSquareRed]: { backgroundColor: 'rgba(239, 68, 68, 0.4)' } } : {}),
                ...(hintSquare ? { [hintSquare]: { backgroundColor: 'rgba(245, 158, 11, 0.65)', boxShadow: 'inset 0 0 0 4px #f59e0b' } } : {}),
                ...(hintTargetSquare ? { [hintTargetSquare]: { backgroundColor: 'rgba(16, 185, 129, 0.65)', boxShadow: 'inset 0 0 0 4px #10b981' } } : {}),
              },
              pieces: customChessPieces,
            }}
          />
        </div>

        {/* Active Hint Banner */}
        {hintText && (
          <div className="w-full max-w-[540px] bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold px-4 py-2.5 rounded-2xl text-center shadow-lg animate-pulse flex items-center justify-between">
            <span>{hintText}</span>
            <button
              type="button"
              onClick={() => {
                setHintSquare(null);
                setHintTargetSquare(null);
                setHintText(null);
              }}
              className="text-[10px] text-amber-400 hover:text-white underline font-semibold ml-2"
            >
              Clear
            </button>
          </div>
        )}

        {/* Board Controls */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setBoardOrientation(boardOrientation === 'white' ? 'black' : 'white')}
            className="text-white border-slate-700 hover:bg-slate-800"
          >
            <DashboardIcon iconKey="refresh" className="w-4 h-4 mr-1.5" />
            Flip Board
          </Button>

          {status === 'solved' && (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleUndo}
                className="text-white border-slate-700 hover:bg-slate-800"
              >
                <DashboardIcon iconKey="arrowLeft" className="w-4 h-4 mr-1.5" />
                Undo
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={triggerStockfishAnalysis}
                disabled={analyzing}
                className="border-slate-700 hover:bg-slate-800 text-white bg-slate-800/50"
              >
                {analyzing ? 'Analyzing...' : 'Ask Stockfish'}
              </Button>
            </>
          )}

          {status === 'solving' && (
            <>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={handleGetHint}
                className="bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40 font-bold"
              >
                💡 Hint
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleReset}
                className="text-white border-slate-700 hover:bg-slate-800"
              >
                Restart
              </Button>
            </>
          )}

          {(status === 'solved' || status === 'failed') && (
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleNextPuzzle}
              disabled={loadingNext}
              className="bg-accent hover:bg-accent-hover text-surface-dark font-extrabold flex items-center gap-1.5"
            >
              {loadingNext ? 'Loading...' : 'Next Puzzle ➔'}
            </Button>
          )}
        </div>
      </div>

      {/* Info & Results Sidebar */}
      <div className="flex flex-col justify-between bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl h-full min-h-[400px]">
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-accent tracking-wide uppercase">
            Tactics & Practice Arena
          </h3>

          {/* Difficulty Level Selector */}
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
              Practice Difficulty Level
            </span>
            <select
              value={selectedLevel}
              onChange={(e) => {
                const newLevel = e.target.value as any;
                setSelectedLevel(newLevel);
                triggerFetchLevelPuzzle(newLevel);
              }}
              className="w-full bg-slate-950/50 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-accent transition-all font-bold cursor-pointer"
            >
              <option value="Beginner">Beginner (Rating &lt; 1200)</option>
              <option value="Intermediate">Intermediate (1200 - 1599)</option>
              <option value="Advanced">Advanced (1600 - 1999)</option>
              <option value="Expert">Expert (2000 - 2399)</option>
              <option value="Master">Master (Rating &gt;= 2400)</option>
            </select>
          </div>

          {/* Status Message */}
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold border flex flex-col gap-2 ${
              message.type === 'success'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : message.type === 'error'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-slate-950/60 text-slate-300 border-slate-800'
            }`}
          >
            <div>{message.text}</div>
            
            {message.type === 'error' && lastWrongMove && (
              <button
                type="button"
                onClick={handleAskAI}
                disabled={aiLoading}
                className="mt-1 text-[10px] font-bold text-accent hover:underline text-left uppercase tracking-wider flex items-center gap-1.5 focus:outline-none disabled:opacity-50"
              >
                {aiLoading ? 'Asking Coach...' : '💡 Ask Coach AI Explainer'}
              </button>
            )}
          </div>

          {/* AI Explanation Speech Bubble */}
          {aiExplanation && (
            <div className="bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl relative mt-2 text-xs text-slate-200">
              <span className="text-[10px] text-accent font-bold uppercase tracking-wider block mb-1">
                AI Coach Insight
              </span>
              <p className="italic leading-normal text-slate-300">&ldquo;{aiExplanation}&rdquo;</p>
            </div>
          )}

          {/* Solver Stats */}
          <div className="bg-slate-950/60 p-4 rounded-xl space-y-3 border border-slate-800 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1">
                <DashboardIcon iconKey="clock" className="w-3.5 h-3.5" /> Time:
              </span>
              <span className="font-mono font-bold text-white">
                {Math.floor(elapsedTime / 60)}m {elapsedTime % 60}s
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400 flex items-center gap-1">
                <DashboardIcon iconKey="target" className="w-3.5 h-3.5" /> Accuracy:
              </span>
              <span className="font-mono font-bold text-accent">
                {status === 'solved' ? accuracyVal : '—'} %
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-400">Attempts:</span>
              <span className="font-mono font-bold text-white">{attempts}</span>
            </div>
          </div>

          {/* Puzzle Details */}
          <div className="space-y-2 text-xs">
            <div className="bg-slate-950/30 border border-slate-850 p-3 rounded-xl">
              <span className="text-slate-500 block mb-1">Target moves</span>
              <span className="font-semibold">{expectedMovesCount} correct moves</span>
            </div>
            <div className="bg-slate-950/30 border border-slate-850 p-3 rounded-xl">
              <span className="text-slate-500 block mb-1">Themes</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {currentPuzzle.themes.map((t) => (
                  <span
                    key={t}
                    className="text-[9px] bg-slate-800 text-slate-350 px-1.5 py-0.5 rounded font-mono uppercase"
                  >
                    {t.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Stockfish Panel (Solved only) */}
        {status === 'solved' && (bestMove || evalScore) && (
          <div className="bg-slate-950/60 p-4 rounded-xl space-y-2 border border-slate-800 text-xs mt-4">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">
              Analysis After Solve
            </span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-slate-400">Evaluation:</span>
                <span className="font-mono ml-1.5 font-semibold text-accent">
                  {evalScore ? `${parseFloat(evalScore) > 0 ? '+' : ''}${evalScore}` : '—'}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Best Move:</span>
                <span className="font-mono ml-1.5 font-bold text-green-400 uppercase">
                  {bestMove || '—'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Move History */}
        <div className="space-y-2 pt-4 border-t border-slate-800/80">
          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
            Move History
          </span>
          <div className="bg-slate-950/40 border border-slate-800/60 p-2.5 rounded-xl max-h-[140px] overflow-y-auto">
            {history.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">No moves played yet.</p>
            ) : (
              <div className="grid grid-cols-2 gap-x-2 text-[11px] font-mono">
                {history.map((move, idx) => {
                  if (idx % 2 === 0) {
                    const moveNum = Math.floor(idx / 2) + 1;
                    return (
                      <div key={idx} className="col-span-2 flex justify-between py-0.5">
                        <span className="text-slate-500">{moveNum}.</span>
                        <span className="font-semibold text-slate-200">{move}</span>
                        <span className="font-semibold text-slate-350">
                          {history[idx + 1] || ''}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}
