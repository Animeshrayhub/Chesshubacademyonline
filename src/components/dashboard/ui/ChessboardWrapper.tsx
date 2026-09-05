'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { customChessPieces } from './ChessPieces';

/**
 * Higher-Order Component / Wrapper for react-chessboard v5.
 * Normalizes props (legacy v4 prop names vs v5 options object) so that
 * any board rendered with position, orientation, or custom styles
 * correctly displays the target position, allows dragging, and receives moves.
 */
export function wrapChessboard(CB: any) {
  return function BoardWrapper(props: any) {
    const options = props.options ? { ...props.options } : {};
    const rest = { ...props };
    delete rest.options;

    const merged = { ...options, ...rest };

    // Legacy v4 prop name mapping for react-chessboard v5
    if (merged.arePiecesDraggable !== undefined && merged.allowDragging === undefined) {
      merged.allowDragging = Boolean(merged.arePiecesDraggable);
    }
    if (merged.customDarkSquareStyle && !merged.darkSquareStyle) {
      merged.darkSquareStyle = merged.customDarkSquareStyle;
    }
    if (merged.customLightSquareStyle && !merged.lightSquareStyle) {
      merged.lightSquareStyle = merged.customLightSquareStyle;
    }
    if (merged.customBoardStyle && !merged.boardStyle) {
      merged.boardStyle = merged.customBoardStyle;
    }
    if (merged.customSquareStyles && !merged.squareStyles) {
      merged.squareStyles = merged.customSquareStyles;
    }
    if (merged.customPieces && !merged.pieces) {
      merged.pieces = merged.customPieces;
    }
    if (merged.pieces && !merged.customPieces) {
      merged.customPieces = merged.pieces;
    }
    if (!merged.customPieces && !merged.pieces) {
      merged.customPieces = customChessPieces;
      merged.pieces = customChessPieces;
    }

    if (merged.showCoordinates !== undefined) {
      merged.showBoardNotation = merged.showCoordinates;
    }
    if (merged.showNotation !== undefined && merged.showBoardNotation === undefined) {
      merged.showBoardNotation = merged.showNotation;
    }

    // Convert legacy customArrows tuple format [from, to, color] to v5 Arrow objects
    if (Array.isArray(merged.customArrows) && !merged.arrows) {
      merged.arrows = merged.customArrows.map((a: any) => {
        if (Array.isArray(a)) {
          return { startSquare: a[0], endSquare: a[1], color: a[2] || 'rgba(234, 88, 12, 0.8)' };
        }
        if (a && typeof a === 'object' && ('from' in a || 'startSquare' in a)) {
          return {
            startSquare: a.startSquare || a.from,
            endSquare: a.endSquare || a.to,
            color: a.color || 'rgba(234, 88, 12, 0.8)',
          };
        }
        return a;
      });
    }

    // Normalize onPieceDrop handler:
    // Support BOTH v4 (sourceSquare, targetSquare, piece) and v5 ({ piece, sourceSquare, targetSquare })
    if (typeof merged.onPieceDrop === 'function') {
      const originalHandler = merged.onPieceDrop;
      merged.onPieceDrop = (arg0: any, arg1?: any, arg2?: any) => {
        let pieceStr = '';
        let src = '';
        let tgt: string | null = null;

        if (arg0 && typeof arg0 === 'object' && ('sourceSquare' in arg0 || 'targetSquare' in arg0)) {
          // Called by react-chessboard v5: { piece, sourceSquare, targetSquare }
          src = arg0.sourceSquare;
          tgt = arg0.targetSquare;
          pieceStr = arg0.piece?.pieceType || (typeof arg0.piece === 'string' ? arg0.piece : '');
        } else {
          // Called with v4 signature: (sourceSquare, targetSquare, piece)
          src = typeof arg0 === 'string' ? arg0 : '';
          tgt = typeof arg1 === 'string' ? arg1 : null;
          pieceStr = typeof arg2 === 'string' ? arg2 : (arg2?.pieceType || '');
        }

        if (!tgt || !src) return false;

        try {
          let result: any;
          // If handler explicitly declares 2+ parameters (sourceSquare, targetSquare):
          if (originalHandler.length >= 2) {
            result = originalHandler(src, tgt, pieceStr);
          } else {
            const v5Obj = {
              piece: { pieceType: pieceStr },
              sourceSquare: src,
              targetSquare: tgt,
            };
            result = originalHandler(v5Obj, tgt, pieceStr);
            if (result === undefined) {
              result = originalHandler(src, tgt, pieceStr);
            }
          }
          if (result instanceof Promise) return false;
          return Boolean(result);
        } catch (err) {
          // Fallback to positional calling if object call threw
          try {
            const fallbackRes = originalHandler(src, tgt, pieceStr);
            if (fallbackRes instanceof Promise) return false;
            return Boolean(fallbackRes);
          } catch (err2) {
            console.error('[ChessboardAdapter] onPieceDrop error:', err2);
            return false;
          }
        }
      };
    }

    // Normalize onSquareClick handler:
    // Support BOTH v4 (square: string) and v5 ({ square: string, piece?: string })
    if (typeof merged.onSquareClick === 'function') {
      const originalSquareClick = merged.onSquareClick;
      merged.onSquareClick = (arg0: any, arg1?: any) => {
        let sq = '';
        let pc: any = undefined;

        if (typeof arg0 === 'string') {
          sq = arg0;
          pc = arg1;
        } else if (arg0 && typeof arg0 === 'object') {
          sq = arg0.square || '';
          pc = arg0.piece;
        }

        try {
          // Build a hybrid object that satisfies both ({ square }) destructuring
          // and string operations (charCodeAt, [0], [1], toString, etc.)
          const v5Arg: any = { square: sq, piece: pc };
          if (sq) {
            Object.defineProperties(v5Arg, {
              charCodeAt: { value: (idx: number) => sq.charCodeAt(idx), writable: true, configurable: true },
              charAt: { value: (idx: number) => sq.charAt(idx), writable: true, configurable: true },
              slice: { value: (start?: number, end?: number) => sq.slice(start, end), writable: true, configurable: true },
              substring: { value: (start: number, end?: number) => sq.substring(start, end), writable: true, configurable: true },
              toUpperCase: { value: () => sq.toUpperCase(), writable: true, configurable: true },
              toLowerCase: { value: () => sq.toLowerCase(), writable: true, configurable: true },
              length: { value: sq.length, writable: true, configurable: true },
              0: { value: sq[0], writable: true, configurable: true },
              1: { value: sq[1], writable: true, configurable: true },
              toString: { value: () => sq, writable: true, configurable: true },
              valueOf: { value: () => sq, writable: true, configurable: true },
              [Symbol.toPrimitive]: { value: () => sq, configurable: true },
            });
          }

          // First try calling with string if handler expects 1 argument or string
          try {
            return originalSquareClick(sq, v5Arg);
          } catch {
            return originalSquareClick(v5Arg, sq);
          }
        } catch (err) {
          console.error('[ChessboardAdapter] onSquareClick error:', err);
        }
      };
    }

    return <CB options={merged} />;
  };
}

export const ChessboardAdapter = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;
