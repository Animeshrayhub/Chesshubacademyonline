'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { customChessPieces } from '@/components/dashboard/ui/ChessPieces';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

export interface MateIn2Puzzle {
  id: number;
  title: string;
  subtitle: string;
  fen: string;
  orientation: 'white' | 'black';
  targetMoves: { from: string; to: string }[];
}

export const HERO_MATE_IN_2_PUZZLES: MateIn2Puzzle[] = [
  {
    id: 1,
    title: "Back Rank Hook Mate",
    subtitle: "White to move & mate in 2",
    fen: "1r1k4/2R4R/8/8/8/6pP/PPP4q/K1B5 w - - 0 1",
    orientation: "white",
    targetMoves: [
      { from: "c1", to: "g5" },
      { from: "h7", to: "h8" },
    ],
  },
  {
    id: 2,
    title: "Knight & Rook Arabian Mate",
    subtitle: "White to move & mate in 2",
    fen: "r6k/n2R4/8/8/4N3/5p2/5K2/8 w - - 0 1",
    orientation: "white",
    targetMoves: [
      { from: "e4", to: "f6" },
      { from: "d7", to: "h7" },
    ],
  },
  {
    id: 3,
    title: "Queen Sacrifice Back Rank Mate",
    subtitle: "White to move & mate in 2",
    fen: "2kr4/pp1rb3/b1p5/8/7p/P5BP/P1P3Q1/KR6 w - - 0 1",
    orientation: "white",
    targetMoves: [
      { from: "g2", to: "c6" },
      { from: "b1", to: "b8" },
    ],
  },
  {
    id: 4,
    title: "Corner Bishop-Rook Battery",
    subtitle: "White to move & mate in 2",
    fen: "1kr5/2p5/1p6/5Pq1/B4pP1/8/3P4/R1K5 w - - 0 1",
    orientation: "white",
    targetMoves: [
      { from: "a4", to: "c6" },
      { from: "a1", to: "a8" },
    ],
  },
  {
    id: 5,
    title: "Queen Sacrifice Deflection",
    subtitle: "White to move & mate in 2",
    fen: "1r2q3/1R6/3p1kp1/1ppBp1b1/p3Pp2/2PP4/PP3P2/5K1Q w - - 0 1",
    orientation: "white",
    targetMoves: [
      { from: "h1", to: "h8" },
      { from: "b7", to: "f7" },
    ],
  },
  {
    id: 6,
    title: "Queen Sacrifice Edge Mate",
    subtitle: "White to move & mate in 2",
    fen: "5r2/6R1/7p/3Q4/6pk/8/5q1P/7K w - - 0 1",
    orientation: "white",
    targetMoves: [
      { from: "d5", to: "g5" },
      { from: "g7", to: "h7" },
    ],
  },
  {
    id: 7,
    title: "Back Rank Rook Infiltration",
    subtitle: "White to move & mate in 2",
    fen: "r1b3k1/pp1p3p/3p2pB/8/q1P5/1P6/P5PP/4R1K1 w - - 0 1",
    orientation: "white",
    targetMoves: [
      { from: "e1", to: "f1" },
      { from: "f1", to: "f8" },
    ],
  },
  {
    id: 8,
    title: "Queen Infiltration Mate",
    subtitle: "White to move & mate in 2",
    fen: "2kr3r/pp1b1ppp/2p2n2/8/1Q3B2/P4NP1/1P2PP1P/2KR1B1q w k - 0 1",
    orientation: "white",
    targetMoves: [
      { from: "b4", to: "d6" },
      { from: "d6", to: "c7" },
    ],
  },
  {
    id: 9,
    title: "Knight Attack & Queen Mate",
    subtitle: "White to move & mate in 2",
    fen: "1r3rk1/2q1pp1p/p1ppb2Q/5p2/8/5N2/PPP1NPPP/2KR3R w K - 0 1",
    orientation: "white",
    targetMoves: [
      { from: "f3", to: "g5" },
      { from: "h6", to: "h7" },
    ],
  },
  {
    id: 10,
    title: "Black Queen Infiltration Mate",
    subtitle: "Black to move & mate in 2",
    fen: "3r1rk1/p4p1p/1p2p2q/2b2p2/5n2/2PB1PN1/PPQ2P1P/3R1RK1 b - - 0 1",
    orientation: "black",
    targetMoves: [
      { from: "h6", to: "h3" },
      { from: "h3", to: "g2" },
    ],
  },
];

export default function HeroPuzzleWidget() {
  const [puzzleIndex, setPuzzleIndex] = useState(0);
  const currentPuzzle = HERO_MATE_IN_2_PUZZLES[puzzleIndex];

  const gameRef = useRef(new Chess(currentPuzzle.fen));
  const [fen, setFen] = useState(currentPuzzle.fen);
  const [step, setStep] = useState<0 | 1 | 2>(0); // 0: move 1 pending, 1: move 1 done (waiting opp/move 2), 2: solved!
  const [statusText, setStatusText] = useState<string>(currentPuzzle.subtitle);
  const [statusType, setStatusType] = useState<'idle' | 'success' | 'error' | 'hint'>('idle');
  const [solvedCount, setSolvedCount] = useState<number>(0);
  const [ratingGain, setRatingGain] = useState<number>(0);

  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  // Reset when puzzleIndex changes
  const initPuzzle = useCallback((idx: number) => {
    const p = HERO_MATE_IN_2_PUZZLES[idx];
    gameRef.current = new Chess(p.fen);
    setFen(p.fen);
    setStep(0);
    setStatusText(p.subtitle);
    setStatusType('idle');
    setSelectedSquare(null);
    setOptionSquares({});
  }, []);

  useEffect(() => {
    initPuzzle(puzzleIndex);
  }, [puzzleIndex, initPuzzle]);

  // Execute opponent automatic defense move after Step 1
  const playOpponentResponse = useCallback((stepCount: number) => {
    setTimeout(() => {
      if (stepCount !== 1) return;
      const game = gameRef.current;
      const legalMoves = game.moves({ verbose: true });

      if (legalMoves.length > 0) {
        // Pick first legal defense
        game.move(legalMoves[0]);
        setFen(game.fen());
        setStatusText("Brilliant move! 💡 Now deliver checkmate!");
        setStatusType('idle');
      }
    }, 450);
  }, []);

  const handleAttemptMove = useCallback((from: string, to: string) => {
    const game = gameRef.current;
    const targetMove = currentPuzzle.targetMoves[step];

    // Check if the user's move matches the puzzle target move
    if (from === targetMove.from && to === targetMove.to) {
      // Make move
      try {
        const isPromotion =
          game.get(from as any)?.type === 'p' && (to.endsWith('8') || to.endsWith('1'));
        game.move({ from, to, promotion: isPromotion ? 'q' : undefined });
        setFen(game.fen());
      } catch {}

      setSelectedSquare(null);
      setOptionSquares({});

      if (step === 0) {
        // First move correct!
        setStep(1);
        setStatusText("Brilliant move! Opponent responding...");
        setStatusType('success');
        playOpponentResponse(1);
      } else if (step === 1) {
        // Final move (Checkmate!)
        setStep(2);
        setStatusText("🎉 Checkmate! Puzzle Solved (+15 Elo)");
        setStatusType('success');
        setSolvedCount((c) => Math.min(10, c + 1));
        setRatingGain((r) => r + 15);
      }
    } else {
      // Incorrect move
      setStatusText("❌ Not the best move! Try again");
      setStatusType('error');
      setSelectedSquare(null);
      setOptionSquares({});

      // Reset to current puzzle step position after short pause
      setTimeout(() => {
        if (step === 0) {
          gameRef.current = new Chess(currentPuzzle.fen);
          setFen(currentPuzzle.fen);
          setStatusText(currentPuzzle.subtitle);
          setStatusType('idle');
        }
      }, 1000);
    }
  }, [currentPuzzle, step, playOpponentResponse]);

  const handleSquareClick = useCallback(({ square }: { square: string }) => {
    if (step === 2) return;

    if (optionSquares[square] && selectedSquare) {
      handleAttemptMove(selectedSquare, square);
      return;
    }

    const piece = gameRef.current.get(square as any);
    const turn = gameRef.current.turn();

    if (piece && piece.color === turn) {
      setSelectedSquare(square);
      const moves = gameRef.current.moves({ square: square as any, verbose: true });
      const newSquares: Record<string, React.CSSProperties> = {};

      newSquares[square] = {
        boxShadow: 'inset 0 0 0 3.5px #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
      };

      moves.forEach((m) => {
        const targetPiece = gameRef.current.get(m.to as any);
        if (targetPiece) {
          newSquares[m.to] = {
            background: 'radial-gradient(circle, transparent 70%, rgba(239, 68, 68, 0.4) 70%)',
          };
        } else {
          newSquares[m.to] = {
            background: 'radial-gradient(circle, rgba(59, 130, 246, 0.5) 25%, transparent 25%)',
          };
        }
      });
      setOptionSquares(newSquares);
    } else {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  }, [step, optionSquares, selectedSquare, handleAttemptMove]);

  const onDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }): boolean => {
      if (!targetSquare || step === 2) return false;
      handleAttemptMove(sourceSquare, targetSquare);
      return true;
    },
    [step, handleAttemptMove]
  );

  const showHint = useCallback(() => {
    const hintMove = currentPuzzle.targetMoves[step];
    if (!hintMove) return;

    setSelectedSquare(hintMove.from);
    setOptionSquares({
      [hintMove.from]: {
        boxShadow: 'inset 0 0 0 4px #eab308',
        backgroundColor: 'rgba(234, 179, 8, 0.3)',
      },
      [hintMove.to]: {
        background: 'radial-gradient(circle, rgba(234, 179, 8, 0.6) 30%, transparent 30%)',
      },
    });
    setStatusText(`💡 Hint: Move piece on ${hintMove.from.toUpperCase()} to ${hintMove.to.toUpperCase()}`);
    setStatusType('hint');
  }, [currentPuzzle, step]);

  const nextPuzzle = useCallback(() => {
    setPuzzleIndex((prev) => (prev + 1) % HERO_MATE_IN_2_PUZZLES.length);
  }, []);

  const prevPuzzle = useCallback(() => {
    setPuzzleIndex((prev) => (prev - 1 + HERO_MATE_IN_2_PUZZLES.length) % HERO_MATE_IN_2_PUZZLES.length);
  }, []);

  return (
    <div className="relative w-full max-w-[540px] mx-auto group">
      {/* Outer Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-accent/30 via-primary/40 to-accent/30 rounded-3xl blur-xl opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

      {/* Main Glass Container */}
      <div className="relative rounded-3xl bg-surface-dark/80 backdrop-blur-xl border border-white/15 p-5 sm:p-6 shadow-2xl overflow-hidden">
        
        {/* Header Bar */}
        <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-white/10">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-2.5 w-2.5 rounded-full bg-accent animate-ping" />
              <span className="text-xs font-bold uppercase tracking-wider text-accent font-heading">
                Tactics Arena • Mate in 2
              </span>
            </div>
            <h3 className="text-lg font-bold text-white font-heading mt-0.5">
              {currentPuzzle.title}
            </h3>
          </div>

          <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 text-xs font-bold text-white">
            <span className="text-accent font-extrabold">{puzzleIndex + 1}</span>
            <span className="text-white/40">/</span>
            <span>10</span>
          </div>
        </div>

        {/* Puzzle Selector Pills */}
        <div className="flex items-center justify-between gap-1 mb-4 overflow-x-auto pb-1 scrollbar-none">
          {HERO_MATE_IN_2_PUZZLES.map((p, idx) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPuzzleIndex(idx)}
              className={`flex-1 min-w-[32px] py-1.5 rounded-lg text-xs font-bold transition-all duration-200 text-center ${
                idx === puzzleIndex
                  ? 'bg-accent text-surface-dark shadow-gold scale-105'
                  : 'bg-white/5 hover:bg-white/15 text-white/70 hover:text-white border border-white/10'
              }`}
            >
              #{p.id}
            </button>
          ))}
        </div>

        {/* Status Message Banner */}
        <div
          className={`mb-4 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 flex items-center justify-between ${
            statusType === 'success'
              ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300'
              : statusType === 'error'
              ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-shake'
              : statusType === 'hint'
              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-300'
              : 'bg-white/5 border border-white/10 text-white/80'
          }`}
        >
          <span>{statusText}</span>
          {step === 2 && (
            <button
              type="button"
              onClick={nextPuzzle}
              className="px-2.5 py-1 bg-accent text-surface-dark font-bold text-xs rounded-lg hover:bg-accent-hover transition-colors"
            >
              Next →
            </button>
          )}
        </div>

        {/* Interactive Board View */}
        <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/20 bg-slate-900">
          <ChessboardComponent
            options={{
              position: fen,
              onPieceDrop: onDrop,
              onSquareClick: handleSquareClick,
              boardOrientation: currentPuzzle.orientation,
              pieces: customChessPieces,
              darkSquareStyle: { backgroundColor: '#b58863' },
              lightSquareStyle: { backgroundColor: '#f0d9b5' },
              boardStyle: {
                backgroundImage:
                  "url('https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/boards/walnut.png')",
                backgroundSize: 'cover',
                borderRadius: '12px',
              },
              squareStyles: optionSquares,
              allowDragging: step !== 2,
            }}
          />

          {/* Solved Overlay animation */}
          {step === 2 && (
            <div className="absolute inset-0 bg-surface-dark/75 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in z-20">
              <div className="w-16 h-16 rounded-full bg-accent/20 border border-accent flex items-center justify-center mb-3 animate-bounce">
                <span className="text-3xl">🏆</span>
              </div>
              <h4 className="text-2xl font-bold text-white font-heading mb-1">
                Puzzle Solved!
              </h4>
              <p className="text-accent text-sm font-semibold mb-5">
                Checkmate in 2 executed flawlessly!
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => initPuzzle(puzzleIndex)}
                  className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition-all"
                >
                  ↺ Retry
                </button>
                <button
                  type="button"
                  onClick={nextPuzzle}
                  className="px-5 py-2 bg-accent hover:bg-accent-hover text-surface-dark text-xs font-bold rounded-xl shadow-gold transition-all"
                >
                  Next Puzzle →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions & Stats Ticker */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={prevPuzzle}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white rounded-lg border border-white/10 font-medium transition-colors"
            >
              ← Prev
            </button>
            <button
              type="button"
              onClick={() => initPuzzle(puzzleIndex)}
              className="px-2.5 py-1.5 bg-white/5 hover:bg-white/15 text-white/80 hover:text-white rounded-lg border border-white/10 font-medium transition-colors"
            >
              ↺ Reset
            </button>
            <button
              type="button"
              onClick={showHint}
              disabled={step === 2}
              className="px-2.5 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 rounded-lg border border-amber-500/30 font-medium transition-colors disabled:opacity-40"
            >
              💡 Hint
            </button>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-accent font-bold font-heading text-xs sm:text-sm">
                +{ratingGain} Rating
              </div>
              <div className="text-white/50 text-[10px]">
                {solvedCount} / 10 Solved
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
