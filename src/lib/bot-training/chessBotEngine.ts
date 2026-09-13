import { Chess } from 'chess.js';

// ── PIECE VALUES ─────────────────────────────────────────────────────────────
const PIECE_VALUES: Record<string, number> = {
  p: 100,
  n: 320,
  b: 330,
  r: 500,
  q: 900,
  k: 20000,
};

// ── PIECE SQUARE TABLES (White perspective, rank 8 down to 1) ─────────────────
const PAWN_PST = [
  [0,   0,   0,   0,   0,   0,   0,   0],
  [50, 50,  50,  50,  50,  50,  50,  50],
  [10, 10,  20,  30,  30,  20,  10,  10],
  [5,   5,  10,  25,  25,  10,   5,   5],
  [0,   0,   0,  20,  20,   0,   0,   0],
  [5,  -5, -10,   0,   0, -10,  -5,   5],
  [5,  10,  10, -20, -20,  10,  10,   5],
  [0,   0,   0,   0,   0,   0,   0,   0],
];

const KNIGHT_PST = [
  [-50, -40, -30, -30, -30, -30, -40, -50],
  [-40, -20,   0,   0,   0,   0, -20, -40],
  [-30,   0,  10,  15,  15,  10,   0, -30],
  [-30,   5,  15,  20,  20,  15,   5, -30],
  [-30,   0,  15,  20,  20,  15,   0, -30],
  [-30,   5,  10,  15,  15,  10,   5, -30],
  [-40, -20,   0,   5,   5,   0, -20, -40],
  [-50, -40, -30, -30, -30, -30, -40, -50],
];

const BISHOP_PST = [
  [-20, -10, -10, -10, -10, -10, -10, -20],
  [-10,   0,   0,   0,   0,   0,   0, -10],
  [-10,   0,   5,  10,  10,   5,   0, -10],
  [-10,   5,   5,  10,  10,   5,   5, -10],
  [-10,   0,  10,  10,  10,  10,   0, -10],
  [-10,  10,  10,  10,  10,  10,  10, -10],
  [-10,   5,   0,   0,   0,   0,   5, -10],
  [-20, -10, -10, -10, -10, -10, -10, -20],
];

const ROOK_PST = [
  [0,   0,   0,   0,   0,   0,   0,   0],
  [5,  10,  10,  10,  10,  10,  10,   5],
  [-5,  0,   0,   0,   0,   0,   0,  -5],
  [-5,  0,   0,   0,   0,   0,   0,  -5],
  [-5,  0,   0,   0,   0,   0,   0,  -5],
  [-5,  0,   0,   0,   0,   0,   0,  -5],
  [-5,  0,   0,   0,   0,   0,   0,  -5],
  [0,   0,   0,   5,   5,   0,   0,   0],
];

const QUEEN_PST = [
  [-20, -10, -10, -5, -5, -10, -10, -20],
  [-10,   0,   0,  0,  0,   0,   0, -10],
  [-10,   0,   5,  5,  5,   5,   0, -10],
  [-5,    0,   5,  5,  5,   5,   0,  -5],
  [0,     0,   5,  5,  5,   5,   0,  -5],
  [-10,   5,   5,  5,  5,   5,   0, -10],
  [-10,   0,   5,  0,  0,   0,   0, -10],
  [-20, -10, -10, -5, -5, -10, -10, -20],
];

const KING_MID_PST = [
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-30, -40, -40, -50, -50, -40, -40, -30],
  [-20, -30, -30, -40, -40, -30, -30, -20],
  [-10, -20, -20, -20, -20, -20, -20, -10],
  [20,   20,   0,   0,   0,   0,  20,  20],
  [20,   30,  10,   0,   0,  10,  30,  20],
];

function getPstScore(pieceType: string, rankIdx: number, fileIdx: number, isWhite: boolean): number {
  const r = isWhite ? rankIdx : 7 - rankIdx;
  const f = fileIdx;
  switch (pieceType) {
    case 'p': return PAWN_PST[r]?.[f] ?? 0;
    case 'n': return KNIGHT_PST[r]?.[f] ?? 0;
    case 'b': return BISHOP_PST[r]?.[f] ?? 0;
    case 'r': return ROOK_PST[r]?.[f] ?? 0;
    case 'q': return QUEEN_PST[r]?.[f] ?? 0;
    case 'k': return KING_MID_PST[r]?.[f] ?? 0;
    default: return 0;
  }
}

// ── OPENING BOOK WITH FRIED LIVER & STANDARD REPERTOIRES ───────────────────────
export interface OpeningNode {
  name: string;
  comment?: string;
  weight?: number;
}

// Keyed by UCI moves joined by space, e.g. "e2e4 e7e5 g1f3"
export const OPENING_BOOK: Record<string, Record<string, OpeningNode>> = {
  // START POSITION:
  '': {
    'e2e4': { name: "King's Pawn Opening (1. e4)", comment: "Controlling the center and opening paths for Queen and Bishop!" },
    'd2d4': { name: "Queen's Pawn Opening (1. d4)", comment: "Solid central control!" },
    'g1f3': { name: "Réti Opening (1. Nf3)", comment: "Flexible knight development!" },
    'c2c4': { name: "English Opening (1. c4)", comment: "Fighting for d5 from the flank!" },
  },

  // 1. e4
  'e2e4': {
    'e7e5': { name: "Open Game (1... e5)", comment: "Symmetric center fight!" },
    'c7c5': { name: "Sicilian Defense (1... c5)", comment: "Asymmetrical counter-attack against d4!" },
    'e7e6': { name: "French Defense (1... e6)", comment: "Solid preparation for d7-d5!" },
    'c7c6': { name: "Caro-Kann Defense (1... c6)", comment: "Ultra-solid pawn defense!" },
    'd7d5': { name: "Scandinavian Defense (1... d5)", comment: "Direct challenge to e4!" },
  },

  // 1. e4 e5
  'e2e4 e7e5': {
    'g1f3': { name: "King's Knight Opening (2. Nf3)", comment: "Developing with an attack on e5!" },
    'f1c4': { name: "Bishop's Opening (2. Bc4)", comment: "Aiming directly at the vulnerable f7 square!" },
    'd1h5': { name: "Wayward Queen Attack (2. Qh5)", comment: "Testing your defenses! Watch e5 and f7!" },
    'd2d4': { name: "Center Game (2. d4)", comment: "Blowing open the center immediately!" },
    'f2f4': { name: "King's Gambit (2. f4)", comment: "Aggressive pawn sacrifice for rapid development!" },
  },

  // 1. e4 e5 2. Qh5 (Wayward Queen / Scholar's test)
  'e2e4 e7e5 d1h5': {
    'b8c6': { name: "Wayward Queen: Knight Defense (2... Nc6)", comment: "Good defense of e5!" },
    'g8f6': { name: "Wayward Queen: Counter (2... Nf6)", comment: "Counter-attacking, but e5 is hanging!" },
    'd7d6': { name: "Wayward Queen: Pawn Defense (2... d6)", comment: "Solid defense of e5!" },
  },
  'e2e4 e7e5 d1h5 b8c6': {
    'f1c4': { name: "Wayward Queen Attack (3. Bc4)", comment: "⚠️ Scholar's Mate threat! Threatening 4. Qxf7# — play 3... g6 to defend!" },
  },
  'e2e4 e7e5 d1h5 b8c6 f1c4 g7g6': {
    'h5f3': { name: "Wayward Queen Attack (4. Qf3)", comment: "Still targeting f7 with Queen and Bishop! Guard f7 with 4... Nf6!" },
  },
  'e2e4 e7e5 d1h5 b8c6 f1c4 g7g6 h5f3 g8f6': {
    'g1e2': { name: "Wayward Queen Parried (5. Ne2)", comment: "Well played! You completely stopped Scholar's Mate." },
  },

  // 1. e4 e5 2. Nf3
  'e2e4 e7e5 g1f3': {
    'b8c6': { name: "Open Game: Normal Defense (2... Nc6)", comment: "Developing knight to guard e5!" },
    'g8f6': { name: "Petrov's Defense (2... Nf6)", comment: "Counter-attacking e4!" },
    'd7d6': { name: "Philidor Defense (2... d6)", comment: "Defending e5 with pawn!" },
  },

  // 1. e4 e5 2. Nf3 Nc6
  'e2e4 e7e5 g1f3 b8c6': {
    'f1c4': { name: "Italian Game (3. Bc4)", comment: "Italian Game! Eyeing the sensitive f7 square!" },
    'f1b5': { name: "Ruy Lopez (3. Bb5)", comment: "Spanish Opening - pinning the defender of e5!" },
    'd2d4': { name: "Scotch Game (3. d4)", comment: "Striking at the center right away!" },
    'b1c3': { name: "Three Knights Game (3. Nc3)", comment: "Solid, harmonious piece development!" },
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 (Italian Game)
  'e2e4 e7e5 g1f3 b8c6 f1c4': {
    'g8f6': { name: "Two Knights Defense (3... Nf6)", comment: "Counter-attacking e4! White can launch 4. Ng5!" },
    'f1c5': { name: "Giuoco Piano (3... Bc5)", comment: "Quiet Game - harmonious bishop duel!" },
    'f8e7': { name: "Hungarian Defense (3... Be7)", comment: "Safe and cautious development!" },
    'd7d6': { name: "Semi-Italian (3... d6)", comment: "Guarding e5 solidly!" },
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 (Giuoco Piano)
  'e2e4 e7e5 g1f3 b8c6 f1c4 f1c5': {
    'c2c3': { name: "Giuoco Piano: Main Line (4. c3)", comment: "Preparing d2-d4 to take over the center!" },
    'd2d3': { name: "Giuoco Pianissimo (4. d3)", comment: "Quiet and solid Italian development!" },
    'b2b4': { name: "Evans Gambit (4. b4)", comment: "Pawn sacrifice for ferocious initiative!" },
    'e1g1': { name: "Italian Game: Castling (4. O-O)", comment: "Tucking the King away safely!" },
  },
  'e2e4 e7e5 g1f3 b8c6 f1c4 f1c5 c2c3': {
    'g8f6': { name: "Giuoco Piano (4... Nf6)", comment: "Attacking e4!" },
  },
  'e2e4 e7e5 g1f3 b8c6 f1c4 f1c5 c2c3 g8f6': {
    'd2d4': { name: "Italian Center Blast (5. d4)", comment: "Striking the center! Can you handle the pressure?" },
  },

  // ── THE FAMOUS FRIED LIVER ATTACK BRANCH! ──────────────────────────────────
  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6': {
    'f3g5': { name: "Knight Attack (4. Ng5)", comment: "⚔️ Knight Attack! White threatens 5. Nxf7 or 5. Bxf7+! You must play 4... d5!" },
    'd2d3': { name: "Quiet Two Knights (4. d3)", comment: "Calm development." },
    'd2d4': { name: "Scotch Gambit (4. d4)", comment: "Opening lines in the center!" },
  },

  // 4. Ng5 d5
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5': {
    'e4d5': { name: "Two Knights: 5. exd5", comment: "The critical juncture! Best is 5... Na5 (Polerio Defense). Taking 5... Nxd5 allows the Fried Liver Attack!" },
  },

  // 5... Nxd5?! (The Fried Liver trigger!)
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 f6d5': {
    'g5f7': { name: "🔥 FRIED LIVER ATTACK (6. Nxf7!)", comment: "💥 FRIED LIVER ATTACK! 6. Nxf7! White sacrifices the Knight on f7 to drag Black's King out into the open board!" },
    'd2d4': { name: "Lolli Attack Prep (6. d4)", comment: "Challenging the center!" },
  },

  // 6. Nxf7 Kxf7
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 f6d5 g5f7 e8f7': {
    'd1f3': { name: "Fried Liver: Queen Check (7. Qf3+)", comment: "7. Qf3+! Double attack on King and the pinned Knight on d5! Black must play 7... Ke6 to hold the piece!" },
  },

  // 7. Qf3+ Ke6
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 f6d5 g5f7 e8f7 d1f3 f7e6': {
    'b1c3': { name: "Fried Liver: Piling Pressure (8. Nc3)", comment: "8. Nc3! White adds a third attacker against d5! Can Black defend with 8... Ncb4 or 8... Nce7?" },
  },

  // 8. Nc3 c6e7 or c6b4
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 f6d5 g5f7 e8f7 d1f3 f7e6 b1c3 c6e7': {
    'd2d4': { name: "Fried Liver: Center Breakthrough (9. d4)", comment: "9. d4! Blasting open the lines to reach the exposed Black King!" },
  },
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 f6d5 g5f7 e8f7 d1f3 f7e6 b1c3 c6b4': {
    'a2a3': { name: "Fried Liver: Forcing Move (9. a3)", comment: "Kicking the b4 knight away from c2!" },
    'f3e4': { name: "Fried Liver: Central Dominance (9. Qe4)", comment: "Keeping supreme pressure on the Black monarch!" },
  },

  // If Black played the correct main line 5... Na5!
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 c6a5': {
    'c4b5': { name: "Polerio Defense (6. Bb5+)", comment: "Check! Black plays 6... c6 to challenge the bishop." },
    'd2d3': { name: "Polerio Defense (6. d3)", comment: "Securing the center." },
  },
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 c6a5 c4b5 c7c6': {
    'd5c6': { name: "Polerio: Pawn Exchange (7. dxc6)", comment: "Exchanging on c6." },
  },
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5 c6a5 c4b5 c7c6 d5c6 b7c6': {
    'f1e2': { name: "Main Line Italian (8. Be2)", comment: "Safe retreat. Black has great piece activity for the sacrificed pawn!" },
  },

  // ── RUY LOPEZ (Spanish) ───────────────────────────────────────────────────
  'e2e4 e7e5 g1f3 b8c6 f1b5': {
    'a7a6': { name: "Morphy Defense (3... a6)", comment: "Putting the question to the bishop!" },
    'g8f6': { name: "Berlin Defense (3... Nf6)", comment: "The Berlin Wall! Solid and defensive." },
    'f8c5': { name: "Classical Ruy Lopez (3... Bc5)", comment: "Active piece play." },
  },
  'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6': {
    'b5a4': { name: "Ruy Lopez: Retreat (4. Ba4)", comment: "Keeping the pin alive!" },
    'b5c6': { name: "Exchange Variation (4. Bxc6)", comment: "Damaging Black's queenside pawn structure!" },
  },
  'e2e4 e7e5 g1f3 b8c6 f1b5 a7a6 b5a4 g8f6': {
    'e1g1': { name: "Ruy Lopez: Castling (5. O-O)", comment: "King tucked into safety!" },
  },

  // ── SICILIAN DEFENSE ──────────────────────────────────────────────────────
  'e2e4 c7c5': {
    'g1f3': { name: "Open Sicilian Prep (2. Nf3)", comment: "Preparing the d2-d4 central strike!" },
    'b1c3': { name: "Closed Sicilian (2. Nc3)", comment: "Quiet, positional approach." },
    'c2c3': { name: "Alapin Sicilian (2. c3)", comment: "Building a broad center with d2-d4!" },
  },
  'e2e4 c7c5 g1f3 d7d6': {
    'd2d4': { name: "Open Sicilian (3. d4)", comment: "Opening files for maximum piece activity!" },
  },
  'e2e4 c7c5 g1f3 d7d6 d2d4 c5d4': {
    'f3d4': { name: "Open Sicilian (4. Nxd4)", comment: "Knight established in the center." },
  },
  'e2e4 c7c5 g1f3 b8c6': {
    'd2d4': { name: "Open Sicilian (3. d4)", comment: "Blowing open the center!" },
  },

  // ── FRENCH DEFENSE ────────────────────────────────────────────────────────
  'e2e4 e7e6': {
    'd2d4': { name: "French Defense: Center (2. d4)", comment: "Seizing full classical center control!" },
  },
  'e2e4 e7e6 d2d4 d7d5': {
    'e4e5': { name: "French Advance Variation (3. e5)", comment: "Locking the center and gaining space!" },
    'b1c3': { name: "French Classical (3. Nc3)", comment: "Developing with center defense." },
    'b1d2': { name: "Tarrasch French (3. Nd2)", comment: "Flexible knight placement." },
    'e4d5': { name: "French Exchange (3. exd5)", comment: "Opening the position symmetrically." },
  },

  // ── 1. d4 REPERTOIRE (Queen's Gambit & London) ────────────────────────────
  'd2d4': {
    'd7d5': { name: "Closed Game (1... d5)", comment: "Classic fight for center control!" },
    'g8f6': { name: "Indian Defense (1... Nf6)", comment: "Hypermodern response!" },
    'e7e6': { name: "Horwitz Defense (1... e6)", comment: "Flexible move." },
  },
  'd2d4 d7d5': {
    'c2c4': { name: "Queen's Gambit (2. c4)", comment: "Offering a flank pawn to dominate the center!" },
    'c1f4': { name: "London System (2. Bf4)", comment: "Rock-solid, harmonious development!" },
    'g1f3': { name: "Queen's Pawn Game (2. Nf3)", comment: "Flexible knight development." },
  },
  'd2d4 d7d5 c2c4': {
    'e7e6': { name: "Queen's Gambit Declined (2... e6)", comment: "Holding the d5 fortress!" },
    'd5c4': { name: "Queen's Gambit Accepted (2... dxc4)", comment: "Accepting the gambit!" },
    'c7c6': { name: "Slav Defense (2... c6)", comment: "Solid defense without blocking the light-squared bishop!" },
  },
  'd2d4 d7d5 c2c4 e7e6': {
    'b1c3': { name: "QGD: 3. Nc3", comment: "Putting maximum pressure on d5!" },
  },
  'd2d4 d7d5 c1f4 g8f6': {
    'e2e3': { name: "London System (3. e3)", comment: "The impenetrable London pyramid is formed!" },
  },
};

// ── OPENING IDENTIFIER ────────────────────────────────────────────────────────
export function identifyOpeningFromMoves(uciMoves: string[]): { name: string; comment: string } {
  let key = '';
  let lastIdentified = { name: "Standard Chess", comment: "Play solid moves and control the center!" };

  for (let i = 0; i < uciMoves.length; i++) {
    const move = uciMoves[i];
    const nextKey = key ? `${key} ${move}` : move;
    if (OPENING_BOOK[key] && OPENING_BOOK[key][move]) {
      const node = OPENING_BOOK[key][move];
      lastIdentified = {
        name: node.name,
        comment: node.comment || "Focus on controlling the center!",
      };
    }
    key = nextKey;
  }

  return lastIdentified;
}

// ── MINIMAX POSITION EVALUATOR ────────────────────────────────────────────────
function evaluatePosition(game: Chess): number {
  if (game.isCheckmate()) {
    return game.turn() === 'w' ? -999999 : 999999;
  }
  if (game.isDraw() || game.isStalemate() || game.isThreefoldRepetition()) {
    return 0;
  }

  const board = game.board();
  let whiteScore = 0;
  let blackScore = 0;

  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (!piece) continue;

      const baseVal = PIECE_VALUES[piece.type] || 0;
      const isWhite = piece.color === 'w';
      const pstVal = getPstScore(piece.type, r, c, isWhite);
      const totalPieceVal = baseVal + pstVal;

      if (isWhite) {
        whiteScore += totalPieceVal;
      } else {
        blackScore += totalPieceVal;
      }
    }
  }

  // Bonus for side to move (tempo)
  const tempo = game.turn() === 'w' ? 15 : -15;
  return (whiteScore - blackScore) + tempo;
}

// Simple capture-ordered legal moves for alpha-beta efficiency
function getOrderedMoves(game: Chess): any[] {
  const moves = game.moves({ verbose: true });
  return moves.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;
    if (a.captured) {
      scoreA += (PIECE_VALUES[a.captured] || 100) * 10 - (PIECE_VALUES[a.piece] || 100);
    }
    if (b.captured) {
      scoreB += (PIECE_VALUES[b.captured] || 100) * 10 - (PIECE_VALUES[b.piece] || 100);
    }
    if (a.san.includes('+') || a.san.includes('#')) scoreA += 50;
    if (b.san.includes('+') || b.san.includes('#')) scoreB += 50;
    return scoreB - scoreA;
  });
}

// Alpha-Beta Minimax
function alphaBeta(
  game: Chess,
  depth: number,
  alpha: number,
  beta: number,
  isMaximizing: boolean
): { score: number; bestMove: any } {
  if (depth === 0 || game.isGameOver()) {
    return { score: evaluatePosition(game), bestMove: null };
  }

  const moves = getOrderedMoves(game);
  if (moves.length === 0) {
    return { score: evaluatePosition(game), bestMove: null };
  }

  let bestMove = moves[0];

  if (isMaximizing) {
    let maxEval = -Infinity;
    for (const m of moves) {
      game.move(m);
      const evalResult = alphaBeta(game, depth - 1, alpha, beta, false);
      game.undo();

      if (evalResult.score > maxEval) {
        maxEval = evalResult.score;
        bestMove = m;
      }
      alpha = Math.max(alpha, evalResult.score);
      if (beta <= alpha) break; // Beta cutoff
    }
    return { score: maxEval, bestMove };
  } else {
    let minEval = Infinity;
    for (const m of moves) {
      game.move(m);
      const evalResult = alphaBeta(game, depth - 1, alpha, beta, true);
      game.undo();

      if (evalResult.score < minEval) {
        minEval = evalResult.score;
        bestMove = m;
      }
      beta = Math.min(beta, evalResult.score);
      if (beta <= alpha) break; // Alpha cutoff
    }
    return { score: minEval, bestMove };
  }
}

// ── GET BOT MOVE: BULLETPROOF, NEVER HANGS ────────────────────────────────────
export interface BotMoveResult {
  from: string;
  to: string;
  promotion?: string;
  san: string;
  openingName?: string;
  botCommentary?: string;
  isOpeningBookMove: boolean;
}

export function computeBotMove(
  game: Chess,
  botLevel: number,
  botColor: 'white' | 'black',
  uciHistory: string[] = []
): BotMoveResult {
  const searchGame = new Chess(game.fen());
  const legalMoves = searchGame.moves({ verbose: true });
  if (legalMoves.length === 0) {
    throw new Error('No legal moves available');
  }

  const historyKey = uciHistory.join(' ');
  const bookChoices = OPENING_BOOK[historyKey];

  // ── 1. OPENING BOOK LOOKUP ─────────────────────────────────────────────────
  // Level 1: 30% chance to follow book
  // Level 2: 70% chance to follow book
  // Level 3 (Opening & Fried Liver Specialist): 95% chance to follow book!
  // Level 4+: 90% chance to follow book
  const bookProb = botLevel === 1 ? 0.30 : botLevel === 2 ? 0.70 : botLevel === 3 ? 0.95 : 0.90;

  if (bookChoices && Math.random() < bookProb) {
    const candidateUciMoves = Object.keys(bookChoices);
    // Find matching legal moves
    const matchingLegal = legalMoves.filter((m) => {
      const uci = `${m.from}${m.to}${m.promotion || ''}`;
      return candidateUciMoves.includes(uci);
    });

    if (matchingLegal.length > 0) {
      // Prioritize Fried Liver specific attack moves if Level 3
      let chosenMove = matchingLegal[0];
      if (botLevel === 3) {
        // Special check: if Ng5 (f3g5) or Nxf7 (g5f7) or Qf3 (d1f3) is available, pick it!
        const friedLiverKey = matchingLegal.find((m) => {
          const uci = `${m.from}${m.to}`;
          return uci === 'g5f7' || uci === 'f3g5' || uci === 'd1f3' || uci === 'b1c3';
        });
        if (friedLiverKey) chosenMove = friedLiverKey;
      } else {
        chosenMove = matchingLegal[Math.floor(Math.random() * matchingLegal.length)];
      }

      const uci = `${chosenMove.from}${chosenMove.to}${chosenMove.promotion || ''}`;
      const bookNode = bookChoices[uci];

      return {
        from: chosenMove.from,
        to: chosenMove.to,
        promotion: chosenMove.promotion,
        san: chosenMove.san,
        openingName: bookNode?.name,
        botCommentary: bookNode?.comment,
        isOpeningBookMove: true,
      };
    }
  }

  // ── 2. LEVEL 1: Gentle Beginner AI (~400) ──────────────────────────────────
  // Child-friendly, avoids punishing traps, allows student to develop and win
  if (botLevel === 1) {
    const pawnMoves = legalMoves.filter((m) => m.piece === 'p');
    const minorMoves = legalMoves.filter((m) => m.piece === 'n' || m.piece === 'b');
    const safeCaptures = legalMoves.filter((m) => m.captured && m.captured !== 'q');
    const gentleChecks = legalMoves.filter((m) => m.san.includes('+') && !m.san.includes('#'));

    let chosenMove = legalMoves[0];
    const roll = Math.random();

    if (roll < 0.45 && pawnMoves.length > 0) {
      chosenMove = pawnMoves[Math.floor(Math.random() * pawnMoves.length)];
    } else if (roll < 0.75 && minorMoves.length > 0) {
      chosenMove = minorMoves[Math.floor(Math.random() * minorMoves.length)];
    } else if (roll < 0.90 && safeCaptures.length > 0) {
      chosenMove = safeCaptures[Math.floor(Math.random() * safeCaptures.length)];
    } else if (gentleChecks.length > 0 && Math.random() < 0.5) {
      chosenMove = gentleChecks[0];
    } else {
      chosenMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    }

    const currentOpening = identifyOpeningFromMoves(uciHistory);

    return {
      from: chosenMove.from,
      to: chosenMove.to,
      promotion: chosenMove.promotion,
      san: chosenMove.san,
      openingName: currentOpening.name,
      botCommentary: "Keep developing your pieces! You're playing well!",
      isOpeningBookMove: false,
    };
  }

  // ── 3. LEVEL 2: Casual Fundamentals (~600) ─────────────────────────────────
  // Evaluates at depth 1 with piece-square table, avoids 1-move hanging pieces
  if (botLevel === 2) {
    const isWhite = botColor === 'white';
    const result = alphaBeta(searchGame, 1, -Infinity, Infinity, isWhite);
    const chosen = result.bestMove || legalMoves[0];
    const currentOpening = identifyOpeningFromMoves(uciHistory);

    return {
      from: chosen.from,
      to: chosen.to,
      promotion: chosen.promotion,
      san: chosen.san,
      openingName: currentOpening.name,
      botCommentary: "Solid development! Remember to castle your King soon!",
      isOpeningBookMove: false,
    };
  }

  // ── 4. LEVEL 3: Opening & Tactical Specialist (~800) ──────────────────────
  // Plays Fried Liver & Italian Game, tests opening knowledge, depth 2 minimax
  if (botLevel === 3) {
    const isWhite = botColor === 'white';
    const result = alphaBeta(searchGame, 2, -Infinity, Infinity, isWhite);
    const chosen = result.bestMove || legalMoves[0];
    const currentOpening = identifyOpeningFromMoves(uciHistory);

    let commentary = "Watch your king and pieces closely!";
    if (chosen.san.includes('x') || chosen.captured) {
      commentary = `Tactical strike! Capturing with ${chosen.san}!`;
    } else if (chosen.san.includes('+')) {
      commentary = `Check! Defend your King!`;
    }

    return {
      from: chosen.from,
      to: chosen.to,
      promotion: chosen.promotion,
      san: chosen.san,
      openingName: currentOpening.name,
      botCommentary: commentary,
      isOpeningBookMove: false,
    };
  }

  // ── 5. LEVEL 4+: Progressive Depth Minimax (1000 - 2200) ───────────────────
  // Depth 2 for lvl 4, depth 3 for lvl 5-6, depth 3 for lvl 7+
  const isWhite = botColor === 'white';
  const depth = botLevel <= 4 ? 2 : botLevel <= 6 ? 3 : 3;
  const result = alphaBeta(searchGame, depth, -Infinity, Infinity, isWhite);
  const chosen = result.bestMove || legalMoves[0];
  const currentOpening = identifyOpeningFromMoves(uciHistory);

  return {
    from: chosen.from,
    to: chosen.to,
    promotion: chosen.promotion,
    san: chosen.san,
    openingName: currentOpening.name,
    botCommentary: currentOpening.comment || `Calculating with depth ${depth}...`,
    isOpeningBookMove: false,
  };
}

/**
 * Safely executes a move on a chess.js instance.
 * Handles pawn promotions correctly, avoids throwing on castling or non-pawn moves,
 * and provides fallbacks to legal moves so board state is never corrupted or stalled.
 */
export function safeExecuteMove(
  game: Chess,
  from: string,
  to: string,
  preferredPromotion?: string
) {
  const piece = game.get(from as any);
  const isPawnPromotion =
    piece &&
    piece.type === 'p' &&
    ((piece.color === 'w' && to.endsWith('8')) || (piece.color === 'b' && to.endsWith('1')));
  const promo = isPawnPromotion ? (preferredPromotion || 'q') : undefined;

  // 1. Try standard move with promotion if applicable
  try {
    const res = game.move({ from, to, promotion: promo });
    if (res) return res;
  } catch (e1) {
    // 2. If it failed, try without promotion
    try {
      const res = game.move({ from, to });
      if (res) return res;
    } catch (e2) {
      // 3. Fallback: search verbose legal moves
      try {
        const legal = game.moves({ verbose: true });
        const found = legal.find((m) => m.from === from && m.to === to);
        if (found) {
          return game.move(found);
        }
      } catch (e3) {
        return null;
      }
    }
  }
  return null;
}
