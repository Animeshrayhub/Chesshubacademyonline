'use client';

/**
 * MiniChessBoard — Lightweight, standalone interactive chess board.
 * Uses react-chessboard v5 + chess.js directly. No Supabase, no engine.
 * Perfect for homework/practice/course embeds.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { customChessPieces } from './ChessPieces';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => {
      const CB = mod.Chessboard;
      return function BoardWrapper(props: any) {
        const boardProps = props.options ? { ...props.options, ...props } : props;
        return <CB {...boardProps} />;
      };
    }),
  { ssr: false }
) as any;

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

interface MiniChessBoardProps {
  initialFen?: string;
}

export default function MiniChessBoard({ initialFen = DEFAULT_FEN }: MiniChessBoardProps) {
  const startFen = (() => {
    try {
      new Chess(initialFen);
      return initialFen;
    } catch {
      return DEFAULT_FEN;
    }
  })();

  const gameRef = useRef(new Chess(startFen));
  const [fen, setFen] = useState(startFen);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [moveHistory, setMoveHistory] = useState<string[]>([]);

  // Selection & option squares for legal move dots
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const syncState = useCallback(() => {
    setFen(gameRef.current.fen());
    setMoveHistory(gameRef.current.history());
  }, []);

  const handleSquareClick = useCallback(({ square }: { square: string }) => {
    // 1. If clicked on a valid move square, make the move
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
          // Capture: ring overlay
          newOptionSquares[m.to] = {
            background: 'radial-gradient(circle, transparent 75%, rgba(0, 0, 0, 0.18) 75%)',
          };
        } else {
          // Empty: dot overlay
          newOptionSquares[m.to] = {
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.18) 19%, transparent 19%)',
          };
        }
      });

      setOptionSquares(newOptionSquares);
    } else {
      // Clear selection
      setSelectedSquare(null);
      setOptionSquares({});
    }
  }, [selectedSquare, optionSquares, syncState]);

  // react-chessboard v5: onPieceDrop receives ({ piece, sourceSquare, targetSquare })
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
    <div className="flex flex-col gap-3 w-full">
      {/* Board */}
      <div className="w-full aspect-square rounded-2xl overflow-hidden border border-slate-200 shadow-md">
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
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleFlip}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
        >
          ⇅ Flip
        </button>
        <button
          type="button"
          onClick={handleUndo}
          disabled={moveHistory.length === 0}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors disabled:opacity-40"
        >
          ← Undo
        </button>
        <button
          type="button"
          onClick={handleReset}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
        >
          ↺ Reset
        </button>
        <button
          type="button"
          onClick={copyFen}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg text-xs font-bold text-slate-700 transition-colors"
          title="Copy FEN to clipboard"
        >
          FEN
        </button>
        {moveHistory.length > 0 && (
          <span className="text-[10px] text-slate-500 font-mono truncate max-w-[200px]">
            {moveHistory.slice(-3).join(' ')}
          </span>
        )}
      </div>
    </div>
  );
}
