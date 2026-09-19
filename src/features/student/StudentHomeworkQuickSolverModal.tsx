'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

export interface QuickSolverPuzzle {
  id: string;
  title: string;
  fen: string;
  solution: string[];
  theme: string;
  difficulty: string;
  rating: number;
  hint_1?: string | null;
  explanation?: string | null;
}

const FALLBACK_PUZZLES: QuickSolverPuzzle[] = [
  {
    id: 'seed-puzzle-1',
    title: 'Back Rank Checkmate Pattern',
    fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
    solution: ['b1b8'],
    theme: 'Back Rank Mate',
    difficulty: 'beginner',
    rating: 1200,
    hint_1: "Look at Black's weak back rank guarded only by pawns.",
    explanation: 'Rb8# delivers checkmate on the undefended 8th rank.',
  },
  {
    id: 'seed-puzzle-2',
    title: 'Smothered Knight Checkmate',
    fen: '6rk/5Npp/8/8/8/8/5PPP/6K1 w - - 0 1',
    solution: ['f7h6', 'g8h8', 'f7f7'],
    theme: 'Smothered Mate',
    difficulty: 'intermediate',
    rating: 1450,
    hint_1: 'The king is trapped by its own rook and pawns.',
    explanation: 'Nf7# smothers the king with a beautiful knight checkmate.',
  },
  {
    id: 'seed-puzzle-3',
    title: 'Royal Knight Fork',
    fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/R1BQK2R w KQkq - 0 1',
    solution: ['c4f7', 'e8f7', 'f3e5'],
    theme: 'Knight Forks',
    difficulty: 'beginner',
    rating: 1300,
    hint_1: 'Target the weak f7 square to draw the king into an open fork.',
    explanation: 'Bxf7+ forces the king out and allows a decisive knight fork.',
  },
  {
    id: 'seed-puzzle-4',
    title: 'Absolute Pin on Queen',
    fen: 'r1b1k2r/pppp1ppp/8/4q3/8/8/PPP2PPP/R1B1KB1R w KQkq - 0 1',
    solution: ['c1e3'],
    theme: 'Pin Tactics',
    difficulty: 'beginner',
    rating: 1250,
    hint_1: 'Develop the bishop to shield check safely.',
    explanation: 'Be3 blocks the check safely.',
  },
  {
    id: 'seed-puzzle-5',
    title: 'Skewer on King and Rook',
    fen: '8/8/4k3/8/3Q4/8/4K3/8 w - - 0 1',
    solution: ['d4e4'],
    theme: 'Skewer Attacks',
    difficulty: 'intermediate',
    rating: 1400,
    hint_1: 'Centralize the queen with check.',
    explanation: 'Qe4+ checks the king and controls critical escape squares.',
  },
];

interface StudentHomeworkQuickSolverModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTheme?: string;
  onPuzzleSolved?: () => void;
}

export default function StudentHomeworkQuickSolverModal({
  isOpen,
  onClose,
  initialTheme,
  onPuzzleSolved,
}: StudentHomeworkQuickSolverModalProps) {
  const [puzzles, setPuzzles] = useState<QuickSolverPuzzle[]>(FALLBACK_PUZZLES);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [game, setGame] = useState<Chess>(new Chess());
  const [status, setStatus] = useState<'idle' | 'solving' | 'correct' | 'wrong' | 'solved'>('idle');
  const [message, setMessage] = useState<{ text: string; type: 'info' | 'success' | 'error' }>({
    text: 'White to play and find the best move!',
    type: 'info',
  });
  const [showHint, setShowHint] = useState(false);
  const [moveIndex, setMoveIndex] = useState(0);
  const [customSquareStyles, setCustomSquareStyles] = useState<Record<string, React.CSSProperties>>({});
  const [solvedCount, setSolvedCount] = useState(0);

  // Filter or prioritize puzzles by theme if provided
  useEffect(() => {
    if (!initialTheme) {
      setPuzzles(FALLBACK_PUZZLES);
      setCurrentIndex(0);
      return;
    }
    const matching = FALLBACK_PUZZLES.filter(
      (p) =>
        p.theme.toLowerCase().includes(initialTheme.toLowerCase()) ||
        initialTheme.toLowerCase().includes(p.theme.toLowerCase())
    );
    const nonMatching = FALLBACK_PUZZLES.filter(
      (p) =>
        !p.theme.toLowerCase().includes(initialTheme.toLowerCase()) &&
        !initialTheme.toLowerCase().includes(p.theme.toLowerCase())
    );
    const combined = [...matching, ...nonMatching];
    setPuzzles(combined.length > 0 ? combined : FALLBACK_PUZZLES);
    setCurrentIndex(0);
  }, [initialTheme]);

  const currentPuzzle = puzzles[currentIndex] || FALLBACK_PUZZLES[0];

  const orientation = useMemo((): 'white' | 'black' => {
    try {
      const c = new Chess(currentPuzzle.fen);
      return c.turn() === 'w' ? 'white' : 'black';
    } catch {
      return 'white';
    }
  }, [currentPuzzle.fen]);

  // Reset board when current puzzle changes
  useEffect(() => {
    if (!isOpen) return;
    try {
      const g = new Chess(currentPuzzle.fen);
      setGame(g);
      setMoveIndex(0);
      setStatus('idle');
      setShowHint(false);
      setCustomSquareStyles({});
      const turnName = g.turn() === 'w' ? 'White' : 'Black';
      setMessage({
        text: `${turnName} to move — find the best tactical combination!`,
        type: 'info',
      });
    } catch {
      setGame(new Chess());
    }
  }, [currentPuzzle, isOpen]);

  // Clean move notation comparison (matches both UCI "b1b8" and SAN "Rb8#")
  const isMoveMatchingSolution = useCallback(
    (moveObj: { from: string; to: string; san?: string }, expected: string): boolean => {
      if (!expected) return false;
      const cleanExpected = expected.replace(/[+#x=]/g, '').toLowerCase();
      const uci = `${moveObj.from}${moveObj.to}`.toLowerCase();
      const cleanSan = (moveObj.san || '').replace(/[+#x=]/g, '').toLowerCase();
      return uci === cleanExpected || cleanSan === cleanExpected || cleanExpected.includes(uci);
    },
    []
  );

  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string): boolean => {
      if (status === 'solved') return false;

      try {
        const gameCopy = new Chess(game.fen());
        const move = gameCopy.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: 'q',
        });

        if (!move) return false;

        const expectedMove = currentPuzzle.solution[moveIndex];
        const isCorrect = isMoveMatchingSolution(move, expectedMove);

        if (isCorrect) {
          setGame(gameCopy);
          setCustomSquareStyles({
            [sourceSquare]: { backgroundColor: 'rgba(34, 197, 94, 0.4)' },
            [targetSquare]: { backgroundColor: 'rgba(34, 197, 94, 0.6)' },
          });

          const nextIndex = moveIndex + 1;
          setMoveIndex(nextIndex);

          // Check if puzzle is fully completed
          if (nextIndex >= currentPuzzle.solution.length) {
            setStatus('solved');
            setMessage({
              text: '🎉 Brilliant! Puzzle Solved (+25 XP)',
              type: 'success',
            });
            setSolvedCount((c) => c + 1);
            onPuzzleSolved?.();
          } else {
            // Play computer response move
            const computerMoveStr = currentPuzzle.solution[nextIndex];
            setStatus('solving');
            setMessage({ text: 'Best move! Opponent responding...', type: 'info' });

            setTimeout(() => {
              try {
                const afterComp = new Chess(gameCopy.fen());
                // Try playing computer move
                let compMove = null;
                try {
                  compMove = afterComp.move(computerMoveStr);
                } catch {
                  if (computerMoveStr.length >= 4) {
                    compMove = afterComp.move({
                      from: computerMoveStr.slice(0, 2),
                      to: computerMoveStr.slice(2, 4),
                      promotion: 'q',
                    });
                  }
                }
                if (compMove) {
                  setGame(afterComp);
                  setMoveIndex(nextIndex + 1);
                  setCustomSquareStyles({
                    [compMove.from]: { backgroundColor: 'rgba(234, 179, 8, 0.3)' },
                    [compMove.to]: { backgroundColor: 'rgba(234, 179, 8, 0.5)' },
                  });
                  setMessage({ text: 'Your turn — finish the combination!', type: 'info' });
                }
              } catch (err) {
                console.warn('Computer move error:', err);
              }
            }, 600);
          }
          return true;
        } else {
          // Incorrect move
          setStatus('wrong');
          setMessage({
            text: '❌ Not the best move. Think carefully and try again!',
            type: 'error',
          });
          setCustomSquareStyles({
            [sourceSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.4)' },
            [targetSquare]: { backgroundColor: 'rgba(239, 68, 68, 0.6)' },
          });
          setTimeout(() => {
            setCustomSquareStyles({});
          }, 1000);
          return false;
        }
      } catch {
        return false;
      }
    },
    [game, currentPuzzle, moveIndex, status, isMoveMatchingSolution, onPuzzleSolved]
  );

  const handleNextPuzzle = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      const next = (currentIndex + 1) % puzzles.length;
      setCurrentIndex(next);
    },
    [currentIndex, puzzles.length]
  );

  const handleResetPosition = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      try {
        const g = new Chess(currentPuzzle.fen);
        setGame(g);
        setMoveIndex(0);
        setStatus('idle');
        setCustomSquareStyles({});
        const turnName = g.turn() === 'w' ? 'White' : 'Black';
        setMessage({
          text: `${turnName} to move — find the best tactical combination!`,
          type: 'info',
        });
      } catch {}
    },
    [currentPuzzle.fen]
  );

  const handleToggleHint = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setShowHint((prev) => !prev);
  }, []);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-700/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/4 right-1/4 h-1 bg-gradient-to-r from-amber-400 via-emerald-400 to-amber-400 blur-sm" />

        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xl shadow-gold flex-shrink-0">
              🧩
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black text-white tracking-tight">
                  {currentPuzzle.title}
                </h3>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-black uppercase tracking-wider">
                  {currentPuzzle.theme}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Puzzle {currentIndex + 1} of {puzzles.length} • Rating {currentPuzzle.rating} •{' '}
                <span className="capitalize">{currentPuzzle.difficulty}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-all"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex flex-col items-center">
          {/* Status Alert Banner */}
          <div
            className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold text-center border transition-all ${
              message.type === 'success'
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-200'
                : message.type === 'error'
                ? 'bg-red-500/20 border-red-500/50 text-red-200 animate-shake'
                : 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200'
            }`}
          >
            {message.text}
          </div>

          {/* Chessboard Container */}
          <div className="w-full max-w-[380px] sm:max-w-[420px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-2 border-slate-700/60 bg-slate-950 p-2">
            <ChessboardComponent
              position={game.fen()}
              onPieceDrop={handlePieceDrop}
              boardOrientation={orientation}
              customSquareStyles={customSquareStyles}
              customBoardStyle={{
                borderRadius: '12px',
                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
              }}
              customDarkSquareStyle={{ backgroundColor: '#475569' }}
              customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
              arePiecesDraggable={status !== 'solved'}
            />
          </div>

          {/* Hint Card (Collapsible) */}
          {showHint && (
            <div className="w-full p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200 flex items-start gap-2.5 animate-fadeIn">
              <span className="text-base">💡</span>
              <div className="space-y-0.5">
                <span className="font-extrabold block text-amber-300">Tactical Clue:</span>
                <span>{currentPuzzle.hint_1 || currentPuzzle.explanation || 'Focus on king safety and overloaded defenders!'}</span>
              </div>
            </div>
          )}

          {/* Explanation on solved */}
          {status === 'solved' && currentPuzzle.explanation && (
            <div className="w-full p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-xs text-emerald-200 flex items-start gap-2.5 animate-fadeIn">
              <span className="text-base">🧠</span>
              <div className="space-y-0.5">
                <span className="font-extrabold block text-emerald-300">Grandmaster Breakdown:</span>
                <span>{currentPuzzle.explanation}</span>
              </div>
            </div>
          )}

          {/* Controls / Action Bar */}
          <div className="w-full flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleToggleHint}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <span>💡</span>
                <span>{showHint ? 'Hide Hint' : 'Need Hint'}</span>
              </button>

              <button
                type="button"
                onClick={handleResetPosition}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>Reset</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleNextPuzzle}
              className={`px-5 py-2 font-black text-xs rounded-xl transition-all shadow-lg flex items-center gap-2 ${
                status === 'solved'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-900/40'
                  : 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 shadow-gold'
              }`}
            >
              <span>{status === 'solved' ? 'Next Challenge' : 'Skip Puzzle'}</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        {/* Modal Footer with Daily Solved Counter */}
        <div className="px-6 py-3 border-t border-slate-800/80 bg-slate-950 flex items-center justify-between text-xs text-slate-400">
          <span>⚡ Daily Solved: {solvedCount}</span>
          <span className="text-amber-400 font-bold">Earn +25 Academy XP per correct solve</span>
        </div>
      </div>
    </div>
  );
}
