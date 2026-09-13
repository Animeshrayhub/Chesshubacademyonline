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

export const SCHOLARS_MATE_ADVENTURE: OpeningAdventure = {
  id: 'scholars-mate-defense',
  title: "Scholar's Mate Defense & Refutation",
  eco: 'C20',
  heroColor: 'black',
  difficulty: 'Beginner',
  description: "Learn how to easily dismantle White's premature Queen attack (2. Qh5 / 2. Bc4), punish greed, and establish a dominating positional lead!",
  badgeReward: 'Scholar Shield 🛡️',
  xpReward: 50,
  rootNodeId: 'sm-node-start',
  nodes: {
    'sm-node-start': {
      id: 'sm-node-start',
      moveNotation: 'Start',
      san: '',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: 'w',
      title: 'The Starting Position',
      explanation: 'White initiates with the King pawn.',
      coachTip: 'White is aiming for an aggressive tactical shortcut against your f7 square.',
      branches: [
        { moveSan: 'e4', targetNodeId: 'sm-node-e4', label: '1. e4', isBest: true },
      ],
    },
    'sm-node-e4': {
      id: 'sm-node-e4',
      moveNotation: '1. e4',
      san: 'e4',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      turn: 'b',
      title: 'Open Center Response',
      explanation: 'Black stakes claim in the center with 1... e5.',
      coachTip: 'Control central territory and open lines for your Bishop and Queen.',
      branches: [
        { moveSan: 'e5', targetNodeId: 'sm-node-e5', label: '1... e5', isBest: true },
      ],
    },
    'sm-node-e5': {
      id: 'sm-node-e5',
      moveNotation: '1... e5',
      san: 'e5',
      fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      turn: 'w',
      title: '2. Qh5! The Wayward Queen Attack',
      explanation: 'White brings out the Queen early, directly targeting the undefended e5 pawn and aiming at f7.',
      coachTip: 'Do not panic! Bringing the Queen out too early breaks opening principles. But you MUST defend e5 first!',
      branches: [
        { moveSan: 'Qh5', targetNodeId: 'sm-node-qh5', label: '2. Qh5 (Aggressive Queen)', isBest: true },
      ],
    },
    'sm-node-qh5': {
      id: 'sm-node-qh5',
      moveNotation: '2. Qh5',
      san: 'Qh5',
      fen: 'rnbqkbnr/pppp1ppp/8/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR b KQkq - 1 2',
      turn: 'b',
      title: 'How should Black defend e5?',
      explanation: 'The e5 pawn is under attack. If you play 2... g6? immediately, White captures 3. Qxe5+ forking your King and Rook!',
      coachTip: 'Defend e5 by developing a piece: 2... Nc6 is the golden move!',
      branches: [
        { moveSan: 'Nc6', targetNodeId: 'sm-node-nc6', label: '2... Nc6! (Defends e5 solidly)', isBest: true, tag: 'Best Move' },
        { moveSan: 'g6', targetNodeId: 'sm-node-g6-blunder', label: '2... g6? (Fatal blunder losing Rook)', isBlunder: true, tag: 'Trap Blunder' },
      ],
    },
    'sm-node-g6-blunder': {
      id: 'sm-node-g6-blunder',
      moveNotation: '2... g6?',
      san: 'g6',
      fen: 'rnbqkbnr/pppp1p1p/6p1/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 0 3',
      turn: 'w',
      title: 'Disaster! 3. Qxe5+ Fork',
      explanation: 'White plays 3. Qxe5+! Checking your King and winning your h8 Rook on the next move.',
      evaluationTag: 'blunder',
      coachTip: 'Always check if your pieces or pawns are loose before kicking an enemy piece!',
      branches: [],
    },
    'sm-node-nc6': {
      id: 'sm-node-nc6',
      moveNotation: '2... Nc6',
      san: 'Nc6',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/4P3/8/PPPP1PPP/RNB1KBNR w KQkq - 2 3',
      turn: 'w',
      title: '3. Bc4 — The Checkmate Threat on f7!',
      explanation: 'White activates the bishop to c4. Together, the Queen and Bishop threaten immediate checkmate with 4. Qxf7#.',
      coachTip: 'Now that e5 is safely guarded by your knight, you can safely kick the Queen with 3... g6!',
      branches: [
        { moveSan: 'Bc4', targetNodeId: 'sm-node-bc4', label: '3. Bc4 (Threatens Qxf7#)', isBest: true },
      ],
    },
    'sm-node-bc4': {
      id: 'sm-node-bc4',
      moveNotation: '3. Bc4',
      san: 'Bc4',
      fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
      turn: 'b',
      title: 'Defend against 4. Qxf7# Checkmate',
      explanation: 'Block the Queen’s line of sight to f7 without walking into any tactics.',
      coachTip: 'Push 3... g6! The e5 pawn is guarded, so White cannot play Qxe5+ anymore!',
      branches: [
        { moveSan: 'g6', targetNodeId: 'sm-node-g6', label: '3... g6! (Blocks the battery)', isBest: true, tag: 'Best Move' },
        { moveSan: 'Nf6', targetNodeId: 'sm-node-nf6-blunder', label: '3... Nf6? (Allows 4. Qxf7# checkmate)', isBlunder: true, tag: 'Fatal Mate' },
      ],
    },
    'sm-node-nf6-blunder': {
      id: 'sm-node-nf6-blunder',
      moveNotation: '3... Nf6?',
      san: 'Nf6',
      fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
      turn: 'w',
      title: 'Checkmate! 4. Qxf7#',
      explanation: 'White strikes on f7 and delivers Scholar’s Mate!',
      evaluationTag: 'blunder',
      coachTip: 'Always verify what your opponent is threatening before developing nonchalantly.',
      branches: [],
    },
    'sm-node-g6': {
      id: 'sm-node-g6',
      moveNotation: '3... g6',
      san: 'g6',
      fen: 'r1bqkbnr/pppp1p1p/2n3p1/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 4',
      turn: 'w',
      title: '4. Qf3 — White Tries One Last Trick',
      explanation: 'The Queen retreats to f3, renewing the checkmate threat on f7!',
      coachTip: 'Black has a natural developing move that blocks f7 forever: 4... Nf6!',
      branches: [
        { moveSan: 'Qf3', targetNodeId: 'sm-node-qf3', label: '4. Qf3 (Renews Qxf7# threat)', isBest: true },
      ],
    },
    'sm-node-qf3': {
      id: 'sm-node-qf3',
      moveNotation: '4. Qf3',
      san: 'Qf3',
      fen: 'r1bqkbnr/pppp1p1p/2n3p1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 1 4',
      turn: 'b',
      title: '🎉 Complete The Refutation!',
      explanation: 'Neutralize the f7 threat once and for all while developing your king’s knight.',
      coachTip: 'Play 4... Nf6! Black will follow up with ...Nd4 or ...Bg7, enjoying a massive lead in development!',
      branches: [
        { moveSan: 'Nf6', targetNodeId: 'sm-node-nf6-win', label: '4... Nf6! (Blocks mate & develops)', isBest: true, tag: 'Victory Refutation' },
      ],
    },
    'sm-node-nf6-win': {
      id: 'sm-node-nf6-win',
      moveNotation: '4... Nf6',
      san: 'Nf6',
      fen: 'r1bqkb1r/pppp1p1p/2n2np1/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 2 5',
      turn: 'w',
      title: '🏆 Mastered! Black is Completely Winning',
      explanation: '4... Nf6 slams the door shut! White wasted 3 moves maneuvering the Queen, while Black has 2 active knights, a solid pawn structure, and can leap ...Nd4 next.',
      evaluationTag: 'best',
      coachTip: 'Congratulations! You have turned an attempted beginner trick into a decisive developmental advantage!',
      branches: [],
    },
  },
};

export const SICILIAN_DEFENSE_ADVENTURE: OpeningAdventure = {
  id: 'sicilian-defense-intro',
  title: 'Sicilian Defense — The Najdorf Gateway',
  eco: 'B90',
  heroColor: 'black',
  difficulty: 'Advanced',
  description: 'Unleash the fiercest opening weapon in chess! Fight for central control with 1... c5, break White’s symmetry, and execute the famous 5... a6! Najdorf maneuver.',
  badgeReward: 'Sicilian Striker ⚔️',
  xpReward: 75,
  rootNodeId: 'sic-node-start',
  nodes: {
    'sic-node-start': {
      id: 'sic-node-start',
      moveNotation: 'Start',
      san: '',
      fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      turn: 'w',
      title: 'The Starting Position',
      explanation: 'White pushes 1. e4.',
      coachTip: 'Answer with the most combative, fighting defense: 1... c5!',
      branches: [
        { moveSan: 'e4', targetNodeId: 'sic-node-e4', label: '1. e4', isBest: true },
      ],
    },
    'sic-node-e4': {
      id: 'sic-node-e4',
      moveNotation: '1. e4',
      san: 'e4',
      fen: 'rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1',
      turn: 'b',
      title: '1... c5! The Sicilian Counter-Strike',
      explanation: 'Black immediately fights for the d4 square asymmetrically, intending to trade a wing c-pawn for White’s center d-pawn.',
      coachTip: 'Statistically the most winning response for Black against 1. e4 in world championship chess!',
      branches: [
        { moveSan: 'c5', targetNodeId: 'sic-node-c5', label: '1... c5 (The Sicilian Defense)', isBest: true, tag: 'Signature' },
      ],
    },
    'sic-node-c5': {
      id: 'sic-node-c5',
      moveNotation: '1... c5',
      san: 'c5',
      fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
      turn: 'w',
      title: '2. Nf3 — The Open Sicilian Approach',
      explanation: 'White prepares to blast open the center with 3. d4.',
      coachTip: 'Respond with 2... d6 to control e5 and prepare your kingside knight.',
      branches: [
        { moveSan: 'Nf3', targetNodeId: 'sic-node-nf3', label: '2. Nf3 (Prepares d4)', isBest: true },
      ],
    },
    'sic-node-nf3': {
      id: 'sic-node-nf3',
      moveNotation: '2. Nf3',
      san: 'Nf3',
      fen: 'rnbqkbnr/pp1ppppp/8/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R b KQkq - 1 2',
      turn: 'b',
      title: '2... d6 Classical Sicilian Core',
      explanation: '2... d6 keeps options open for the Najdorf and Dragon variations.',
      coachTip: 'It restricts White’s e4 pawn and frees the c8 bishop’s diagonal.',
      branches: [
        { moveSan: 'd6', targetNodeId: 'sic-node-d6', label: '2... d6 (Najdorf / Dragon setup)', isBest: true, tag: 'Classical' },
      ],
    },
    'sic-node-d6': {
      id: 'sic-node-d6',
      moveNotation: '2... d6',
      san: 'd6',
      fen: 'rnbqkbnr/pp2pppp/3p4/2p5/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
      turn: 'w',
      title: '3. d4 — The Center Opens!',
      explanation: 'White strikes in the center with 3. d4.',
      coachTip: 'Always exchange: 3... cxd4! trades your flank pawn for White’s vital center pawn.',
      branches: [
        { moveSan: 'd4', targetNodeId: 'sic-node-d4', label: '3. d4 (Open Center Break)', isBest: true },
      ],
    },
    'sic-node-d4': {
      id: 'sic-node-d4',
      moveNotation: '3. d4',
      san: 'd4',
      fen: 'rnbqkbnr/pp2pppp/3p4/2p5/3PP3/5N2/PPP2PPP/RNBQKB1R b KQkq - 0 3',
      turn: 'b',
      title: 'Trade in the Center',
      explanation: 'Capture with 3... cxd4 to open the semi-open c-file for your heavy pieces.',
      coachTip: 'White must recapture with the Knight, giving Black two central pawns (e & d) vs White’s one (e).',
      branches: [
        { moveSan: 'cxd4', targetNodeId: 'sic-node-cxd4', label: '3... cxd4 (Trade wing for center)', isBest: true },
      ],
    },
    'sic-node-cxd4': {
      id: 'sic-node-cxd4',
      moveNotation: '3... cxd4',
      san: 'cxd4',
      fen: 'rnbqkbnr/pp2pppp/3p4/8/3nP3/5N2/PPP2PPP/RNBQKB1R w KQkq - 0 4',
      turn: 'w',
      title: '4. Nxd4',
      explanation: 'White recaptures 4. Nxd4.',
      coachTip: 'Develop your Knight to f6, pressuring White’s undefended e4 pawn!',
      branches: [
        { moveSan: 'Nxd4', targetNodeId: 'sic-node-nxd4', label: '4. Nxd4', isBest: true },
      ],
    },
    'sic-node-nxd4': {
      id: 'sic-node-nxd4',
      moveNotation: '4. Nxd4',
      san: 'Nxd4',
      fen: 'rnbqkbnr/pp2pppp/3p4/8/3NP3/8/PPP2PPP/RNBQKB1R b KQkq - 0 4',
      turn: 'b',
      title: '4... Nf6 — Attack the e4 Pawn with Tempo!',
      explanation: '4... Nf6 develops a piece toward the center and forces White to respond to the threat on e4.',
      coachTip: 'White must play 5. Nc3 to defend e4.',
      branches: [
        { moveSan: 'Nf6', targetNodeId: 'sic-node-nf6', label: '4... Nf6 (Attacks e4)', isBest: true },
      ],
    },
    'sic-node-nf6': {
      id: 'sic-node-nf6',
      moveNotation: '4... Nf6',
      san: 'Nf6',
      fen: 'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/8/PPP2PPP/RNBQKB1R w KQkq - 1 5',
      turn: 'w',
      title: '5. Nc3 — White Defends',
      explanation: 'White defends e4 with the queen’s knight.',
      coachTip: 'Now comes the legendary move that defined the careers of Bobby Fischer and Garry Kasparov: 5... a6!',
      branches: [
        { moveSan: 'Nc3', targetNodeId: 'sic-node-nc3', label: '5. Nc3 (Guards e4)', isBest: true },
      ],
    },
    'sic-node-nc3': {
      id: 'sic-node-nc3',
      moveNotation: '5. Nc3',
      san: 'Nc3',
      fen: 'rnbqkb1r/pp2pppp/3p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R b KQkq - 2 5',
      turn: 'b',
      title: '🎉 5... a6! The Immortal Najdorf Variation!',
      explanation: 'Why 5... a6? It takes away the b5 square from White’s knights and bishop, prevents all annoying checks, and prepares Black’s own queenside expansion with ...b5 and ...Bb7!',
      coachTip: 'Play 5... a6! You now command the supreme tournament weapon of chess champions!',
      branches: [
        { moveSan: 'a6', targetNodeId: 'sic-node-a6-win', label: '5... a6! (The Najdorf Defense)', isBest: true, tag: 'Grandmaster Weapon' },
      ],
    },
    'sic-node-a6-win': {
      id: 'sic-node-a6-win',
      moveNotation: '5... a6',
      san: 'a6',
      fen: 'rnbqkb1r/1p2pppp/p2p1n2/8/3NP3/2N5/PPP2PPP/R1BQKB1R w KQkq - 0 6',
      turn: 'w',
      title: '🏆 Mastered! The Najdorf Fortress is Established',
      explanation: '5... a6! completes the legendary setup. Black enjoys rich strategic counterplay along the c-file, flexible center breaks (...e5 or ...e6), and unstoppable dynamic counter-chances!',
      evaluationTag: 'best',
      coachTip: 'Brilliant work! You now understand the profound strategic idea behind the world’s most feared opening defense!',
      branches: [],
    },
  },
};

export const ALL_OPENING_ADVENTURES: OpeningAdventure[] = [
  FRIED_LIVER_ADVENTURE,
  SCHOLARS_MATE_ADVENTURE,
  SICILIAN_DEFENSE_ADVENTURE,
];
