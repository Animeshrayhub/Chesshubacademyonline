'use client';

/**
 * MiniChessBoard — Lightweight, standalone interactive chess board.
 * Uses react-chessboard v5 + chess.js directly. No Supabase, no engine.
 * Perfect for homework/practice/course embeds/previews.
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { customChessPieces } from './ChessPieces';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

export interface MiniChessBoardProps {
  initialFen?: string;
  fen?: string;
  orientation?: 'white' | 'black';
  size?: number;
  className?: string;
}

export default function MiniChessBoard({
  initialFen = DEFAULT_FEN,
  fen: rawFen,
  orientation: initialOrientation = 'white',
  size,
  className = '',
}: MiniChessBoardProps) {
  const targetFen = rawFen || initialFen || DEFAULT_FEN;

  const startFen = (() => {
    try {
      new Chess(targetFen);
      return targetFen;
    } catch {
      return DEFAULT_FEN;
    }
  })();

  const gameRef = useRef(new Chess(startFen));
  const [fen, setFen] = useState(startFen);
  const [orientation, setOrientation] = useState<'white' | 'black'>(initialOrientation);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  useEffect(() => {
    if (targetFen) {
      try {
        gameRef.current = new Chess(targetFen);
        setFen(targetFen);
      } catch {}
    }
  }, [targetFen]);

  useEffect(() => {
    if (initialOrientation) {
      setOrientation(initialOrientation);
    }
  }, [initialOrientation]);

  // Selection & option squares for legal move dots
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const syncState = useCallback(() => {
    setFen(gameRef.current.fen());
    setMoveHistory(gameRef.current.history());
  }, []);

  const handleSquareClick = useCallback(({ square }: { square: string }) => {
    if (optionSquares[square]) {
      try {
        const isPromotion =
          gameRef.current.get(selectedSquare as any)?.type === 'p' &&
          (square.endsWith('8') || square.endsWith('1'));

        const move = gameRef.current.move({
          from: selectedSquare!,
          to: square,
          promotion: isPromotion ? 'q' : undefined,
        });
        if (move) {
          syncState();
          setSelectedSquare(null);
          setOptionSquares({});
          return;
        }
      } catch {}
    }

    const piece = gameRef.current.get(square as any);
    if (piece && piece.color === gameRef.current.turn()) {
      setSelectedSquare(square);
      
      const moves = gameRef.current.moves({ square: square as any, verbose: true });
      const newOptionSquares: Record<string, React.CSSProperties> = {};
      
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
  }, [selectedSquare, optionSquares, syncState]);

  const onDrop = useCallback(
    ({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }): boolean => {
      if (!targetSquare) return false;
      setSelectedSquare(null);
      setOptionSquares({});
      try {
        const isPromotion =
          gameRef.current.get(sourceSquare as any)?.type === 'p' &&
          (targetSquare.endsWith('8') || targetSquare.endsWith('1'));

        const move = gameRef.current.move({
          from: sourceSquare,
          to: targetSquare,
          promotion: isPromotion ? 'q' : undefined,
        });
        if (move) {
          syncState();
          return true;
        }
        return false;
      } catch {
        return false;
      }
    },
    [syncState]
  );

  const handleReset = useCallback(() => {
    gameRef.current = new Chess(startFen);
    setSelectedSquare(null);
    setOptionSquares({});
    syncState();
  }, [startFen, syncState]);

  const handleUndo = useCallback(() => {
    gameRef.current.undo();
    setSelectedSquare(null);
    setOptionSquares({});
    syncState();
  }, [syncState]);

  const handleFlip = useCallback(() => {
    setOrientation((o) => (o === 'white' ? 'black' : 'white'));
  }, []);

  const copyFen = useCallback(() => {
    navigator.clipboard.writeText(fen).catch(() => {});
  }, [fen]);

  return (
    <div className={`flex flex-col gap-3 w-full ${className}`} style={size ? { width: size } : undefined}>
      {/* Board */}
      <div className="w-full aspect-square rounded-2xl overflow-hidden border border-slate-700 shadow-md bg-slate-950">
        <ChessboardComponent
          options={{
            position: fen,
            onPieceDrop: onDrop,
            onSquareClick: handleSquareClick,
            boardOrientation: orientation,
            pieces: customChessPieces,
            darkSquareStyle: { backgroundColor: 'transparent' },
            lightSquareStyle: { backgroundColor: 'transparent' },
            boardStyle: {
              backgroundImage: "url('https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/boards/walnut.png')",
              backgroundSize: 'cover',
              borderRadius: '12px',
            },
            squareStyles: optionSquares,
            allowDragging: true,
          }}
        />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 text-xs">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleFlip}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 transition-colors"
          >
            ↺ Flip
          </button>
          <button
            type="button"
            onClick={handleUndo}
            disabled={moveHistory.length === 0}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 transition-colors disabled:opacity-40"
          >
            ← Undo
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-[10px] font-bold text-slate-300 transition-colors"
          >
            Reset
          </button>
        </div>
        <button
          type="button"
          onClick={copyFen}
          className="px-2 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg text-[10px] font-mono text-amber-300 transition-colors"
          title="Copy FEN to clipboard"
        >
          Copy FEN
        </button>
      </div>
    </div>
  );
}
