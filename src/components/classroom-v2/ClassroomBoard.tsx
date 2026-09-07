'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { ChessboardAdapter } from '@/components/dashboard/ui/ChessboardWrapper';
import { type BoardArrow, type BoardHighlight, type BoardOrientation } from '@/lib/classroom-v2/types';
import { validateChessMove } from '@/lib/classroom-v2/validation';
import { Chess } from 'chess.js';

interface ClassroomBoardProps {
  fen: string;
  orientation: BoardOrientation;
  isLocked: boolean;
  canMove: boolean;
  allowIllegalMoves?: boolean;
  arrows?: BoardArrow[];
  highlights?: BoardHighlight[];
  showCoords?: boolean;
  showSquareLabels?: boolean;
  darkSquareColor?: string;
  lightSquareColor?: string;
  onMove: (from: string, to: string, promotion?: string) => Promise<boolean>;
  onDrawChange?: (arrows: BoardArrow[], highlights: BoardHighlight[]) => void;
  className?: string;
  boardScale?: number;
}

export default function ClassroomBoard({
  fen,
  orientation = 'white',
  isLocked = false,
  canMove = true,
  allowIllegalMoves = false,
  arrows = [],
  highlights = [],
  showCoords = true,
  showSquareLabels = false,
  darkSquareColor = '#779952',
  lightSquareColor = '#edeed1',
  onMove,
  onDrawChange,
  className = '',
  boardScale = 1,
}: ClassroomBoardProps) {
  // Convert canonical arrows to v5 Arrow objects and legacy tuples
  const v5Arrows = useMemo(() => {
    return arrows.map((a) => ({
      startSquare: a.from,
      endSquare: a.to,
      color: a.color || 'rgba(234, 88, 12, 0.8)',
    }));
  }, [arrows]);

  const renderedArrows = useMemo<[string, string, string][]>(() => {
    return arrows.map((a) => [a.from, a.to, a.color || 'rgba(234, 88, 12, 0.8)']);
  }, [arrows]);

  // State for interactive pawn promotion selector
  const [pendingPromotion, setPendingPromotion] = useState<{
    from: string;
    to: string;
    pieceColor: 'w' | 'b';
  } | null>(null);

  // Convert highlights, check (Yellow) and checkmate (Red) to square styles
  const customSquareStyles = useMemo<Record<string, React.CSSProperties>>(() => {
    const styles: Record<string, React.CSSProperties> = {};
    for (const h of highlights) {
      styles[h.square] = {
        backgroundColor: h.color || 'rgba(234, 179, 8, 0.45)',
        boxShadow: `inset 0 0 14px 2px ${h.color || 'rgba(234, 179, 8, 0.4)'}`,
      };
    }

    // Check & Checkmate highlight derived from canonical FEN
    try {
      if (fen && fen.trim()) {
        const chess = new Chess(fen.trim());
        const isCheck = chess.inCheck();
        const isCheckmate = chess.isCheckmate();

        if (isCheck || isCheckmate) {
          const board = chess.board();
          const turn = chess.turn();
          let kingSquare = '';
          for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
              const p = board[r][c];
              if (p && p.type === 'k' && p.color === turn) {
                const file = String.fromCharCode('a'.charCodeAt(0) + c);
                const rank = 8 - r;
                kingSquare = `${file}${rank}`;
                break;
              }
            }
            if (kingSquare) break;
          }

          if (kingSquare) {
            if (isCheckmate) {
              // Checkmate: Red highlight on king's square
              styles[kingSquare] = {
                backgroundColor: 'rgba(239, 68, 68, 0.8)',
                boxShadow: 'inset 0 0 16px 4px rgba(220, 38, 38, 0.95)',
              };
            } else {
              // Check: Yellow highlight on king's square
              styles[kingSquare] = {
                backgroundColor: 'rgba(234, 179, 8, 0.8)',
                boxShadow: 'inset 0 0 16px 4px rgba(202, 138, 4, 0.95)',
              };
            }
          }
        }
      }
    } catch {}

    return styles;
  }, [highlights, fen]);

  const handleSelectPromotion = useCallback(
    async (promoPiece: 'q' | 'r' | 'b' | 'n') => {
      if (!pendingPromotion) return;
      const { from, to } = pendingPromotion;
      setPendingPromotion(null);
      await onMove(from, to, promoPiece);
    },
    [pendingPromotion, onMove]
  );

  const handlePieceDrop = useCallback(
    (arg0: any, arg1?: any, arg2?: any): boolean => {
      let sourceSquare = '';
      let targetSquare = '';
      let piece = '';

      // Check if called with react-chessboard v5 object: { piece, sourceSquare, targetSquare }
      if (arg0 && typeof arg0 === 'object' && ('sourceSquare' in arg0 || 'targetSquare' in arg0)) {
        sourceSquare = arg0.sourceSquare || '';
        targetSquare = arg0.targetSquare || '';
        piece = arg0.piece?.pieceType || (typeof arg0.piece === 'string' ? arg0.piece : '');
      } else {
        // Called with legacy signature: (sourceSquare, targetSquare, piece)
        sourceSquare = typeof arg0 === 'string' ? arg0 : '';
        targetSquare = typeof arg1 === 'string' ? arg1 : '';
        piece = typeof arg2 === 'string' ? arg2 : (arg2?.pieceType || '');
      }

      if (!canMove || isLocked || !sourceSquare || !targetSquare || sourceSquare === targetSquare) {
        return false;
      }

      // Check pawn promotion: Player MUST choose promotion piece (Queen, Rook, Bishop, Knight)
      const isWhitePawnPromotion = piece === 'wP' && targetSquare[1] === '8' && (sourceSquare[1] === '7' || allowIllegalMoves);
      const isBlackPawnPromotion = piece === 'bP' && targetSquare[1] === '1' && (sourceSquare[1] === '2' || allowIllegalMoves);
      if (isWhitePawnPromotion || isBlackPawnPromotion) {
        // Pre-validate that at least one promotion move is valid
        const testValidation = validateChessMove(
          fen,
          { from: sourceSquare, to: targetSquare, promotion: 'q' },
          allowIllegalMoves
        );
        if (testValidation.valid) {
          setPendingPromotion({
            from: sourceSquare,
            to: targetSquare,
            pieceColor: isWhitePawnPromotion ? 'w' : 'b',
          });
          return false;
        }
      }

      // Synchronously validate the move against the current board FEN
      const validation = validateChessMove(
        fen,
        { from: sourceSquare, to: targetSquare },
        allowIllegalMoves
      );

      if (!validation.valid || !validation.newFen) {
        // Invalid move: return false silently.
        // react-chessboard smoothly returns the piece to sourceSquare without state change.
        return false;
      }

      // Valid legal or free move!
      // Fire onMove to update optimistic state and persist/broadcast via server.
      onMove(sourceSquare, targetSquare);

      // Return true so react-chessboard sets manuallyDroppedPieceAndSquare.
      // The piece stays cleanly at targetSquare with zero snap-back or re-animation glitch.
      return true;
    },
    [canMove, isLocked, onMove, fen, allowIllegalMoves]
  );

  const isDraggable = Boolean(canMove && !isLocked);

  const maxBoardDimension = Math.round(620 * (boardScale || 1));

  return (
    <div className={`relative flex items-center justify-center select-none w-full h-full min-h-0 ${className}`}>
      {/* Board Locked Overlay Banner */}
      {isLocked && (
        <div className="absolute top-3 left-3 z-20 px-3 py-1 bg-rose-600/90 backdrop-blur-md text-white font-extrabold text-xs rounded-xl shadow-lg border border-rose-500 flex items-center gap-1.5 animate-pulse">
          <span>🔒</span>
          <span>Board Locked by Coach</span>
        </div>
      )}

      <div
        id="classroom-board"
        data-can-move={String(isDraggable)}
        style={{
          width: '100%',
          maxWidth: `${maxBoardDimension}px`,
          maxHeight: '100%',
        }}
        className="aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-850 bg-slate-900 relative"
      >
        <ChessboardAdapter
          position={fen}
          boardOrientation={orientation}
          arePiecesDraggable={isDraggable}
          allowDragging={isDraggable}
          onPieceDrop={handlePieceDrop}
          arrows={v5Arrows}
          customArrows={renderedArrows}
          squareStyles={customSquareStyles}
          customSquareStyles={customSquareStyles}
          showCoordinates={showCoords}
          showBoardNotation={showCoords}
          customDarkSquareStyle={{ backgroundColor: darkSquareColor }}
          customLightSquareStyle={{ backgroundColor: lightSquareColor }}
          darkSquareStyle={{ backgroundColor: darkSquareColor }}
          lightSquareStyle={{ backgroundColor: lightSquareColor }}
          animationDuration={150}
          customBoardStyle={{
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
        />

        {/* 64-Square Coordinate Overlay (Controlled by showSquareLabels toggle) */}
        {showSquareLabels && (
          <div className="absolute inset-0 grid grid-cols-8 grid-rows-8 pointer-events-none select-none z-10">
            {(orientation === 'white'
              ? [8, 7, 6, 5, 4, 3, 2, 1]
              : [1, 2, 3, 4, 5, 6, 7, 8]
            ).map((rank) =>
              (orientation === 'white'
                ? ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
                : ['h', 'g', 'f', 'e', 'd', 'c', 'b', 'a']
              ).map((file) => {
                const square = `${file}${rank}`;
                return (
                  <div key={square} className="relative flex items-start justify-start p-1">
                    <span className="text-[8px] sm:text-[9px] font-mono font-bold leading-none text-slate-100 opacity-60 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {square}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Pawn Promotion Piece Selector Overlay */}
        {pendingPromotion && (
          <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 animate-in fade-in select-none">
            <div className="bg-slate-900 border border-slate-700 p-4 rounded-2xl shadow-2xl flex flex-col items-center gap-3">
              <span className="text-xs font-black uppercase tracking-wider text-amber-400">
                Choose Promotion Piece
              </span>
              <div className="flex items-center gap-2.5">
                {[
                  { key: 'q' as const, label: 'Queen', icon: pendingPromotion.pieceColor === 'w' ? '♕' : '♛' },
                  { key: 'r' as const, label: 'Rook', icon: pendingPromotion.pieceColor === 'w' ? '♖' : '♜' },
                  { key: 'b' as const, label: 'Bishop', icon: pendingPromotion.pieceColor === 'w' ? '♗' : '♝' },
                  { key: 'n' as const, label: 'Knight', icon: pendingPromotion.pieceColor === 'w' ? '♘' : '♞' },
                ].map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    data-promotion-choice={item.key}
                    onClick={() => handleSelectPromotion(item.key)}
                    className="flex flex-col items-center justify-center w-14 h-16 bg-slate-800 hover:bg-slate-700 hover:border-amber-500 border border-slate-700 rounded-xl transition-all shadow-md group cursor-pointer"
                  >
                    <span className="text-3xl filter drop-shadow group-hover:scale-110 transition-transform text-white">
                      {item.icon}
                    </span>
                    <span className="text-[10px] font-bold text-slate-300 group-hover:text-amber-400 mt-1">
                      {item.label}
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setPendingPromotion(null)}
                className="text-[11px] text-slate-400 hover:text-slate-200 font-semibold transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
