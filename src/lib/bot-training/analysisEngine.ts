import { Chess } from 'chess.js';
import type { AnalyzedMistake, GameAnalysisSummary, MistakeType, MistakeSeverity } from './types';

/**
 * Analyzes a completed game PGN using position-based heuristics to detect genuine mistakes.
 * Only flags moves where a real material or positional problem can be identified.
 *
 * @param pgn - The full PGN string of the completed game.
 * @param studentColor - 'white' or 'black' — which side was the student.
 * @param studentId - The authenticated student's user ID (populated on each mistake).
 * @param gameId - The DB UUID of the game row (populated on each mistake).
 */
export function analyzeGamePositions(
  pgn: string,
  studentColor: 'white' | 'black',
  studentId: string = '',
  gameId: string = ''
): GameAnalysisSummary {
  const chess = new Chess();
  if (pgn && pgn.trim()) {
    try {
      chess.loadPgn(pgn.trim());
    } catch {
      chess.reset();
    }
  }

  const history = chess.history({ verbose: true });
  const mistakes: AnalyzedMistake[] = [];
  let blundersCount = 0;
  let mistakesCount = 0;
  let inaccuraciesCount = 0;

  // Piece material values
  const pieceValue: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

  const tempGame = new Chess();
  const isStudentWhite = studentColor === 'white';

  // Track castling rights as we replay
  let studentCastledKingside = false;
  let studentCastledQueenside = false;
  let studentHadCastlingRights = true;

  for (let i = 0; i < history.length; i++) {
    const move = history[i];

    // Track castling
    if (move.flags.includes('k')) {
      if ((move.color === 'w' && isStudentWhite) || (move.color === 'b' && !isStudentWhite)) {
        studentCastledKingside = true;
      }
    }
    if (move.flags.includes('q')) {
      if ((move.color === 'w' && isStudentWhite) || (move.color === 'b' && !isStudentWhite)) {
        studentCastledQueenside = true;
      }
    }

    const fenBefore = tempGame.fen();
    tempGame.move(move);
    const fenAfter = tempGame.fen();

    // Only analyze student's moves
    const isStudentMove = (move.color === 'w' && isStudentWhite) || (move.color === 'b' && !isStudentWhite);
    if (!isStudentMove) continue;

    const moveNum = Math.floor(i / 2) + 1;
    const halfMoveIndex = i; // full move index in history

    let mistakeType: MistakeType | null = null;
    let theme = '';
    let explanation = '';
    let betterIdea = '';
    let evalDrop = 0;

    // ── HEURISTIC 1: Genuine hanging-piece detection ──────────────────────────
    // If the student moved a piece away from a square that was defending another
    // piece, and that other piece can now be captured for free.
    // Simple proxy: student moved a non-pawn AND there is a piece on the board
    // of the same side that is now attacked and undefended.
    if (!mistakeType && move.piece !== 'k') {
      const gameAfter = new Chess(fenAfter);
      const opponentColor = isStudentWhite ? 'b' : 'w';
      const studentColorCode = isStudentWhite ? 'w' : 'b';

      // Check if any student piece is now hanging (attacked and has no defender)
      const board = gameAfter.board();
      for (const row of board) {
        for (const sq of row) {
          if (!sq || sq.color !== studentColorCode || sq.type === 'k') continue;
          const squareName = sq.square;
          const isAttacked = gameAfter.isAttacked(squareName as any, opponentColor);
          if (!isAttacked) continue;

          // Check if student has defenders
          const hasDefender = gameAfter.isAttacked(squareName as any, studentColorCode);
          const pieceVal = pieceValue[sq.type] ?? 1;

          if (!hasDefender && pieceVal >= 3) {
            // Undefended piece worth ≥3 points is hanging — genuine blunder
            mistakeType = 'blunder';
            theme = 'hanging_pieces';
            explanation = `Your ${getPieceName(sq.type)} on ${squareName} is undefended and can be captured for free.`;
            betterIdea = `Before this move, check if all your pieces are protected. Move your ${getPieceName(sq.type)} to a safer square or add a defender.`;
            evalDrop = pieceVal >= 5 ? 3.5 : 2.5;
            blundersCount++;
            break;
          } else if (!hasDefender && pieceVal === 1) {
            // Hanging pawn — inaccuracy
            if (!mistakeType) {
              mistakeType = 'inaccuracy';
              theme = 'pawn_structure';
              explanation = `The pawn on ${squareName} is unprotected and can be taken.`;
              betterIdea = 'Try to keep your pawns defended by other pawns or pieces.';
              evalDrop = 1.0;
              inaccuraciesCount++;
            }
          }
        }
        if (mistakeType === 'blunder') break;
      }
    }

    // ── HEURISTIC 2: Very early queen development (before move 4) ────────────
    // Only flag if student brings out the queen before developing any minor pieces
    // AND before move 4 in the game.
    if (!mistakeType && move.piece === 'q' && moveNum <= 3) {
      // Count how many minor pieces (knights/bishops) student has developed
      const gameBeforeChess = new Chess(fenBefore);
      const startingMinorPieceSquares = isStudentWhite
        ? ['b1', 'g1', 'c1', 'f1']  // white knights and bishops
        : ['b8', 'g8', 'c8', 'f8']; // black knights and bishops

      let minorPiecesDeveloped = 0;
      for (const sq of startingMinorPieceSquares) {
        const piece = gameBeforeChess.get(sq as any);
        if (!piece) minorPiecesDeveloped++; // piece has left starting square = developed
      }

      if (minorPiecesDeveloped === 0) {
        // Queen came out before any minor piece development
        mistakeType = 'inaccuracy';
        theme = 'opening_principles';
        explanation = `Bringing the queen out to ${move.to} very early makes it a target. Opponents can attack it with less valuable pieces, wasting your time.`;
        betterIdea = 'Develop Knights and Bishops first before activating the Queen. A good rule: develop 2 minor pieces before moving the queen.';
        evalDrop = 1.2;
        inaccuraciesCount++;
      }
    }

    // ── HEURISTIC 3: King moved before castling (lost castling rights) ───────
    // Only flag if: king has moved early (before castling), it's past move 6,
    // and castling rights existed before the move.
    if (!mistakeType && move.piece === 'k' && moveNum >= 6
        && !studentCastledKingside && !studentCastledQueenside) {
      // Did student have castling rights before this move?
      const gameBeforeChess = new Chess(fenBefore);
      const fen = gameBeforeChess.fen();
      const castlingPart = fen.split(' ')[2];
      const studentCastlingRights = isStudentWhite
        ? castlingPart.includes('K') || castlingPart.includes('Q')
        : castlingPart.includes('k') || castlingPart.includes('q');

      if (studentCastlingRights) {
        mistakeType = 'inaccuracy';
        theme = 'king_safety';
        explanation = `Moving your king to ${move.to} uses up your castling rights. Your king is now harder to keep safe for the rest of the game.`;
        betterIdea = 'Castle early to move your king to safety behind a wall of pawns. Avoid moving your king in the opening unless forced.';
        evalDrop = 1.5;
        inaccuraciesCount++;
        studentHadCastlingRights = false;
      }
    }

    // ── HEURISTIC 4: Moving into check when there was a safe alternative ─────
    // (chess.js would prevent illegal moves, but if the student's position is in
    // check after opponent's move and they escape in a costly way, flag it)
    // This is complex to detect; skip for now to avoid false positives.

    // ── HEURISTIC 5: Trading a better piece for a worse one (unforced) ───────
    if (!mistakeType && move.captured) {
      const capturedVal = pieceValue[move.captured] ?? 1;
      const movingVal = pieceValue[move.piece] ?? 1;

      // Student captured a lower-value piece with a higher-value piece AND
      // the captured square was defended — so student loses material
      if (movingVal > capturedVal + 1) {
        // Check if the captured square was defended (opponent can recapture)
        const gameBeforeChess = new Chess(fenBefore);
        const opponentColor = isStudentWhite ? 'b' : 'w';
        const captureSquareDefended = gameBeforeChess.isAttacked(move.to as any, opponentColor);

        if (captureSquareDefended) {
          const materialLoss = movingVal - capturedVal;
          if (materialLoss >= 3) {
            mistakeType = 'blunder';
            theme = 'hanging_pieces';
            explanation = `You captured the ${getPieceName(move.captured)} with your ${getPieceName(move.piece)}, but the square was defended. You lose ${materialLoss} points of material.`;
            betterIdea = `Before capturing, always check if your piece can be recaptured. The ${getPieceName(move.captured)} was not worth sacrificing your ${getPieceName(move.piece)} for.`;
            evalDrop = materialLoss * 0.5 + 1.5;
            blundersCount++;
          } else if (materialLoss >= 1) {
            mistakeType = 'mistake';
            theme = 'hanging_pieces';
            explanation = `You traded your ${getPieceName(move.piece)} for a ${getPieceName(move.captured)} — losing ${materialLoss} point(s) of material.`;
            betterIdea = 'Try to trade pieces of equal value, or only sacrifice material when it brings a clear tactical or positional benefit.';
            evalDrop = materialLoss * 0.4 + 1.0;
            mistakesCount++;
          }
        }
      }
    }

    if (mistakeType && theme) {
      // Compute a principled alternative candidate move from fenBefore
      let candidateBestMove = '';
      try {
        const testGame = new Chess(fenBefore);
        const legalAlts = testGame.moves({ verbose: true }).filter((m) => m.san !== move.san);
        const opponentColor = isStudentWhite ? 'b' : 'w';
        const studentColorCode = isStudentWhite ? 'w' : 'b';

        const safeAlts = legalAlts.filter((alt) => {
          const simGame = new Chess(fenBefore);
          simGame.move(alt);
          const isTargetAttacked = simGame.isAttacked(alt.to as any, opponentColor);
          const hasDefender = simGame.isAttacked(alt.to as any, studentColorCode);
          if (isTargetAttacked && !hasDefender && (pieceValue[alt.piece] ?? 1) >= 3) return false;
          return true;
        });

        if (safeAlts.length > 0) {
          const bestCandidate =
            safeAlts.find((m) => m.captured) ||
            safeAlts.find((m) => m.piece === 'n' || m.piece === 'b') ||
            safeAlts.find((m) => m.piece === 'p' && (m.to.includes('4') || m.to.includes('5'))) ||
            safeAlts[0];
          candidateBestMove = bestCandidate.san;
        }
      } catch {}

      mistakes.push({
        id: crypto.randomUUID(),
        student_id: studentId,
        game_id: gameId,
        move_number: moveNum,
        fen_before: fenBefore,
        fen_after: fenAfter,
        played_move: move.san,
        best_move: candidateBestMove,
        evaluation_before: '0.0',
        evaluation_after: evalDrop > 2 ? `-${evalDrop.toFixed(1)}` : `-${evalDrop.toFixed(1)}`,
        evaluation_drop: evalDrop,
        mistake_type: mistakeType,
        severity: evalDrop > 2.5 ? 'high' : evalDrop > 1.5 ? 'medium' : 'low',
        theme,
        explanation,
        better_idea: betterIdea,
        created_at: new Date().toISOString(),
      });
    }
  }

  // Calculate overall accuracy
  const totalStudentMoves = Math.max(1, Math.ceil(history.length / 2));
  const weightedPenalties = blundersCount * 15 + mistakesCount * 8 + inaccuraciesCount * 3;
  const accuracy = Math.max(40, Math.min(99, Math.round(100 - (weightedPenalties / totalStudentMoves) * 10)));

  return {
    accuracy,
    blunders: blundersCount,
    mistakes: mistakesCount,
    inaccuracies: inaccuraciesCount,
    missedOpportunities: 0,
    keyMoments: mistakes,
    recommendedPuzzles: [],
  };
}

function getPieceName(p: string): string {
  switch (p) {
    case 'p': return 'Pawn';
    case 'n': return 'Knight';
    case 'b': return 'Bishop';
    case 'r': return 'Rook';
    case 'q': return 'Queen';
    case 'k': return 'King';
    default: return 'Piece';
  }
}
