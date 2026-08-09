'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { customChessPieces } from './ChessPieces';

/**
 * Higher-Order Component / Wrapper for react-chessboard v5.
 * Normalizes props (legacy v4 prop names vs v5 options object) so that
 * any board rendered with position, orientation, or custom styles
 * correctly displays the target position rather than reverting to start FEN.
 */
export function wrapChessboard(CB: any) {
  return function BoardWrapper(props: any) {
    const options = props.options ? { ...props.options } : {};
    const rest = { ...props };
    delete rest.options;

    const merged = { ...options, ...rest };

    // Legacy v4 prop name mapping for react-chessboard v5
    if (merged.arePiecesDraggable !== undefined && merged.allowDragging === undefined) {
      merged.allowDragging = merged.arePiecesDraggable;
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

    return <CB options={merged} />;
  };
}

export const ChessboardAdapter = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;
