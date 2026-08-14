'use client';

import React, { useState, useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';
import EvalBar from './EvalBar';
import { classifyMoveQuality, type MoveQualityInfo } from '@/lib/openings/eval-helpers';
import type { DbOpeningPosition, MoveResult, StockfishResult } from '@/types/opening-teacher';

const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────

interface OpeningLessonBoardProps {
  openingId: string;
  chapterNum: number;
  positions: DbOpeningPosition[];
  currentPositionIndex: number;
  onMoveResult: (result: MoveResult, newFen: string) => void;
  onPositionChange?: (index: number, fen: string) => void;
  language: 'en' | 'hi';
  disabled?: boolean;
  // Highlight squares for demonstration
  highlightSquares?: Record<string, { background: string }>;
  // Arrow overlays for hint demonstrations
  arrowHints?: [string, string][];
}

export interface OpeningLessonBoardHandle {
  showHint: () => void;
  resetToPosition: (index: number) => void;
  demonstrateMove: (move: string) => Promise<void>;
  getCurrentFen: () => string;
}

// ─────────────────────────────────────────────────────────────────────────────
// STOCKFISH WEB WORKER (reuses /public/stockfish/stockfish.js)
// ─────────────────────────────────────────────────────────────────────────────

function useStockfish() {
  const workerRef = useRef<Worker | null>(null);

  const evaluate = useCallback((fen: string, depth = 12): Promise<StockfishResult> => {
    return new Promise((resolve, reject) => {
      workerRef.current?.terminate();

      try {
        const worker = new Worker('/stockfish/stockfish.js');
        workerRef.current = worker;

        let evalType: 'cp' | 'mate' = 'cp';
        let evalValue = 0;
        let pv: string[] = [];
        const timeoutId = setTimeout(() => {
          worker.terminate();
          reject(new Error('Stockfish timeout'));
        }, 5000);

        worker.onmessage = (e) => {
          const line: string = e.data;

          if (line.includes('score cp')) {
            const match = line.match(/score cp (-?\d+)/);
            if (match) { evalType = 'cp'; evalValue = parseInt(match[1], 10); }
          }
          if (line.includes('score mate')) {
            const match = line.match(/score mate (-?\d+)/);
            if (match) { evalType = 'mate'; evalValue = parseInt(match[1], 10); }
          }
          if (line.includes(' pv ')) {
            pv = line.split(' pv ')[1]?.split(' ').slice(0, 5) ?? [];
          }

          if (line.startsWith('bestmove')) {
            clearTimeout(timeoutId);
            const bestMove = line.split(' ')[1];
            const evalStr = evalType === 'mate'
              ? `#${evalValue}`
              : `${evalValue > 0 ? '+' : ''}${(evalValue / 100).toFixed(1)}`;

            resolve({ bestMove, eval: evalStr, evalType, depth, pv });
            worker.terminate();
          }
        };

        worker.onerror = (err) => {
          clearTimeout(timeoutId);
          worker.terminate();
          reject(err);
        };

        worker.postMessage('uci');
        worker.postMessage(`position fen ${fen}`);
        worker.postMessage(`go depth ${depth}`);
      } catch (err) {
        reject(err);
      }
    });
  }, []);

  useEffect(() => {
    return () => { workerRef.current?.terminate(); };
  }, []);

  return { evaluate };
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN BOARD COMPONENT
// ─────────────────────────────────────────────────────────────────────────────

const OpeningLessonBoard = forwardRef<OpeningLessonBoardHandle, OpeningLessonBoardProps>(
  (
    {
      openingId,
      chapterNum,
      positions,
      currentPositionIndex,
      onMoveResult,
      onPositionChange,
      language,
      disabled = false,
      highlightSquares = {},
      arrowHints = [],
    },
    ref
  ) => {
    const currentPos = positions[currentPositionIndex];
    const [fen, setFen] = useState(currentPos?.fen ?? 'start');
    const [chess, setChess] = useState(() => {
      const g = new Chess();
      if (currentPos?.fen) { try { g.load(currentPos.fen); } catch {} }
      return g;
    });
    const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
    const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});
    const [lastMoveSquares, setLastMoveSquares] = useState<Record<string, React.CSSProperties>>({});
    const [isEvaluating, setIsEvaluating] = useState(false);
    const [demoArrows, setDemoArrows] = useState<string[][]>(arrowHints);

    const { evaluate } = useStockfish();

    // ── Sync position when index changes ──────────────────────────────────────
    useEffect(() => {
      const pos = positions[currentPositionIndex];
      if (!pos) return;

      const newGame = new Chess();
      try { newGame.load(pos.fen); } catch {}
      setChess(newGame);
      setFen(pos.fen);
      setSelectedSquare(null);
      setOptionSquares({});
      setLastMoveSquares({});
      setDemoArrows(arrowHints);
    }, [currentPositionIndex, positions]);

    // ── Legal move dots ────────────────────────────────────────────────────────
    const getMoveOptions = useCallback(
      (square: string) => {
        const moves = chess.moves({ square: square as any, verbose: true });
        if (moves.length === 0) return;

        const newSquares: Record<string, React.CSSProperties> = {};
        moves.forEach(m => {
          newSquares[m.to] = {
            background: chess.get(m.to)
              ? 'radial-gradient(circle, rgba(239,68,68,0.35) 60%, transparent 60%)'
              : 'radial-gradient(circle, rgba(99,215,132,0.35) 25%, transparent 25%)',
            borderRadius: '50%',
          };
        });
        newSquares[square] = { background: 'rgba(255,255,100,0.4)', borderRadius: '4px' };
        setOptionSquares(newSquares);
        setSelectedSquare(square);
      },
      [chess]
    );

    // ── Handle square click ────────────────────────────────────────────────────
    const handleSquareClick = useCallback(
      async (square: string) => {
        if (disabled || !currentPos?.is_interactive) return;

        // If a piece was already selected — try to make a move
        if (selectedSquare) {
          const gameCopy = new Chess(chess.fen());
          try {
            const moveObj = gameCopy.move({
              from: selectedSquare,
              to: square,
              promotion: 'q', // auto-queen for simplicity
            });

            if (!moveObj) {
              // Illegal move — try selecting new square instead
              getMoveOptions(square);
              return;
            }

            // Move was legal — validate against opening theory
            setChess(gameCopy);
            setFen(gameCopy.fen());
            setSelectedSquare(null);
            setOptionSquares({});
            setLastMoveSquares({
              [selectedSquare]: { background: 'rgba(255,255,0,0.25)', borderRadius: '4px' },
              [square]: { background: 'rgba(255,255,0,0.25)', borderRadius: '4px' },
            });

            await validateAndReport(moveObj.san, gameCopy.fen(), chess.fen(), currentPos);
            return;
          } catch {}
        }

        // Select a piece
        const piece = chess.get(square as any);
        if (piece && piece.color === chess.turn()) {
          getMoveOptions(square);
        } else {
          setSelectedSquare(null);
          setOptionSquares({});
        }
      },
      [disabled, currentPos, selectedSquare, chess, getMoveOptions]
    );

    // ── Handle drag-and-drop ───────────────────────────────────────────────────
    const handlePieceDrop = useCallback(
      async (sourceSquare: string, targetSquare: string) => {
        if (disabled || !currentPos?.is_interactive) return false;

        const gameCopy = new Chess(chess.fen());
        try {
          const moveObj = gameCopy.move({
            from: sourceSquare,
            to: targetSquare,
            promotion: 'q',
          });

          if (!moveObj) return false;

          setChess(gameCopy);
          setFen(gameCopy.fen());
          setSelectedSquare(null);
          setOptionSquares({});
          setLastMoveSquares({
            [sourceSquare]: { background: 'rgba(255,255,0,0.25)', borderRadius: '4px' },
            [targetSquare]: { background: 'rgba(255,255,0,0.25)', borderRadius: '4px' },
          });

          await validateAndReport(moveObj.san, gameCopy.fen(), chess.fen(), currentPos);
          return true;
        } catch {
          return false;
        }
      },
      [disabled, currentPos, chess]
    );

    // ── Validate move and report result ────────────────────────────────────────
    const validateAndReport = useCallback(
      async (
        moveSan: string,
        newFen: string,
        prevFen: string,
        pos: DbOpeningPosition
      ) => {
        setIsEvaluating(true);
        try {
          // Call the validate API
          const res = await fetch('/api/opening/validate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fen: prevFen,
              move: moveSan,
              opening_id: openingId,
              chapter_num: chapterNum,
              expected_moves: pos.recommended_moves,
              wrong_moves: pos.wrong_moves,
            }),
          });

          const data = await res.json();

          let stockfishEval: string | undefined;
          if (!data.isCorrect && pos.stockfish_eval === null) {
            // Evaluate position with Stockfish to measure mistake severity
            try {
              const sfResult = await evaluate(newFen, 10);
              stockfishEval = sfResult.eval;
            } catch {}
          }

          const result: MoveResult = {
            move: moveSan,
            isLegal: data.isLegal ?? true,
            isCorrect: data.isCorrect ?? false,
            isInOpeningDb: data.isInOpeningDb ?? false,
            evalBefore: pos.stockfish_eval ?? undefined,
            evalAfter: stockfishEval,
            explanation: data.explanation,
            explanation_hindi: data.explanation_hindi,
            mistakeType: data.mistakeType ?? undefined,
          };

          onMoveResult(result, newFen);
        } finally {
          setIsEvaluating(false);
        }
      },
      [openingId, chapterNum, evaluate, onMoveResult]
    );

    // ── Expose methods via ref ─────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      showHint: () => {
        const pos = positions[currentPositionIndex];
        if (!pos || !pos.recommended_moves.length) return;
        const hintMove = pos.recommended_moves[0];
        // Parse UCI move for arrow
        if (hintMove.length >= 4) {
          const from = hintMove.substring(0, 2);
          const to = hintMove.substring(2, 4);
          setDemoArrows([[from, to]]);
        }
      },
      resetToPosition: (index: number) => {
        const pos = positions[index];
        if (!pos) return;
        const newGame = new Chess();
        try { newGame.load(pos.fen); } catch {}
        setChess(newGame);
        setFen(pos.fen);
        setSelectedSquare(null);
        setOptionSquares({});
        setLastMoveSquares({});
      },
      demonstrateMove: async (move: string) => {
        const gameCopy = new Chess(chess.fen());
        try {
          const moveObj = gameCopy.move(move);
          if (!moveObj) return;
          // Animate: show arrow first
          if (moveObj.from && moveObj.to) {
            setDemoArrows([[moveObj.from, moveObj.to]]);
            await new Promise(r => setTimeout(r, 800));
          }
          // Then apply move
          setChess(gameCopy);
          setFen(gameCopy.fen());
          setLastMoveSquares({
            [moveObj.from]: { background: 'rgba(255,200,0,0.35)', borderRadius: '4px' },
            [moveObj.to]: { background: 'rgba(255,200,0,0.35)', borderRadius: '4px' },
          });
          setDemoArrows([]);
        } catch {}
      },
      getCurrentFen: () => chess.fen(),
    }));

    if (!currentPos) {
      return (
        <div className="aspect-square bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
          No position loaded
        </div>
      );
    }

    const orientation = currentPos.board_orientation ?? 'white';

    const customSquareStyles: Record<string, React.CSSProperties> = {
      ...lastMoveSquares,
      ...highlightSquares,
      ...optionSquares,
    };

    return (
      <div className="relative flex gap-3 items-stretch">
        {/* Evaluation Bar */}
        <EvalBar
          evalStr={currentPos.stockfish_eval}
          orientation={orientation}
          width="20px"
          className="flex-shrink-0"
        />

        <div className="flex-1 min-w-0 relative">
          {/* Evaluation indicator */}
          {isEvaluating && (
            <div className="absolute top-2 right-2 z-10 bg-slate-900/90 rounded-full px-3 py-1 text-xs text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Evaluating...
            </div>
          )}

          {/* Disabled overlay for non-interactive positions */}
          {(!currentPos.is_interactive || disabled) && (
            <div className="absolute inset-0 z-10 bg-slate-900/30 rounded-xl pointer-events-none" />
          )}

          <ChessboardComponent
            id="opening-lesson-board"
            position={fen}
            onSquareClick={handleSquareClick}
            onPieceDrop={handlePieceDrop}
            boardOrientation={orientation}
            arePiecesDraggable={!disabled && currentPos.is_interactive}
            allowDragging={!disabled && currentPos.is_interactive}
            customSquareStyles={customSquareStyles}
            customArrows={demoArrows}
            customDarkSquareStyle={{ backgroundColor: '#2d4a6e' }}
            customLightSquareStyle={{ backgroundColor: '#8ba8d0' }}
            customBoardStyle={{
              borderRadius: '8px',
              boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
            }}
          />

          {/* Position title overlay */}
          <div className="mt-2 flex items-center justify-between px-1">
            <span className="text-xs text-slate-400 font-medium truncate">
              {currentPos.title}
            </span>
            <span className="text-xs text-slate-500 font-mono">
              {chess.turn() === 'w' ? '⬜ White to move' : '⬛ Black to move'}
            </span>
          </div>
        </div>
      </div>
    );
  }
);

OpeningLessonBoard.displayName = 'OpeningLessonBoard';
export default OpeningLessonBoard;
