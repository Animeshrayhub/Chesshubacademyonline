import { Chess } from 'chess.js';
import { type MoveData } from './types';

export type MoveAnnotationType = 'best' | 'good' | 'inaccuracy' | 'mistake' | 'blunder' | 'book';

export interface MoveEvaluation {
  scoreText: string;
  scoreNumber: number; // In pawns from White's perspective (+ is White advantage)
  delta: number; // Loss compared to previous move in pawns (from moving player's perspective)
  annotation?: MoveAnnotationType;
  glyph?: string; // "!", "?", "??", "?!"
}

// Simplified piece values in centipawns
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// Center squares bonus
const CENTER_SQUARES = new Set(['d4', 'e4', 'd5', 'e5', 'c4', 'f4', 'c5', 'f5']);

/**
 * Fast static position evaluation in pawns (+ White, - Black)
 */
export function evaluatePosition(fen: string): number {
  try {
    const chess = new Chess(fen.trim());
    if (chess.isCheckmate()) {
      return chess.turn() === 'w' ? -99.0 : 99.0;
    }
    if (chess.isDraw()) {
      return 0.0;
    }

    const board = chess.board();
    let score = 0;

    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (!piece) continue;

        const val = PIECE_VALUES[piece.type] || 0;
        const square = `${String.fromCharCode('a'.charCodeAt(0) + c)}${8 - r}`;
        let positionalBonus = 0;

        // Central control bonus
        if (CENTER_SQUARES.has(square)) {
          positionalBonus += piece.type === 'p' ? 25 : 15;
        }

        // Development bonus in opening
        if (piece.type === 'n' || piece.type === 'b') {
          if ((piece.color === 'w' && r < 7) || (piece.color === 'b' && r > 0)) {
            positionalBonus += 15;
          }
        }

        const totalPieceScore = val + positionalBonus;
        score += piece.color === 'w' ? totalPieceScore : -totalPieceScore;
      }
    }

    // Convert centipawns to pawns
    return Math.round((score / 100) * 10) / 10;
  } catch {
    return 0.0;
  }
}

/**
 * Evaluates full move history and generates badges (inaccuracy, mistake, blunder, best)
 */
export function analyzeMoveHistory(moves: MoveData[], initialFen?: string): Map<number, MoveEvaluation> {
  const result = new Map<number, MoveEvaluation>();
  if (!moves || moves.length === 0) return result;

  let prevScore = initialFen ? evaluatePosition(initialFen) : 0.0;

  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    const currentScore = evaluatePosition(move.fenAfter);
    const isWhite = move.color === 'w';

    // Delta from the moving player's perspective (positive delta means position got worse)
    const delta = isWhite ? prevScore - currentScore : currentScore - prevScore;

    let annotation: MoveAnnotationType | undefined;
    let glyph: string | undefined;

    // Check for annotations based on pawn evaluation swing
    if (i < 4 && delta <= 0.3) {
      annotation = 'book';
    } else if (delta >= 2.5) {
      annotation = 'blunder';
      glyph = '??';
    } else if (delta >= 1.2) {
      annotation = 'mistake';
      glyph = '?';
    } else if (delta >= 0.5) {
      annotation = 'inaccuracy';
      glyph = '?!';
    } else if (delta <= -0.4) {
      annotation = 'best';
      glyph = '!';
    } else if (delta <= 0.1) {
      annotation = 'good';
    }

    const formattedScore = currentScore > 0 ? `+${currentScore.toFixed(1)}` : currentScore.toFixed(1);

    result.set(i, {
      scoreText: formattedScore,
      scoreNumber: currentScore,
      delta: Math.round(delta * 10) / 10,
      annotation,
      glyph,
    });

    prevScore = currentScore;
  }

  return result;
}
