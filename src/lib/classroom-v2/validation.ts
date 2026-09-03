/**
 * Classroom V2 Move & Chess Validation
 */

import { Chess } from 'chess.js';
import { type MoveData } from './types';
import { DEFAULT_INITIAL_FEN } from './constants';

export interface ValidatedMoveResult {
  valid: boolean;
  error?: string;
  newFen?: string;
  san?: string;
  from?: string;
  to?: string;
  piece?: string;
  color?: 'w' | 'b';
  promotion?: string;
  uci?: string;
  isCheck?: boolean;
  isCheckmate?: boolean;
  isDraw?: boolean;
}

/**
 * Validates a move on a given FEN string using chess.js server-side.
 */
export function validateChessMove(
  currentFen: string,
  moveInput: { from: string; to: string; promotion?: string } | string,
  allowIllegalMoves = false
): ValidatedMoveResult {
  try {
    const fenToUse = currentFen && currentFen.trim() ? currentFen.trim() : DEFAULT_INITIAL_FEN;
    const chess = new Chess(fenToUse);

    const fromSquare = typeof moveInput === 'string' ? moveInput.slice(0, 2) : moveInput.from;
    const toSquare = typeof moveInput === 'string' ? moveInput.slice(2, 4) : moveInput.to;
    if (fromSquare && toSquare && fromSquare === toSquare) {
      return { valid: false, error: 'Source and target squares are identical.' };
    }

    if (allowIllegalMoves) {
      // 1. First attempt legal move through standard chess rules
      let legalMove: any = null;
      try {
        legalMove = chess.move(moveInput);
      } catch {}

      if (legalMove) {
        return {
          valid: true,
          newFen: chess.fen(),
          san: legalMove.san,
          from: legalMove.from,
          to: legalMove.to,
          piece: legalMove.piece,
          color: legalMove.color,
          promotion: legalMove.promotion,
          uci: `${legalMove.from}${legalMove.to}${legalMove.promotion || ''}`,
          isCheck: chess.inCheck(),
          isCheckmate: chess.isCheckmate(),
          isDraw: chess.isDraw(),
        };
      }

      // 2. Fallback: Free / Illegal teaching move
      const from = typeof moveInput === 'string' ? moveInput.slice(0, 2) : moveInput.from;
      const to = typeof moveInput === 'string' ? moveInput.slice(2, 4) : moveInput.to;
      const promotion = typeof moveInput === 'object' ? moveInput.promotion : undefined;

      const piece = chess.get(from as any);
      if (!piece) {
        return {
          valid: false,
          error: `No piece at square ${from}.`,
        };
      }

      // Remove moving piece from source square
      chess.remove(from as any);
      // Remove captured piece from target square if any
      chess.remove(to as any);

      // Place moving piece on target square (handling promotion if requested)
      const pieceTypeToPut = promotion ? (promotion.toLowerCase() as any) : piece.type;
      chess.put({ type: pieceTypeToPut, color: piece.color }, to as any);

      // Safe teaching notation: e2 → e5, Bb1 → h7, Ke1 → e5
      const piecePrefix = piece.type === 'p' ? '' : piece.type.toUpperCase();
      const san = piecePrefix ? `${piecePrefix}${from} → ${to}` : `${from} → ${to}`;

      return {
        valid: true,
        newFen: chess.fen(),
        san,
        from,
        to,
        piece: piece.type,
        color: piece.color,
        promotion,
        uci: `${from}${to}${promotion || ''}`,
        isCheck: false,
        isCheckmate: false,
        isDraw: false,
      };
    }

    const moveObj = chess.move(moveInput);
    if (!moveObj) {
      return {
        valid: false,
        error: 'Illegal chess move according to standard FIDE rules.',
      };
    }

    return {
      valid: true,
      newFen: chess.fen(),
      san: moveObj.san,
      from: moveObj.from,
      to: moveObj.to,
      piece: moveObj.piece,
      color: moveObj.color,
      promotion: moveObj.promotion,
      uci: `${moveObj.from}${moveObj.to}${moveObj.promotion || ''}`,
      isCheck: chess.inCheck(),
      isCheckmate: chess.isCheckmate(),
      isDraw: chess.isDraw(),
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Invalid position or move format.',
    };
  }
}

/**
 * Validates whether a FEN string is structurally valid according to chess rules.
 */
export function validateFen(fen: string): boolean {
  try {
    const c = new Chess(fen);
    return Boolean(c.fen());
  } catch {
    return false;
  }
}

/**
 * Parses raw PGN text into canonical MoveData array starting from standard position.
 */
export function parsePgnToMoves(pgnText: string, playedByUserId: string): { moves: MoveData[]; finalFen: string } {
  try {
    const chess = new Chess();
    chess.loadPgn(pgnText);
    const history = chess.history({ verbose: true });
    const finalFen = chess.fen();

    // Replay on clean board to capture fenAfter for every single move
    const replayChess = new Chess();
    const parsedMoves: MoveData[] = [];

    for (let i = 0; i < history.length; i++) {
      const h = history[i];
      const res = replayChess.move({ from: h.from, to: h.to, promotion: h.promotion });
      if (res) {
        parsedMoves.push({
          moveNumber: Math.floor(i / 2) + 1,
          san: res.san,
          from: res.from,
          to: res.to,
          piece: res.piece,
          color: res.color,
          promotion: res.promotion,
          fenAfter: replayChess.fen(),
          uci: `${res.from}${res.to}${res.promotion || ''}`,
          playedBy: playedByUserId,
          timestamp: new Date().toISOString(),
        });
      }
    }

    return { moves: parsedMoves, finalFen };
  } catch (err) {
    return { moves: [], finalFen: DEFAULT_INITIAL_FEN };
  }
}
