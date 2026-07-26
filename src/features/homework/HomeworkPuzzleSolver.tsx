'use client';

import React, {
  useState, useEffect, useRef, useCallback, useMemo,
} from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import type {
  StudentPuzzleView, DbStudentPuzzleAttempt,
  PuzzleMoveResult,
} from '@/types/homework-puzzles';
import { THEME_CONFIG, MAX_ATTEMPTS } from '@/types/homework-puzzles';

const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => mod.Chessboard),
  { ssr: false }
) as any;

// ─── Score / Attempt helpers ───────────────────────────────────────────────────
function scoreColor(score: number): string {
  if (score >= 90)  return 'text-emerald-600 bg-emerald-50';
  if (score >= 70)  return 'text-amber-600 bg-amber-50';
  if (score >= 50)  return 'text-orange-600 bg-orange-50';
  return 'text-red-600 bg-red-50';
}

function difficultyBadge(difficulty: string) {
  const map: Record<string, string> = {
    beginner:     'bg-emerald-100 text-emerald-800',
    intermediate: 'bg-blue-100 text-blue-800',
    advanced:     'bg-purple-100 text-purple-800',
    expert:       'bg-orange-100 text-orange-800',
    master:       'bg-red-100 text-red-800',
  };
  return map[difficulty] ?? 'bg-slate-100 text-slate-800';
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface HomeworkPuzzleSolverProps {
  puzzle:         StudentPuzzleView;
  assignmentId:   string;
  attempt?:       DbStudentPuzzleAttempt | null;
  onNext:         (result: PuzzleMoveResult | null) => void;
  isLast:         boolean;
  puzzleNumber:   number;
  totalPuzzles:   number;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function HomeworkPuzzleSolver({
  puzzle, assignmentId, attempt, onNext, isLast, puzzleNumber, totalPuzzles,
}: HomeworkPuzzleSolverProps) {
  // Determine who plays (white or black)
  const playerColor = useMemo((): 'white' | 'black' => {
    try {
      const g = new Chess(puzzle.fen);
      return g.turn() === 'w' ? 'white' : 'black';
    } catch {
      return 'white';
    }
  }, [puzzle.fen]);

  const initialGame = useMemo(() => {
    try {
      return new Chess(puzzle.fen);
    } catch {
      return new Chess(); // fallback to standard position
    }
  }, [puzzle.fen]);

  const gameRef = useRef<Chess>(initialGame);
  const [fen, setFen] = useState(puzzle.fen);
  const [status, setStatus] = useState<'idle' | 'solving' | 'correct' | 'wrong' | 'failed' | 'solved'>('idle');
  const [attemptsUsed, setAttemptsUsed] = useState(attempt?.attempts_used ?? 0);
  const [hintsUsed, setHintsUsed] = useState(attempt?.hints_used ?? 0);
  const [score, setScore] = useState(attempt?.score ?? 0);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'warn' }>({ text: 'Make your move!', type: 'info' });
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [solutionRevealed, setSolutionRevealed] = useState(attempt?.solution_unlocked ?? false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRequestingHint, setIsRequestingHint] = useState(false);
  const [currentHint, setCurrentHint] = useState<string | null>(null);
  const [hintLevel, setHintLevel] = useState<1 | 2 | 3>(1);
  const [elapsedSeconds, setElapsedSeconds] = useState(attempt?.time_seconds ?? 0);
  const [rightSquare, setRightSquare] = useState<string | null>(null);
  const [wrongSquare, setWrongSquare]  = useState<string | null>(null);
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const isAlreadySolved = attempt?.status === 'solved';
  const isAlreadyFailed = attempt?.status === 'failed';
  const isPreviouslyDone = isAlreadySolved || isAlreadyFailed;

  // Sync with existing attempt state
  useEffect(() => {
    try { gameRef.current = new Chess(puzzle.fen); } catch {}
    setFen(puzzle.fen);
    setAttemptsUsed(attempt?.attempts_used ?? 0);
    setHintsUsed(attempt?.hints_used ?? 0);
    setScore(attempt?.score ?? 0);
    setSolutionRevealed(attempt?.solution_unlocked ?? false);
    setCurrentHint(null);
    setHintLevel(1);
    setRightSquare(null);
    setWrongSquare(null);
    setSelectedSquare(null);
    setOptionSquares({});
    setStatus(
      attempt?.status === 'solved' ? 'solved' :
      attempt?.status === 'failed' ? 'failed' : 'idle'
    );
    setMessage(
      attempt?.status === 'solved'
        ? { text: `✅ Already solved! +${attempt.score} pts`, type: 'success' }
        : attempt?.status === 'failed'
        ? { text: '❌ Attempts exhausted. Check the solution.', type: 'error' }
        : { text: '♟️ Make your move!', type: 'info' }
    );
  }, [puzzle.id, attempt]);

  // Timer
  useEffect(() => {
    if (isPreviouslyDone) return;
    timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [puzzle.id, isPreviouslyDone]);

  // Flash squares helper
  const flashSquare = useCallback((sq: string, type: 'right' | 'wrong') => {
    if (type === 'right') {
      setRightSquare(sq);
      setTimeout(() => setRightSquare(null), 1200);
    } else {
      setWrongSquare(sq);
      setTimeout(() => setWrongSquare(null), 800);
    }
  }, []);

  // Legal move dots
  const onSquareClick = useCallback((square: string) => {
    if (status === 'solved' || status === 'failed') return;
    const moves = gameRef.current.moves({ square: square as any, verbose: true });
    if (moves.length > 0) {
      setSelectedSquare(square);
      const dots: Record<string, React.CSSProperties> = {};
      moves.forEach((m: any) => {
        dots[m.to] = {
          background: 'radial-gradient(circle, rgba(0,0,0,0.25) 30%, transparent 31%)',
          borderRadius: '50%',
        };
      });
      setOptionSquares(dots);
    } else {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  }, [status]);

  // Main move handler
  const onDrop = useCallback(async (
    sourceSquare: string,
    targetSquare: string,
    piece: string
  ): Promise<boolean> => {
    if (status === 'solved' || status === 'failed' || isSubmitting) return false;
    if (isPreviouslyDone) return false;

    const uciMove = `${sourceSquare}${targetSquare}`;
    setIsSubmitting(true);
    setSelectedSquare(null);
    setOptionSquares({});
    setStatus('solving');

    try {
      const res = await fetch('/api/homework/move', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, puzzleId: puzzle.id, uciMove, timeSeconds: elapsedSeconds }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMessage({ text: json.error || 'Server error', type: 'error' });
        setStatus('idle');
        return false;
      }
      const result: PuzzleMoveResult = json.result;

      if (result.correct) {
        // Apply move on board
        try {
          gameRef.current.move({ from: sourceSquare as any, to: targetSquare as any, promotion: 'q' });
          setFen(gameRef.current.fen());
        } catch {}
        flashSquare(targetSquare, 'right');
        setScore(result.scoreEarned);
        setAttemptsUsed((a) => a + 1);
        setStatus('solved');
        setMessage({ text: result.message, type: 'success' });
        if (timerRef.current) clearInterval(timerRef.current);
      } else {
        flashSquare(targetSquare, 'wrong');
        const newAttempts = attemptsUsed + 1;
        setAttemptsUsed(newAttempts);
        if (result.isComplete) {
          setStatus('failed');
          setMessage({ text: result.message, type: 'error' });
          if (timerRef.current) clearInterval(timerRef.current);
        } else {
          setStatus('idle');
          setMessage({ text: result.message, type: result.attemptsLeft === 1 ? 'warn' : 'error' });
        }
      }

      return result.correct;
    } catch {
      setMessage({ text: 'Network error. Try again.', type: 'error' });
      setStatus('idle');
      return false;
    } finally {
      setIsSubmitting(false);
    }
  }, [status, isSubmitting, isPreviouslyDone, assignmentId, puzzle.id, attemptsUsed, elapsedSeconds, flashSquare]);

  // Request AI hint
  const handleHint = useCallback(async () => {
    if (isRequestingHint || status === 'solved' || status === 'failed') return;
    const nextLevel = hintsUsed < 3 ? ((hintsUsed + 1) as 1 | 2 | 3) : 3;
    setIsRequestingHint(true);
    try {
      // 1. Fetch official hint from endpoint
      const res = await fetch('/api/homework/hint', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignmentId, puzzleId: puzzle.id, hintLevel: nextLevel }),
      });
      const json = await res.json();

      // 2. Fetch AI tactical hint via Server Action
      const { requestAiHintAction } = await import('@/actions/homeworkAi');
      const aiRes = await requestAiHintAction(puzzle.fen, puzzle.solution?.[0] || 'e2e4', puzzle.title);

      if (res.ok) {
        const hintText = aiRes.success && aiRes.hint ? `${json.hint.hintText} ${aiRes.hint}` : json.hint.hintText;
        setCurrentHint(hintText);
        setHintLevel(nextLevel);
        if (!json.hint.alreadyUsed) setHintsUsed((h) => h + 1);

        // Stage 1 visual hint: Highlight source or target square if available
        if (aiRes.targetSquare) {
          setOptionSquares({
            [aiRes.targetSquare]: {
              boxShadow: 'inset 0 0 0 4px #f59e0b',
              backgroundColor: 'rgba(245, 158, 11, 0.2)',
            },
          });
        }
      }
    } catch (err) {
      console.warn('Hint fetch error:', err);
    } finally {
      setIsRequestingHint(false);
    }
  }, [isRequestingHint, status, hintsUsed, assignmentId, puzzle.id, puzzle.fen, puzzle.solution, puzzle.title]);

  // Reveal solution
  const handleRevealSolution = useCallback(async () => {
    try {
      const res = await fetch('/api/homework/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'solution', assignmentId, puzzleId: puzzle.id }),
      });
      const json = await res.json();
      if (res.ok) {
        setSolutionMoves(json.unlock.solution ?? []);
        setSolutionRevealed(true);
        setMessage({ text: '📖 Solution revealed. Study and learn!', type: 'info' });
      }
    } catch {}
  }, [assignmentId, puzzle.id]);

  // Format time
  const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // Attempt indicators
  const attemptDots = Array.from({ length: MAX_ATTEMPTS }, (_, i) => {
    if (i < attemptsUsed) {
      return status === 'solved' && i === attemptsUsed - 1
        ? 'bg-emerald-500'
        : 'bg-red-400';
    }
    return 'bg-slate-200';
  });

  // Highlight squares
  const customSquareStyles: Record<string, React.CSSProperties> = {
    ...optionSquares,
    ...(selectedSquare ? { [selectedSquare]: { background: 'rgba(99,102,241,0.35)' } } : {}),
    ...(rightSquare ? { [rightSquare]: { background: 'rgba(34,197,94,0.55)' } } : {}),
    ...(wrongSquare ? { [wrongSquare]: { background: 'rgba(239,68,68,0.55)' } } : {}),
  };

  const themeInfo = THEME_CONFIG[puzzle.theme] ?? { label: puzzle.theme, emoji: '⚔️', color: '#6366f1' };
  const hintsRemaining = 3 - hintsUsed;
  const attemptsRemaining = MAX_ATTEMPTS - attemptsUsed;
  const isDone = status === 'solved' || status === 'failed' || isAlreadySolved || isAlreadyFailed;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
      {/* ── Header ── */}
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: puzzle info */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-primary/10 text-primary font-bold text-sm">
              {puzzleNumber}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-text-primary">{puzzle.title}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${difficultyBadge(puzzle.difficulty)}`}>
                  {puzzle.difficulty.charAt(0).toUpperCase() + puzzle.difficulty.slice(1)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-[11px] text-text-secondary">
                  {themeInfo.emoji} {themeInfo.label}
                </span>
                <span className="text-[11px] text-text-secondary">·</span>
                <span className="text-[11px] text-text-secondary">Rating: {puzzle.rating}</span>
              </div>
            </div>
          </div>

          {/* Right: progress counter */}
          <div className="flex items-center gap-3">
            <div className="text-[11px] font-medium text-text-secondary">
              Puzzle <span className="font-bold text-primary">{puzzleNumber}</span> of {totalPuzzles}
            </div>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPuzzles }, (_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 < puzzleNumber ? 'w-4 bg-emerald-400' :
                    i + 1 === puzzleNumber ? 'w-6 bg-primary' : 'w-4 bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="flex flex-col lg:flex-row gap-0">
        {/* Board */}
        <div className="flex-shrink-0 p-5 flex flex-col items-center gap-4">
          {/* Turn indicator */}
          <div className="flex items-center gap-2 text-xs text-text-secondary font-medium">
            <div className={`w-3 h-3 rounded-full border-2 ${playerColor === 'white' ? 'bg-white border-slate-400' : 'bg-slate-800 border-slate-600'}`} />
            <span>{playerColor === 'white' ? 'White' : 'Black'} to move</span>
          </div>

          <div className="w-full max-w-[420px] rounded-xl overflow-hidden shadow-md">
            <ChessboardComponent
              position={fen}
              onPieceDrop={onDrop}
              onSquareClick={onSquareClick}
              boardOrientation={playerColor}
              arePiecesDraggable={!isDone && !isSubmitting}
              customSquareStyles={customSquareStyles}
              animationDuration={250}
            />
          </div>

          {/* Timer */}
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-mono font-bold text-text-primary">{formatTime(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Side panel */}
        <div className="flex-1 border-t lg:border-t-0 lg:border-l border-border p-5 flex flex-col gap-4">

          {/* Message banner */}
          <div className={`rounded-xl px-4 py-3 text-sm font-medium transition-all ${
            message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
            message.type === 'error'   ? 'bg-red-50 text-red-700 border border-red-200' :
            message.type === 'warn'    ? 'bg-amber-50 text-amber-700 border border-amber-200' :
            'bg-blue-50 text-blue-700 border border-blue-200'
          }`}>
            {message.text}
          </div>

          {/* Attempts */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">Attempts</div>
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                {attemptDots.map((cls, i) => (
                  <div key={i} className={`w-4 h-4 rounded-full ${cls} transition-colors`} />
                ))}
              </div>
              <span className="text-xs text-text-secondary">
                {isDone ? (status === 'solved' || isAlreadySolved ? 'Solved ✅' : 'Failed ❌') : `${attemptsRemaining} left`}
              </span>
            </div>
          </div>

          {/* Score */}
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">Score</div>
            <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${scoreColor(score)}`}>
              <span>⭐</span>
              <span>{score} pts</span>
            </div>
            {hintsUsed > 0 && (
              <div className="mt-1 text-[11px] text-amber-600">
                💡 {hintsUsed} hint{hintsUsed > 1 ? 's' : ''} used (−{[0,10,25,45][hintsUsed]}pts penalty)
              </div>
            )}
          </div>

          {/* Hint panel */}
          {!isDone && (
            <div className="border border-dashed border-amber-300 rounded-xl p-3 bg-amber-50/50">
              <div className="text-[11px] font-bold uppercase tracking-wider text-amber-700 mb-1.5">
                💡 Hints ({hintsRemaining} remaining)
              </div>
              {currentHint ? (
                <p className="text-xs text-amber-800 leading-relaxed">{currentHint}</p>
              ) : (
                <p className="text-[11px] text-amber-600 italic">Click a hint button to get a clue (costs points)</p>
              )}
              {hintsRemaining > 0 && (
                <button
                  onClick={handleHint}
                  disabled={isRequestingHint}
                  className="mt-2 text-[11px] font-bold text-amber-700 border border-amber-400 rounded-lg px-3 py-1 hover:bg-amber-100 transition-colors disabled:opacity-50"
                >
                  {isRequestingHint ? '...' : `Get Hint ${hintsUsed + 1} (−${[10, 15, 20][hintsUsed]}pts)`}
                </button>
              )}
            </div>
          )}

          {/* Solution reveal (after failure) */}
          {(status === 'failed' || isAlreadyFailed) && !solutionRevealed && (
            <button
              onClick={handleRevealSolution}
              className="w-full py-2.5 rounded-xl border-2 border-dashed border-indigo-400 text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-colors"
            >
              📖 Reveal Solution
            </button>
          )}

          {/* Solution display */}
          {solutionRevealed && solutionMoves.length > 0 && (
            <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-indigo-700 mb-2">📖 Solution</div>
              <div className="flex flex-wrap gap-1.5">
                {solutionMoves.map((move, i) => (
                  <span key={i} className="px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded text-xs font-mono font-bold">
                    {i + 1}. {move}
                  </span>
                ))}
              </div>
              {puzzle.explanation && (
                <p className="mt-2 text-xs text-indigo-700 leading-relaxed">{puzzle.explanation}</p>
              )}
            </div>
          )}

          {/* Solution display when already solved with explanation */}
          {(isAlreadySolved || status === 'solved') && puzzle.explanation && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3">
              <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 mb-1">💬 Explanation</div>
              <p className="text-xs text-emerald-800 leading-relaxed">{puzzle.explanation}</p>
            </div>
          )}

          {/* Next button */}
          <div className="mt-auto pt-2">
            {isDone && (
              <button
                onClick={() => onNext(null)}
                className="w-full py-3 rounded-xl bg-primary text-white font-bold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {isLast ? '🏁 Finish Homework' : '→ Next Puzzle'}
              </button>
            )}
            {!isDone && status === 'idle' && (
              <p className="text-center text-[11px] text-text-secondary italic">Make a move on the board to proceed</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
