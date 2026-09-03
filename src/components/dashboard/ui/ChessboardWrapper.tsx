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
          // Always call with v5 object format. The handler determines its own return value.
          // Do NOT coerce false→true: server-authoritative boards return false to prevent
          // the chessboard component from managing piece position internally.
          const result = originalHandler({
            piece: { pieceType: pieceStr },
            sourceSquare: src,
            targetSquare: tgt,
          });
          // If the handler returns a Promise (async), treat as false (FEN prop drives position).
          if (result instanceof Promise) return false;
          return Boolean(result);
        } catch (err) {
          console.error('[ChessboardAdapter] onPieceDrop error:', err);
          return false;
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
