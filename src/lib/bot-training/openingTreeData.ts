export interface OpeningNode {
  id: string;
  moveNotation: string; // e.g., '1. e4' or '4. Ng5'
  san: string;
  fen: string;
  turn: 'w' | 'b';
  title: string;
  explanation: string;
  evaluationTag?: 'best' | 'blunder' | 'trick' | 'gambit' | 'book';
  coachTip: string;
  parentBranchId?: string;
  branches: {
    moveSan: string;
    targetNodeId: string;
    label: string;
    isBest?: boolean;
    isBlunder?: boolean;
    tag?: string;
  }[];
}

export interface OpeningAdventure {
  id: string;
  title: string;
  eco: string;
  heroColor: 'white' | 'black';
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  description: string;
  badgeReward: string;
  xpReward: number;
  rootNodeId: string;
  nodes: Record<string, OpeningNode>;
}

export const FRIED_LIVER_ADVENTURE: OpeningAdventure = {
  id: 'italian-fried-liver',
  title: 'Italian Game & Fried Liver Attack',
  eco: 'C57',
  heroColor: 'black',
  difficulty: 'Intermediate',
  description: 'Master the Italian Game, survive the fierce 4. Ng5 Knight Attack, and punish the Fried Liver trap with 5... Na5!',
  badgeReward: 'Fried Liver Defier 🛡️',
  xpReward: 60,
  rootNodeId: 'node-start',
  nodes: {
    'node-start': {
      id: 'node-start',
      moveNotation: 'Start',
      san: '',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: 'w',
      title: 'The Starting Position',
      explanation: 'White opens the board by claiming central space.',
      coachTip: 'Control the central squares (e4, d4, e5, d5) right from move one!',
      branches: [
        { moveSan: 'e4', targetNodeId: 'node-e4', label: '1. e4 (King’s Pawn Opening)', isBest: true, tag: 'Main' },
      ],
    },
    'node-e4': {
      id: 'node-e4',
      moveNotation: '1. e4',
      san: 'e4',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      turn: 'b',
      title: 'King’s Pawn Advance',
      explanation: 'White claims e4 and frees the Queen and light-squared Bishop.',
      coachTip: 'Stake your claim in the center with 1... e5 or launch asymmetric counterplay with 1... c5.',
      branches: [
        { moveSan: 'e5', targetNodeId: 'node-e5', label: '1... e5 (Open Game response)', isBest: true, tag: 'Classical' },
      ],
    },
    'node-e5': {
      id: 'node-e5',
      moveNotation: '1... e5',
      san: 'e5',
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      turn: 'w',
      title: 'Equal Central Stakes',
      explanation: 'Black meets White head-on in the center.',
      coachTip: 'White develops the knight to attack e5 while preparing kingside castling.',
      branches: [
        { moveSan: 'Nf3', targetNodeId: 'node-nf3', label: '2. Nf3 (Attacks e5)', isBest: true, tag: 'Main' },
      ],
    },
    'node-nf3': {
      id: 'node-nf3',
      moveNotation: '2. Nf3',
      san: 'Nf3',
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
      turn: 'b',
      title: 'Knight Attack on e5',
      explanation: 'White’s Knight develops with tempo, demanding an answer for the e5 pawn.',
      coachTip: 'Guard e5 by developing your queenside Knight with 2... Nc6.',
      branches: [
        { moveSan: 'Nc6', targetNodeId: 'node-nc6', label: '2... Nc6 (Defends e5)', isBest: true, tag: 'Solid' },
      ],
    },
    'node-nc6': {
      id: 'node-nc6',
      moveNotation: '2... Nc6',
      san: 'Nc6',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
      turn: 'w',
      title: 'Italian Bishop Entry',
      explanation: 'White activates the bishop to c4, aiming at Black’s sensitive f7 pawn.',
      coachTip: 'The f7 square is defended only by the Black King. Watch out for rapid attacks against it!',
      branches: [
        { moveSan: 'Bc4', targetNodeId: 'node-bc4', label: '3. Bc4 (The Italian Game)', isBest: true, tag: 'Italian' },
      ],
    },
    'node-bc4': {
      id: 'node-bc4',
      moveNotation: '3. Bc4',
      san: 'Bc4',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
      turn: 'b',
      title: 'Two Knights Defense Decision',
      explanation: 'Black can choose between the solid 3... Bc5 (Giuoco Piano) or dynamic 3... Nf6 (Two Knights Defense).',
      coachTip: '3... Nf6 counter-attacks e4 immediately, inviting the sharp 4. Ng5 attack!',
      branches: [
        { moveSan: 'Nf6', targetNodeId: 'node-nf6', label: '3... Nf6 (Two Knights Defense)', isBest: true, tag: 'Two Knights' },
        { moveSan: 'Bc5', targetNodeId: 'node-bc5', label: '3... Bc5 (Giuoco Piano)', isBest: true, tag: 'Quiet Game' },
      ],
    },
    'node-bc5': {
      id: 'node-bc5',
      moveNotation: '3... Bc5',
      san: 'Bc5',
      fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      turn: 'w',
      title: 'Giuoco Piano (The Quiet Game)',
      explanation: 'Black develops cleanly and prepares to castle. Both sides enter classical positional maneuvering.',
      coachTip: 'White commonly answers with 4. c3 aiming to push d4, or 4. d3 entering the Giuoco Pianissimo.',
      branches: [],
    },
    'node-nf6': {
      id: 'node-nf6',
      moveNotation: '3... Nf6',
      san: 'Nf6',
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
      turn: 'w',
      title: '4. Ng5 — The Knight Attack!',
      explanation: 'White aggressively double-attacks f7 with the Bishop on c4 and Knight on g5!',
      coachTip: 'This is the signature launchpad for the Fried Liver and Polerio variations. Black MUST react accurately.',
      branches: [
        { moveSan: 'Ng5', targetNodeId: 'node-ng5', label: '4. Ng5 (Double attack on f7)', isBest: true, tag: 'Aggressive' },
      ],
    },
    'node-ng5': {
      id: 'node-ng5',
      moveNotation: '4. Ng5',
      san: 'Ng5',
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R b KQkq - 5 4',
      turn: 'b',
      title: 'Defend f7: What is Black’s best move?',
      explanation: 'f7 is attacked twice! Passive defense like 4... h6 loses on the spot to 5. Nxf7 winning the Queen/Rook.',
      coachTip: 'The only true antidote is 4... d5!, slamming the door shut on White’s bishop!',
      branches: [
        { moveSan: 'd5', targetNodeId: 'node-d5', label: '4... d5! (Shut down the bishop line)', isBest: true, tag: 'Only Move' },
        { moveSan: 'h6', targetNodeId: 'node-h6-blunder', label: '4... h6? (Blunder allows 5. Nxf7)', isBlunder: true, tag: 'Fatal Trap' },
      ],
    },
    'node-h6-blunder': {
      id: 'node-h6-blunder',
      moveNotation: '4... h6?',
      san: 'h6',
      fen: 'r1bqkb1r/pppp1pp1/2n2n1p/4p1N1/2B1P3/8/PPPP1PPP/RNBQK2R w KQkq - 0 5',
      turn: 'w',
      title: 'Fatal Mistake! 5. Nxf7',
      explanation: 'White unleashes 5. Nxf7!, forking your Queen and Rook while remaining guarded by the c4 bishop.',
      evaluationTag: 'blunder',
      coachTip: 'Never push edge pawns when an emergency threat exists on the critical diagonal!',
      branches: [],
    },
    'node-d5': {
      id: 'node-d5',
      moveNotation: '4... d5!',
      san: 'd5',
      fen: 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5',
      turn: 'w',
      title: '5. exd5 — The Critical Fork in the Road',
      explanation: 'White captures 5. exd5. Black now faces the most important opening choice in junior chess!',
      coachTip: 'Do NOT recapture with 5... Nxd5! Recapturing walks directly into the Fried Liver Attack.',
      branches: [
        { moveSan: 'exd5', targetNodeId: 'node-exd5', label: '5. exd5 (Pawn captures)', isBest: true },
      ],
    },
    'node-exd5': {
      id: 'node-exd5',
      moveNotation: '5. exd5',
      san: 'exd5',
      fen: 'r1bqkb1r/ppp2ppp/2n2n2/3Pp1N1/2B5/8/PPPP1PPP/RNBQK2R b KQkq - 0 5',
      turn: 'b',
      title: 'The Great Decision: How do you recapture or counter?',
      explanation: 'Choose your Black continuation carefully.',
      coachTip: 'Remember: 5... Na5! counters White’s bishop. 5... Nxd5? is the dreaded Fried Liver trap!',
      branches: [
        { moveSan: 'Na5', targetNodeId: 'node-na5-polerio', label: '5... Na5! (Polerio Defense — Recommended)', isBest: true, tag: 'Master Choice' },
        { moveSan: 'Nxd5', targetNodeId: 'node-nxd5-fried-liver', label: '5... Nxd5? (Walks into 6. Nxf7!)', isBlunder: true, tag: 'Fried Liver Trap' },
        { moveSan: 'Nd4', targetNodeId: 'node-nd4-fritz', label: '5... Nd4 (Fritz Variation — Sharp Counter)', isBest: false, tag: 'Tricky' },
      ],
    },
    'node-nxd5-fried-liver': {
      id: 'node-nxd5-fried-liver',
      moveNotation: '5... Nxd5?',
      san: 'Nxd5',
      fen: 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6',
      turn: 'w',
      title: '6. Nxf7!! The Fried Liver Attack Ignites',
      explanation: 'White sacrifices the Knight with 6. Nxf7! Kxf7 7. Qf3+ Ke6 8. Nc3! Black’s King is dragged into the center under merciless fire.',
      evaluationTag: 'blunder',
      coachTip: 'The Black King is trapped on e6 guarding the pinned d5 knight. This is why Grandmasters avoid 5... Nxd5 at all costs!',
      branches: [],
    },
    'node-na5-polerio': {
      id: 'node-na5-polerio',
      moveNotation: '5... Na5!',
      san: 'Na5',
      fen: 'r1bqkb1r/ppp2ppp/8/n2Pp1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 1 6',
      turn: 'w',
      title: '🎉 Polerio Defense: The Bishop is Trapped!',
      explanation: '5... Na5! immediately counter-attacks the bishop on c4. White is forced to check with 6. Bb5+ c6 7. dxc6 bxc6, handing Black tremendous queenside development and active piece play!',
      evaluationTag: 'best',
      coachTip: 'Brilliant! Black gambits a single pawn for a massive lead in development, open lines, and an enduring kingside counter-attack!',
      branches: [],
    },
    'node-nd4-fritz': {
      id: 'node-nd4-fritz',
      moveNotation: '5... Nd4',
      san: 'Nd4',
      fen: 'r1bqkb1r/ppp2ppp/5n2/3Pp1N1/2Bn4/8/PPPP1PPP/RNBQK2R w KQkq - 1 6',
      turn: 'w',
      title: 'The Fritz Variation: Sharp Ambush',
      explanation: '5... Nd4 leaps forward to threaten the c2 pawn and unbalance White’s coordination.',
      evaluationTag: 'gambit',
      coachTip: 'A sharp, venomous option in rapid and blitz games!',
      branches: [],
    },
  },
};

export const ALL_OPENING_ADVENTURES: OpeningAdventure[] = [
  FRIED_LIVER_ADVENTURE,
];
