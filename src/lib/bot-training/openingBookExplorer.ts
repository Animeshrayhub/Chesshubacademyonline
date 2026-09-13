/**
 * Interactive Opening Book Explorer
 * Provides master theory continuations, win-rate statistics, game frequencies,
 * and pedagogical explanations for moves on the active board.
 */

export interface BookMoveContinuation {
  uci: string;
  san: string;
  name: string;
  comment: string;
  gamesCount: number;
  whiteWinPct: number;
  drawPct: number;
  blackWinPct: number;
  popularityRank: number;
}

export interface BookPositionSummary {
  eco: string;
  name: string;
  category: string;
  overview: string;
  isBook: boolean;
  depth: number;
  continuations: BookMoveContinuation[];
}

interface RawBookNode {
  eco: string;
  name: string;
  category: string;
  overview: string;
  continuations: {
    uci: string;
    san: string;
    name: string;
    comment: string;
    gamesCount: number;
    whiteWinPct: number;
    drawPct: number;
    blackWinPct: number;
  }[];
}

const MASTER_OPENING_TREE: Record<string, RawBookNode> = {
  // STARTING POSITION
  '': {
    eco: 'A00',
    name: 'Starting Position',
    category: 'Opening Fundamentals',
    overview: 'The initial board state. White has 20 legal first moves, with 1. e4 and 1. d4 reigning supreme.',
    continuations: [
      { uci: 'e2e4', san: 'e4', name: "King's Pawn Opening", comment: 'Controls the central squares (e4, d4) and immediately opens diagonal sightlines for Queen and Bishop.', gamesCount: 1450000, whiteWinPct: 38, drawPct: 33, blackWinPct: 29 },
      { uci: 'd2d4', san: 'd4', name: "Queen's Pawn Opening", comment: 'Stakes claim in the center with immediate queen protection. Favors rich positional strategical play.', gamesCount: 1120000, whiteWinPct: 38, drawPct: 35, blackWinPct: 27 },
      { uci: 'c2c4', san: 'c4', name: 'English Opening', comment: 'Flank strike fighting for control over d5 without committing central pawns early.', gamesCount: 280000, whiteWinPct: 37, drawPct: 37, blackWinPct: 26 },
      { uci: 'g1f3', san: 'Nf3', name: 'Zukertort / Réti Opening', comment: 'Flexible knight development controlling e5 and d4, keeping all pawn structures open.', gamesCount: 220000, whiteWinPct: 37, drawPct: 36, blackWinPct: 27 },
    ],
  },

  // 1. e4
  'e2e4': {
    eco: 'B00',
    name: "King's Pawn Opening",
    category: 'Open Games',
    overview: 'White opens lines for rapid piece deployment. Black chooses whether to mirror or counter-attack.',
    continuations: [
      { uci: 'e7e5', san: 'e5', name: 'Open Game', comment: 'Symmetrical response contesting White in the center and opening paths for Black pieces.', gamesCount: 520000, whiteWinPct: 39, drawPct: 32, blackWinPct: 29 },
      { uci: 'c7c5', san: 'c5', name: 'Sicilian Defense', comment: 'The most popular fighting defense. Asymmetrical fight for d4 with queenside counterplay.', gamesCount: 580000, whiteWinPct: 37, drawPct: 31, blackWinPct: 32 },
      { uci: 'e7e6', san: 'e6', name: 'French Defense', comment: 'Prepares 2... d5 with solid pawn support, accepting slightly cramped light-square bishop.', gamesCount: 195000, whiteWinPct: 40, drawPct: 31, blackWinPct: 29 },
      { uci: 'c7c6', san: 'c6', name: 'Caro-Kann Defense', comment: 'Prepares 2... d5 while keeping the light-squared bishop free outside the pawn chain.', gamesCount: 175000, whiteWinPct: 39, drawPct: 34, blackWinPct: 27 },
      { uci: 'd7d5', san: 'd5', name: 'Scandinavian Defense', comment: 'Direct challenge to the e4 pawn on move one.', gamesCount: 82000, whiteWinPct: 42, drawPct: 27, blackWinPct: 31 },
    ],
  },

  // 1. e4 e5
  'e2e4 e7e5': {
    eco: 'C20',
    name: 'Open Game',
    category: 'Open Games',
    overview: 'Classical battle for center control. White seeks to attack e5 or develop active minor pieces.',
    continuations: [
      { uci: 'g1f3', san: 'Nf3', name: "King's Knight", comment: 'Attacks e5 and develops the knight toward the center with kingside castling preparation.', gamesCount: 420000, whiteWinPct: 40, drawPct: 33, blackWinPct: 27 },
      { uci: 'f1c4', san: 'Bc4', name: "Bishop's Opening", comment: 'Eyes the tender f7 square immediately, leaving options for f2-f4 or Nf3.', gamesCount: 48000, whiteWinPct: 38, drawPct: 31, blackWinPct: 31 },
      { uci: 'b1c3', san: 'Nc3', name: 'Vienna Game', comment: 'Controls d5 while retaining flexibility for f2-f4 or Nf3.', gamesCount: 39000, whiteWinPct: 38, drawPct: 32, blackWinPct: 30 },
      { uci: 'f2f4', san: 'f4', name: "King's Gambit", comment: 'Romantic aggressive sacrifice of the f-pawn to dismantle Black’s center.', gamesCount: 26000, whiteWinPct: 39, drawPct: 22, blackWinPct: 39 },
    ],
  },

  // 1. e4 e5 2. Nf3
  'e2e4 e7e5 g1f3': {
    eco: 'C40',
    name: "King's Knight Opening",
    category: 'Open Games',
    overview: 'White threatens e5. Black must choose how to protect or counter-strike.',
    continuations: [
      { uci: 'b8c6', san: 'Nc6', name: 'Mainline Defense', comment: 'Defends the e5 pawn naturally while developing a piece to its most active square.', gamesCount: 340000, whiteWinPct: 39, drawPct: 34, blackWinPct: 27 },
      { uci: 'g8f6', san: 'Nf6', name: "Petrov's Defense", comment: 'Ignores the attack on e5 and counter-attacks White’s e4 pawn.', gamesCount: 52000, whiteWinPct: 35, drawPct: 43, blackWinPct: 22 },
      { uci: 'd7d6', san: 'd6', name: 'Philidor Defense', comment: 'Solid pawn protection of e5, though it slightly restricts Black’s dark-squared bishop.', gamesCount: 28000, whiteWinPct: 44, drawPct: 30, blackWinPct: 26 },
    ],
  },

  // 1. e4 e5 2. Nf3 Nc6
  'e2e4 e7e5 g1f3 b8c6': {
    eco: 'C44',
    name: 'Open Game: 2... Nc6',
    category: 'Open Games',
    overview: 'The classical cornerstone position. White selects between Italian, Spanish, or Scotch systems.',
    continuations: [
      { uci: 'f1c4', san: 'Bc4', name: 'Italian Game', comment: 'Develops bishop targeting f7 and prepares rapid castling.', gamesCount: 185000, whiteWinPct: 38, drawPct: 34, blackWinPct: 28 },
      { uci: 'f1b5', san: 'Bb5', name: 'Ruy Lopez (Spanish Opening)', comment: 'Pressures the knight defending e5. Considered the gold standard of classical chess.', gamesCount: 210000, whiteWinPct: 40, drawPct: 35, blackWinPct: 25 },
      { uci: 'd2d4', san: 'd4', name: 'Scotch Game', comment: 'Immediately tears open the center to accelerate development.', gamesCount: 55000, whiteWinPct: 38, drawPct: 34, blackWinPct: 28 },
      { uci: 'b1c3', san: 'Nc3', name: 'Four Knights Game', comment: 'Harmonious development of both knights for solid positional battle.', gamesCount: 38000, whiteWinPct: 36, drawPct: 42, blackWinPct: 22 },
    ],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4
  'e2e4 e7e5 g1f3 b8c6 f1c4': {
    eco: 'C50',
    name: 'Italian Game',
    category: 'Italian System',
    overview: 'White pressures the weak f7 square. Black typically responds with 3... Bc5 or 3... Nf6.',
    continuations: [
      { uci: 'f8c5', san: 'Bc5', name: 'Giuoco Piano', comment: 'Active classical bishop development matching White’s piece on c4.', gamesCount: 96000, whiteWinPct: 38, drawPct: 35, blackWinPct: 27 },
      { uci: 'g8f6', san: 'Nf6', name: 'Two Knights Defense', comment: 'Attacks e4 immediately, daring White to play 4. Ng5 (Fried Liver setup)!', gamesCount: 74000, whiteWinPct: 39, drawPct: 33, blackWinPct: 28 },
      { uci: 'f8e7', san: 'Be7', name: 'Hungarian Defense', comment: 'Quiet, compact defense avoiding early tactical complications.', gamesCount: 9200, whiteWinPct: 41, drawPct: 36, blackWinPct: 23 },
    ],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6': {
    eco: 'C55',
    name: 'Italian Game: Two Knights Defense',
    category: 'Italian System',
    overview: 'A hyper-tactical battleground where White decides between the sharp 4. Ng5 or solid 4. d3.',
    continuations: [
      { uci: 'f3g5', san: 'Ng5', name: 'Knight Attack (Fried Liver line)', comment: 'Doubles the pressure on f7 with Bishop and Knight! Very sharp!', gamesCount: 32000, whiteWinPct: 42, drawPct: 26, blackWinPct: 32 },
      { uci: 'd2d3', san: 'd3', name: 'Giuoco Pianissimo', comment: 'Calm, quiet build-up securing e4 and preparing c2-c3.', gamesCount: 36000, whiteWinPct: 37, drawPct: 38, blackWinPct: 25 },
      { uci: 'd2d4', san: 'd4', name: 'Center Attack', comment: 'Dynamic gambit line breaking open the center.', gamesCount: 16000, whiteWinPct: 40, drawPct: 28, blackWinPct: 32 },
    ],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5': {
    eco: 'C57',
    name: 'Italian: Two Knights Knight Attack',
    category: 'Italian System',
    overview: 'White threatens Nxf7. Black must play 4... d5! to block the c4 bishop.',
    continuations: [
      { uci: 'd7d5', san: 'd5', name: 'Mainline Interposition', comment: 'The only correct defense! Shuts down the c4 bishop diagonal.', gamesCount: 31000, whiteWinPct: 41, drawPct: 26, blackWinPct: 33 },
      { uci: 'f8c5', san: 'Bc5', name: 'Traxler Counterattack', comment: 'Savage tactical counter-strike sacrificing material for an attack on f2!', gamesCount: 4200, whiteWinPct: 45, drawPct: 15, blackWinPct: 40 },
    ],
  },

  // 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5
  'e2e4 e7e5 g1f3 b8c6 f1c4 g8f6 f3g5 d7d5 e4d5': {
    eco: 'C57',
    name: 'Two Knights: Pawn Cleared on d5',
    category: 'Italian System',
    overview: 'Crucial fork in the road: 5... Na5! is the GM refutation. 5... Nxd5? falls into the Fried Liver Attack (6. Nxf7!)',
    continuations: [
      { uci: 'c6a5', san: 'Na5', name: 'Polerio Defense', comment: 'The Grandmaster move! Attacks the bishop and wins the initiative for Black!', gamesCount: 22000, whiteWinPct: 35, drawPct: 31, blackWinPct: 34 },
      { uci: 'c6d5', san: 'Nxd5', name: 'Fried Liver Invitation', comment: 'Tragic blunder! Allows White to sacrifice 6. Nxf7! dragging the Black King into the open.', gamesCount: 6800, whiteWinPct: 62, drawPct: 18, blackWinPct: 20 },
      { uci: 'b7b5', san: 'b5', name: 'Ulvestad Variation', comment: 'Crazy counter-gambit attacking the bishop directly.', gamesCount: 2100, whiteWinPct: 43, drawPct: 22, blackWinPct: 35 },
    ],
  },

  // 1. e4 c5 (Sicilian)
  'e2e4 c7c5': {
    eco: 'B20',
    name: 'Sicilian Defense',
    category: 'Sicilian System',
    overview: 'Asymmetrical and uncompromising. Black trades a flank pawn for a central d-pawn.',
    continuations: [
      { uci: 'g1f3', san: 'Nf3', name: 'Open Sicilian Prep', comment: 'Prepares the central d2-d4 strike for open files.', gamesCount: 460000, whiteWinPct: 38, drawPct: 32, blackWinPct: 30 },
      { uci: 'b1c3', san: 'Nc3', name: 'Closed Sicilian', comment: 'Positional approach preparing kingside fianchetto with g3-Bg2.', gamesCount: 56000, whiteWinPct: 36, drawPct: 34, blackWinPct: 30 },
      { uci: 'c2c3', san: 'c3', name: 'Alapin Sicilian', comment: 'Supports an immediate d2-d4 pawn duo in the center.', gamesCount: 48000, whiteWinPct: 38, drawPct: 35, blackWinPct: 27 },
      { uci: 'd2d4', san: 'd4', name: 'Smith-Morra Gambit', comment: 'Sacrifices a pawn (cxd4 c3) for blazing development and open lines.', gamesCount: 19000, whiteWinPct: 40, drawPct: 24, blackWinPct: 36 },
    ],
  },

  // 1. e4 c5 2. Nf3
  'e2e4 c7c5 g1f3': {
    eco: 'B27',
    name: 'Sicilian Defense: Open Preparation',
    category: 'Sicilian System',
    overview: 'White gets ready to crack open the center with d2-d4.',
    continuations: [
      { uci: 'd7d6', san: 'd6', name: 'Najdorf / Dragon setup', comment: 'Controls e5 and prepares Nf6 before launching queenside pawns.', gamesCount: 250000, whiteWinPct: 38, drawPct: 32, blackWinPct: 30 },
      { uci: 'b8c6', san: 'Nc6', name: 'Classical Sicilian setup', comment: 'Controls d4 and challenges White’s piece dominance.', gamesCount: 140000, whiteWinPct: 37, drawPct: 33, blackWinPct: 30 },
      { uci: 'e7e6', san: 'e6', name: 'French-Sicilian / Kan setup', comment: 'Flexible pawn structure preparing d5 or a6.', gamesCount: 110000, whiteWinPct: 38, drawPct: 31, blackWinPct: 31 },
    ],
  },

  // 1. d4
  'd2d4': {
    eco: 'A40',
    name: "Queen's Pawn Opening",
    category: 'Closed Games',
    overview: 'White stakes center space safely protected by the queen. Less tactical fireworks, rich strategic maneuvering.',
    continuations: [
      { uci: 'd7d5', san: 'd5', name: 'Closed Game', comment: 'Symmetrical center fight mirroring White’s central presence.', gamesCount: 520000, whiteWinPct: 38, drawPct: 36, blackWinPct: 26 },
      { uci: 'g8f6', san: 'Nf6', name: 'Indian Defenses', comment: 'Flexible, hypermodern response keeping options for King’s Indian, Nimzo-Indian, or Grünfeld.', gamesCount: 440000, whiteWinPct: 38, drawPct: 36, blackWinPct: 26 },
      { uci: 'e7e6', san: 'e6', name: 'Horwitz Defense', comment: 'Flexible move that can transpose to French, QGD, or Dutch.', gamesCount: 65000, whiteWinPct: 39, drawPct: 34, blackWinPct: 27 },
      { uci: 'f7f5', san: 'f5', name: 'Dutch Defense', comment: 'Aggressive flank bid to control e4, creating asymmetric tactical dynamics.', gamesCount: 42000, whiteWinPct: 41, drawPct: 27, blackWinPct: 32 },
    ],
  },

  // 1. d4 d5
  'd2d4 d7d5': {
    eco: 'D00',
    name: "Queen's Pawn: 1... d5",
    category: 'Closed Games',
    overview: 'White can offer the Queen’s Gambit with 2. c4 or play solid systems like the London with 2. Bf4.',
    continuations: [
      { uci: 'c2c4', san: 'c4', name: "Queen's Gambit", comment: 'Offers a flank pawn to deflect Black’s center pawn and build a dominant center.', gamesCount: 390000, whiteWinPct: 39, drawPct: 36, blackWinPct: 25 },
      { uci: 'c1f4', san: 'Bf4', name: 'London System', comment: 'Solid setup forming a diamond pawn chain while developing the bishop outside.', gamesCount: 95000, whiteWinPct: 37, drawPct: 37, blackWinPct: 26 },
      { uci: 'g1f3', san: 'Nf3', name: "Queen's Pawn Game", comment: 'Flexible knight development controlling e5 and d4.', gamesCount: 62000, whiteWinPct: 37, drawPct: 38, blackWinPct: 25 },
    ],
  },

  // 1. d4 d5 2. c4
  'd2d4 d7d5 c2c4': {
    eco: 'D06',
    name: "Queen's Gambit",
    category: "Queen's Gambit",
    overview: 'White challenges d5. Black chooses whether to hold the center or accept the gambit pawn.',
    continuations: [
      { uci: 'e7e6', san: 'e6', name: "Queen's Gambit Declined (QGD)", comment: 'Rock solid! Anchors d5 with pawn protection.', gamesCount: 215000, whiteWinPct: 39, drawPct: 38, blackWinPct: 23 },
      { uci: 'c7c6', san: 'c6', name: 'Slav Defense', comment: 'Reinforces d5 without trapping the c8 bishop behind the e6 pawn.', gamesCount: 165000, whiteWinPct: 38, drawPct: 38, blackWinPct: 24 },
      { uci: 'd5c4', san: 'dxc4', name: "Queen's Gambit Accepted (QGA)", comment: 'Captures the c4 pawn, conceding the center temporarily for piece freedom.', gamesCount: 58000, whiteWinPct: 40, drawPct: 33, blackWinPct: 27 },
    ],
  },
};

/**
 * Lookup theory for the current moves history
 */
export function getOpeningBookContinuations(uciMoves: string[]): BookPositionSummary {
  const depth = uciMoves.length;
  const key = uciMoves.join(' ');

  // Direct match
  if (MASTER_OPENING_TREE[key]) {
    const raw = MASTER_OPENING_TREE[key];
    return {
      eco: raw.eco,
      name: raw.name,
      category: raw.category,
      overview: raw.overview,
      isBook: true,
      depth,
      continuations: raw.continuations.map((c, idx) => ({
        ...c,
        popularityRank: idx + 1,
      })),
    };
  }

  // Prefix fallback if deeper position
  for (let i = uciMoves.length - 1; i >= 0; i--) {
    const prefix = uciMoves.slice(0, i).join(' ');
    if (MASTER_OPENING_TREE[prefix]) {
      const raw = MASTER_OPENING_TREE[prefix];
      return {
        eco: raw.eco,
        name: `${raw.name} (Independent Continuation)`,
        category: raw.category,
        overview: 'Out of traditional theoretical book lines. Both sides enter independent calculation. Focus on King safety, piece harmony, and central pawn breaks!',
        isBook: false,
        depth,
        continuations: [],
      };
    }
  }

  return {
    eco: 'A00',
    name: 'Independent Middlegame Position',
    category: 'Middlegame',
    overview: 'No direct book matches found. Calculate forcing candidate moves: checks, captures, and threats!',
    isBook: false,
    depth,
    continuations: [],
  };
}
