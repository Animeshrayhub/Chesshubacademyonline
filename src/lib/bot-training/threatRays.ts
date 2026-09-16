import { Chess, type Move } from 'chess.js';
import { computeBotMove } from './chessBotEngine';

export interface ThreatDetail {
  from: string;
  to: string;
  attackerPiece: string;
  targetPiece: string;
  san: string;
  description: string;
}

export interface ThreatAnalysisResult {
  threats: ThreatDetail[];
  threatArrows: Array<[string, string, string]>;
  threatSquareStyles: Record<string, React.CSSProperties>;
  threatCount: number;
}

export interface DefenseAnalysisResult {
  defenseArrows: Array<[string, string, string]>;
  defenseSquareStyles: Record<string, React.CSSProperties>;
  defendedCount: number;
}

export interface CoachHintResult {
  hintArrow: [string, string, string] | null;
  hintSquareStyles: Record<string, React.CSSProperties>;
  hintSan: string | null;
  hintExplanation: string;
}

const PIECE_NAMES: Record<string, string> = {
  p: 'Pawn',
  n: 'Knight',
  b: 'Bishop',
  r: 'Rook',
  q: 'Queen',
  k: 'King',
};

/**
 * Computes active threats posed by opponent pieces against the student's pieces.
 */
export function getThreatRays(
  game: Chess,
  playerColor: 'white' | 'black'
): ThreatAnalysisResult {
  const opponentColor = playerColor === 'white' ? 'black' : 'white';
  const playerCode = playerColor === 'white' ? 'w' : 'b';
  const opponentCode = opponentColor === 'white' ? 'w' : 'b';

  // Determine opponent moves: if it's currently player's turn, clone board and flip turn
  let oppMoves: Move[] = [];
  try {
    if (game.turn() === opponentCode) {
      oppMoves = game.moves({ verbose: true });
    } else {
      const fenParts = game.fen().split(' ');
      fenParts[1] = opponentCode;
      fenParts[3] = '-'; // clear en-passant to avoid illegal FEN
      const oppBoard = new Chess();
      oppBoard.load(fenParts.join(' '));
      oppMoves = oppBoard.moves({ verbose: true });
    }
  } catch {
    return { threats: [], threatArrows: [], threatSquareStyles: {}, threatCount: 0 };
  }

  const threats: ThreatDetail[] = [];
  const threatArrows: Array<[string, string, string]> = [];
  const threatSquareStyles: Record<string, React.CSSProperties> = {};
  const seenArrowKeys = new Set<string>();

  for (const m of oppMoves) {
    // A threat occurs if the opponent can capture a student piece
    if (m.captured) {
      const arrowKey = `${m.from}->${m.to}`;
      if (!seenArrowKeys.has(arrowKey)) {
        seenArrowKeys.add(arrowKey);
        threatArrows.push([m.from, m.to, 'rgba(239, 68, 68, 0.88)']);
      }

      const attackerName = PIECE_NAMES[m.piece] || 'Piece';
      const targetName = PIECE_NAMES[m.captured] || 'Piece';

      threats.push({
        from: m.from,
        to: m.to,
        attackerPiece: m.piece,
        targetPiece: m.captured,
        san: m.san,
        description: `⚠️ Opponent's ${attackerName} (${m.from}) attacks your ${targetName} on ${m.to}!`,
      });

      // Highlight the targeted student piece with a danger glow
      threatSquareStyles[m.to] = {
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.6) 0%, rgba(239, 68, 68, 0.2) 65%, transparent 85%)',
        boxShadow: 'inset 0 0 0 2px rgba(239, 68, 68, 0.8)',
        borderRadius: '8px',
      };
    }
  }

  // Also highlight check if opponent is checking the King
  if (game.inCheck()) {
    // Find player's King square
    const board = game.board();
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.type === 'k' && piece.color === playerCode) {
          const colLetter = String.fromCharCode(97 + c);
          const rankNumber = 8 - r;
          const kingSq = `${colLetter}${rankNumber}`;
          threatSquareStyles[kingSq] = {
            background: 'radial-gradient(circle, rgba(225, 29, 72, 0.85) 0%, rgba(225, 29, 72, 0.35) 70%, transparent 90%)',
            boxShadow: '0 0 15px rgba(225, 29, 72, 0.9)',
            borderRadius: '8px',
          };
        }
      }
    }
  }

  return {
    threats,
    threatArrows,
    threatSquareStyles,
    threatCount: threats.length,
  };
}

/**
 * Computes defensive links between friendly pieces (green shield rays).
 */
export function getDefenseRays(
  game: Chess,
  playerColor: 'white' | 'black'
): DefenseAnalysisResult {
  const playerCode = playerColor === 'white' ? 'w' : 'b';
  const oppCode = playerColor === 'white' ? 'b' : 'w';
  const defenseArrows: Array<[string, string, string]> = [];
  const defenseSquareStyles: Record<string, React.CSSProperties> = {};
  const seenArrowKeys = new Set<string>();

  try {
    const board = game.board();
    // Gather all friendly pieces
    const friendlySquares: Array<{ square: string; type: string }> = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = board[r][c];
        if (piece && piece.color === playerCode && piece.type !== 'k') {
          const sq = `${String.fromCharCode(97 + c)}${8 - r}`;
          friendlySquares.push({ square: sq, type: piece.type });
        }
      }
    }

    // For each friendly piece, test if another friendly piece guards it
    for (const target of friendlySquares) {
      // Simulate opponent piece on this square
      const testGame = new Chess(game.fen());
      // Set turn to player
      const fenParts = testGame.fen().split(' ');
      fenParts[1] = playerCode;
      fenParts[3] = '-';
      testGame.load(fenParts.join(' '));

      // Put an opponent dummy piece on target square to see who can recapture
      testGame.put({ type: 'p', color: oppCode }, target.square as any);
      const friendlyMoves = testGame.moves({ verbose: true });

      for (const m of friendlyMoves) {
        if (m.to === target.square && m.from !== target.square) {
          const arrowKey = `${m.from}->${target.square}`;
          if (!seenArrowKeys.has(arrowKey)) {
            seenArrowKeys.add(arrowKey);
            defenseArrows.push([m.from, target.square, 'rgba(34, 197, 94, 0.72)']);
          }

          defenseSquareStyles[target.square] = {
            background: 'radial-gradient(circle, rgba(34, 197, 94, 0.45) 0%, rgba(34, 197, 94, 0.15) 60%, transparent 80%)',
            boxShadow: 'inset 0 0 0 1.5px rgba(34, 197, 94, 0.7)',
            borderRadius: '8px',
          };
        }
      }
    }
  } catch {
    // Fallback if simulation encounters an edge-case FEN
  }

  return {
    defenseArrows,
    defenseSquareStyles,
    defendedCount: defenseArrows.length,
  };
}

/**
 * Computes Coach recommendation hint arrow (radiant gold) and tactical advice.
 */
export function getCoachHint(
  game: Chess,
  playerColor: 'white' | 'black',
  uciHistory: string[] = []
): CoachHintResult {
  try {
    const isPlayerTurn = (game.turn() === 'w' ? 'white' : 'black') === playerColor;
    if (!isPlayerTurn) {
      return {
        hintArrow: null,
        hintSquareStyles: {},
        hintSan: null,
        hintExplanation: "Wait for your opponent's move before asking for a hint!",
      };
    }

    // Run engine at level 8 for high quality tactical calculation
    const botResult = computeBotMove(game, 8, playerColor, uciHistory);

    const hintArrow: [string, string, string] = [
      botResult.from,
      botResult.to,
      'rgba(245, 158, 11, 0.95)',
    ];

    const hintSquareStyles: Record<string, React.CSSProperties> = {
      [botResult.from]: {
        backgroundColor: 'rgba(245, 158, 11, 0.35)',
        boxShadow: '0 0 10px rgba(245, 158, 11, 0.7)',
        borderRadius: '8px',
      },
      [botResult.to]: {
        backgroundColor: 'rgba(245, 158, 11, 0.5)',
        boxShadow: '0 0 15px rgba(245, 158, 11, 0.9)',
        borderRadius: '8px',
      },
    };

    const explanation = `💡 Coach Hint: Play ${botResult.san} (${botResult.from.toUpperCase()} → ${botResult.to.toUpperCase()}). Strong tactical move!`;

    return {
      hintArrow,
      hintSquareStyles,
      hintSan: botResult.san,
      hintExplanation: explanation,
    };
  } catch (err: any) {
    return {
      hintArrow: null,
      hintSquareStyles: {},
      hintSan: null,
      hintExplanation: 'No hint available in current position.',
    };
  }
}
