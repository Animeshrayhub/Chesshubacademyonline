export interface CuratedPuzzle {
  weaknessType: string;
  title: string;
  fen: string;
  sideToMove: 'white' | 'black';
  solution: string; // First move or full SAN sequence e.g. "d4" or "d2d4"
  explanation: string;
  difficulty: number;
}

export const CURATED_WEAKNESS_PUZZLES: Record<string, CuratedPuzzle[]> = {
  hanging_pieces: [
    {
      weaknessType: 'hanging_pieces',
      title: 'Tactical Pin on Hanging Piece',
      fen: 'r1b1k2r/pppp1ppp/8/4n3/2B5/8/PPPP1PPP/RNB1R1K1 w kq - 0 9',
      sideToMove: 'white',
      solution: 'd4',
      explanation: 'The black knight on e5 is pinned to the king on e8! Advance d2-d4 to attack the pinned knight and win the piece.',
      difficulty: 800,
    },
    {
      weaknessType: 'hanging_pieces',
      title: 'Exploiting the Undefended Knight',
      fen: 'r1bqk2r/pppp1ppp/2n5/4p3/2B1n3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 5',
      sideToMove: 'white',
      solution: 'd4',
      explanation: 'Black left the e4 knight exposed. Playing d2-d4 opens a central counterattack to reclaim material.',
      difficulty: 900,
    },
    {
      weaknessType: 'hanging_pieces',
      title: 'Capitalizing on Loose Bishop',
      fen: 'r1b1k1r1/pppp1ppp/8/2b1n3/3P4/8/PPP2PPP/RNB1R1K1 w q - 0 10',
      sideToMove: 'white',
      solution: 'd4e5',
      explanation: 'Capture the undefended knight on e5 while keeping the attack active on the c5 bishop.',
      difficulty: 850,
    },
  ],

  pawn_structure: [
    {
      weaknessType: 'pawn_structure',
      title: 'Challenging Central Pawns',
      fen: 'rnbqk2r/ppp1bppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 2 5',
      sideToMove: 'white',
      solution: 'c4d5',
      explanation: 'Capture c4xd5 to break Black\'s central pawn structure and create isolated pawn targets.',
      difficulty: 850,
    },
    {
      weaknessType: 'pawn_structure',
      title: 'Pawn Break in the Center',
      fen: 'r1bqk2r/pp3ppp/2n1pn2/2pp4/3P4/2PBPN2/PP3PPP/RN1Q1RK1 w kq - 0 8',
      sideToMove: 'white',
      solution: 'd4c5',
      explanation: 'Take d4xc5 to undermine Black\'s c5 pawn structure and clear files for your major pieces.',
      difficulty: 900,
    },
    {
      weaknessType: 'pawn_structure',
      title: 'Pawn Chain Leverage',
      fen: 'rnbqkb1r/pppp1ppp/4pn2/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3',
      sideToMove: 'white',
      solution: 'e4',
      explanation: 'Push e2-e4 to seize total control of the central squares (e4 and d4) with a strong pawn duo.',
      difficulty: 800,
    },
  ],

  fork: [
    {
      weaknessType: 'fork',
      title: 'Pawn Fork Trick',
      fen: 'r1bqk2r/pppp1ppp/2n5/4P3/2B1n3/2P2N2/P1P2PPP/R1BQK2R b KQkq - 0 7',
      sideToMove: 'black',
      solution: 'd5',
      explanation: 'Push d7-d5 to fork White\'s c4 bishop and e4 knight, forcing a winning material trade!',
      difficulty: 950,
    },
    {
      weaknessType: 'fork',
      title: 'Royal Knight Fork',
      fen: 'r1bqk2r/pppp1ppp/5n2/4n3/2B1P3/2N5/PPPP1PPP/R1BQK2R w KQkq - 0 6',
      sideToMove: 'white',
      solution: 'c4f7',
      explanation: 'Tactical sacrifice to open the enemy king and fork key squares.',
      difficulty: 1000,
    },
  ],

  pin: [
    {
      weaknessType: 'pin',
      title: 'Pinning the Defending Knight',
      fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1b2P3/2NP1N2/PPP2PPP/R1BQKB1R w KQkq - 1 5',
      sideToMove: 'white',
      solution: 'c1g5',
      explanation: 'Develop the bishop to g5 to pin the f6 knight against Black\'s queen on d8.',
      difficulty: 850,
    },
  ],

  back_rank: [
    {
      weaknessType: 'back_rank',
      title: 'Classic Back-Rank Checkmate',
      fen: '3r2k1/5ppp/8/8/8/8/5PPP/3R2K1 w - - 0 1',
      sideToMove: 'white',
      solution: 'd1d8',
      explanation: 'Deliver checkmate on d8! Black\'s king is trapped on g8 behind its own pawn wall.',
      difficulty: 800,
    },
  ],

  deflection: [
    {
      weaknessType: 'deflection',
      title: 'Deflect the Guarding Rook',
      fen: '5rk1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
      sideToMove: 'white',
      solution: 'e1e8',
      explanation: 'Force the e8 trade to deflect Black\'s rook away from defending the back rank.',
      difficulty: 850,
    },
  ],

  discovered_attack: [
    {
      weaknessType: 'discovered_attack',
      title: 'Discovered Attack on the Knight',
      fen: 'r1bqk2r/pppp1ppp/2n5/1B2p3/4n3/5N2/PPPP1PPP/RNBQ1RK1 w kq - 0 6',
      sideToMove: 'white',
      solution: 'f3e5',
      explanation: 'Capture e5 with the knight, unmasking a discovered attack from the f1 rook and b5 bishop.',
      difficulty: 900,
    },
  ],

  endgame: [
    {
      weaknessType: 'endgame',
      title: 'King Opposition Breakthrough',
      fen: '8/8/4k3/3p4/3P4/4K3/8/8 w - - 0 1',
      sideToMove: 'white',
      solution: 'e3f4',
      explanation: 'Move Ke3-f4 to take opposition and force Black\'s king away from guarding the d5 pawn.',
      difficulty: 900,
    },
  ],
};

export function getCuratedPuzzlesForTheme(weaknessType: string): CuratedPuzzle[] {
  const cleanType = (weaknessType || '').toLowerCase().replace(/[\s-]/g, '_');
  if (CURATED_WEAKNESS_PUZZLES[cleanType]) {
    return CURATED_WEAKNESS_PUZZLES[cleanType];
  }
  // Generic fallback if theme key isn't matched directly
  return [
    {
      weaknessType: cleanType || 'general',
      title: `Tactical Practice: ${(weaknessType || 'Tactics').toUpperCase()}`,
      fen: 'r1b1k2r/pppp1ppp/8/4n3/2B5/8/PPPP1PPP/RNB1R1K1 w kq - 0 9',
      sideToMove: 'white',
      solution: 'd4',
      explanation: 'Exploit the tactic by finding the best move to win material or gain dynamic control.',
      difficulty: 850,
    },
    {
      weaknessType: cleanType || 'general',
      title: `Central Control & Strategy`,
      fen: 'rnbqk2r/ppp1bppp/4pn2/3p4/2PP4/2N2N2/PP2PPPP/R1BQKB1R w KQkq - 2 5',
      sideToMove: 'white',
      solution: 'c4d5',
      explanation: 'Execute the recommended pawn break to challenge your opponent\'s setup.',
      difficulty: 900,
    },
  ];
}
