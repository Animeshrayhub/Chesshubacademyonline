'use client';

import React, { useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Chess } from 'chess.js';
import { customChessPieces } from '@/components/dashboard/ui/ChessPieces';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

export default function BlogChessboard({ fen }: { fen?: string }) {
  const initialFen = fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  
  const [game, setGame] = useState(() => new Chess(initialFen));
  const [currentFen, setCurrentFen] = useState(initialFen);

  // Selection & option squares for legal move dots
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const handleSquareClick = useCallback(({ square }: { square: string }) => {
    // 1. If clicked on a valid move square, make the move
    if (optionSquares[square]) {
      try {
        const isPromotion =
          game.get(selectedSquare as any)?.type === 'p' &&
          (square.endsWith('8') || square.endsWith('1'));

        const result = game.move({
          from: selectedSquare!,
          to: square,
          promotion: isPromotion ? 'q' : undefined,
        });
        if (result) {
          const nextGame = new Chess(game.fen());
          setGame(nextGame);
          setCurrentFen(nextGame.fen());
          setSelectedSquare(null);
          setOptionSquares({});
          return;
        }
      } catch {}
    }

    // 2. Otherwise, check if we clicked on our own piece to select it
    const piece = game.get(square as any);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
      
      // Find legal moves
      const moves = game.moves({ square: square as any, verbose: true });
      const newOptionSquares: Record<string, React.CSSProperties> = {};
      
      // Selection highlight (Chess.com style blue border/glow)
      newOptionSquares[square] = {
        boxShadow: 'inset 0 0 0 3.5px #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
      };

      moves.forEach((m) => {
        const targetPiece = game.get(m.to as any);
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
  }, [selectedSquare, optionSquares, game]);

  // v5 API: onPieceDrop receives ({ piece, sourceSquare, targetSquare })
  function onDrop({ sourceSquare, targetSquare }: { sourceSquare: string; targetSquare: string | null }) {
    if (!targetSquare) return false;
    setSelectedSquare(null);
    setOptionSquares({});
    try {
      const result = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });
      if (result) {
        const nextGame = new Chess(game.fen());
        setGame(nextGame);
        setCurrentFen(nextGame.fen());
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }

  return (
    <div className="my-8 max-w-sm mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex flex-col items-center">
      <div className="w-full aspect-square max-w-[280px] sm:max-w-[320px] rounded-lg overflow-hidden border border-slate-700 shadow-md">
        <ChessboardComponent
          options={{
            position: currentFen,
            onPieceDrop: onDrop,
            onSquareClick: handleSquareClick,
            pieces: customChessPieces,
            darkSquareStyle: { backgroundColor: 'transparent' },
            lightSquareStyle: { backgroundColor: 'transparent' },
            boardStyle: {
              backgroundImage: "url('https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/boards/walnut.png')",
              backgroundSize: 'cover',
              borderRadius: '8px',
            },
            squareStyles: optionSquares,
          }}
        />
      </div>
      <div className="w-full mt-4 text-center">
        <span className="text-[10px] uppercase font-bold tracking-wider text-accent bg-accent/10 px-2 py-0.5 rounded-full">
          Interactive Analysis Board
        </span>
        <p className="text-[9px] font-mono text-slate-400 mt-2 truncate w-full px-2" title={currentFen}>
          {currentFen}
        </p>
        <button
          type="button"
          onClick={() => {
            const resetGame = new Chess(initialFen);
            setGame(resetGame);
            setCurrentFen(initialFen);
            setSelectedSquare(null);
            setOptionSquares({});
          }}
          className="mt-3 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-[10px] font-semibold transition-colors"
        >
          Reset Board
        </button>
      </div>
    </div>
  );
}
