export interface TacticalQuestion {
  id: string;
  title: string;
  theme: string;
  icon: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Tactical';
  fen: string;
  question: string;
  options: {
    text: string;
    isCorrect: boolean;
    explanation: string;
  }[];
  coachTip: string;
  xpReward: number;
}

export const TACTICAL_QUIZ_QUESTIONS: TacticalQuestion[] = [
  {
    id: 'quiz-1',
    title: "Scholar's Mate Defense",
    theme: 'Opening Traps',
    icon: '🛡️',
    difficulty: 'Beginner',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
    question: "White plays 1. e4 e5 2. Qh5 Nc6 3. Bc4 aiming directly at f7! What is Black's best, safest move to stop the checkmate threat?",
    options: [
      {
        text: '3... g6 (Blocks Queen & sets up Bg7 fianchetto)',
        isCorrect: true,
        explanation: 'Correct! 3... g6 attacks the white queen, shuts down the f7 mating lane, and prepares to develop your bishop to g7.',
      },
      {
        text: '3... Nf6 (Attacks Queen immediately)',
        isCorrect: false,
        explanation: 'Blunder! 3... Nf6 ignores the direct threat and allows White to play 4. Qxf7# checkmate on the spot!',
      },
      {
        text: '3... Qe7 (Guards f7 with Queen)',
        isCorrect: false,
        explanation: 'Passive. While it defends f7, it blocks your own dark-squared bishop and clutters your development.',
      },
      {
        text: '3... Bc5 (Develops Bishop)',
        isCorrect: false,
        explanation: 'Fatal mistake! White plays 4. Qxf7# and the game is over.',
      },
    ],
    coachTip: 'Golden Rule: When the enemy Queen comes out early, do not panic! Defend threats while developing with tempo.',
    xpReward: 25,
  },
  {
    id: 'quiz-2',
    title: 'The Fried Liver Trap',
    theme: 'Italian Game Defense',
    icon: '🔥',
    difficulty: 'Intermediate',
    fen: 'r1bqkb1r/ppp2ppp/2n5/3np1N1/2B5/8/PPPP1PPP/RNBQK2R w KQkq - 0 6',
    question: "After 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nf6 4. Ng5 d5 5. exd5, why is Black's recapture 5... Nxd5 considered a dangerous blunder?",
    options: [
      {
        text: 'White unleashes 6. Nxf7! sacrificing the Knight to drag the King into a deadly pin!',
        isCorrect: true,
        explanation: 'Spot on! 6. Nxf7 Kxf7 7. Qf3+ Ke6 8. Nc3 initiates the vicious Fried Liver Attack, leaving Black under relentless pressure.',
      },
      {
        text: 'Black immediately wins a free pawn without any danger.',
        isCorrect: false,
        explanation: 'Incorrect. Black is walking directly into White’s devastating tactical trap.',
      },
      {
        text: 'It allows White to promote a pawn immediately.',
        isCorrect: false,
        explanation: 'No pawns are close to promotion in the opening phase.',
      },
      {
        text: 'It locks in Black’s light-squared bishop permanently.',
        isCorrect: false,
        explanation: 'The real catastrophe is the immediate King attack on f7.',
      },
    ],
    coachTip: 'Pro Tip: Play 5... Na5! instead of 5... Nxd5. You attack the bishop on c4 and seize active counterplay on the queenside.',
    xpReward: 30,
  },
  {
    id: 'quiz-3',
    title: 'Absolute Pin vs Relative Pin',
    theme: 'Tactical Pins',
    icon: '📌',
    difficulty: 'Beginner',
    fen: 'r1bqk2r/pppp1ppp/2n5/4p3/1b2P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 2 5',
    question: "A Black Bishop on b4 is pinning White's Knight on c3 against the White King on e1. Can the Knight legally jump to d5?",
    options: [
      {
        text: 'No! Exposing the King to check is completely illegal under chess rules.',
        isCorrect: true,
        explanation: 'Exactly! In an Absolute Pin, the piece is pinned to the King, so the chess engine and tournament rules strictly forbid moving it.',
      },
      {
        text: 'Yes, any knight can jump whenever it chooses.',
        isCorrect: false,
        explanation: 'No piece may ever make a move that leaves its own King in check.',
      },
      {
        text: 'Yes, but only if White gives check on the same turn.',
        isCorrect: false,
        explanation: 'Check status does not override the absolute pin rule.',
      },
      {
        text: 'Only if White sacrifices their Queen first.',
        isCorrect: false,
        explanation: 'An absolute pin cannot be moved regardless of sacrifices.',
      },
    ],
    coachTip: 'Mnemonic: Pinned to King = ABSOLUTE (cannot move). Pinned to Queen/Rook = RELATIVE (moving it is legal, but usually bad!).',
    xpReward: 25,
  },
  {
    id: 'quiz-4',
    title: 'The Royal Knight Fork',
    theme: 'Double Attacks',
    icon: '🍴',
    difficulty: 'Beginner',
    fen: 'r3k2r/ppN1pppp/8/8/8/8/PPPP1PPP/R1BQK2R b KQkq - 0 8',
    question: "White's Knight lands on c7, checking the Black King on e8 while simultaneously attacking the Rook on a8. What is this tactical motif called?",
    options: [
      {
        text: 'A Royal Fork (Double Attack)',
        isCorrect: true,
        explanation: 'Correct! A fork occurs when one piece attacks two or more enemy targets at the same time. The King must move, leaving the Rook for the taking.',
      },
      {
        text: 'A Discovered Check',
        isCorrect: false,
        explanation: 'The check comes directly from the knight itself, not from an unmasked piece behind it.',
      },
      {
        text: 'A Windmill',
        isCorrect: false,
        explanation: 'A windmill is a repeating series of discovered checks, not a single fork.',
      },
      {
        text: 'An En Passant strike',
        isCorrect: false,
        explanation: 'En passant is a special pawn capture rule, unrelated to knight jumps.',
      },
    ],
    coachTip: 'Knights are the ultimate forkers! Look out for c7 and c2 squares when an opponent’s king and rook are on their starting squares.',
    xpReward: 25,
  },
  {
    id: 'quiz-5',
    title: 'Back-Rank Checkmate & "Luft"',
    theme: 'King Safety',
    icon: '🪟',
    difficulty: 'Beginner',
    fen: '6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1',
    question: "The Black King is trapped behind pawns on f7, g7, and h7. White's Rook lands on e8# for checkmate! How could Black have easily prevented this?",
    options: [
      {
        text: 'Push h6 or g6 earlier to create an escape square ("Luft") for the King.',
        isCorrect: true,
        explanation: 'Brilliant! Pushing h6 or g6 gives the castled King an emergency flight square so back-rank checks cannot deliver mate.',
      },
      {
        text: 'Never castle during the game.',
        isCorrect: false,
        explanation: 'Leaving your King in the center is far more dangerous and invites rapid collapse.',
      },
      {
        text: 'Keep the Queen glued to the 8th rank permanently.',
        isCorrect: false,
        explanation: 'Tying down your most powerful piece solely to guard the back rank limits all counterplay.',
      },
      {
        text: 'Move all three pawns forward to the 5th rank.',
        isCorrect: false,
        explanation: 'Over-advancing all pawns leaves the King completely naked and exposed to diagonal threats.',
      },
    ],
    coachTip: '"Luft" is the German word for air. Breathing room for your King wins games and prevents sudden heartbreaks!',
    xpReward: 25,
  },
  {
    id: 'quiz-6',
    title: 'The Greek Gift Sacrifice',
    theme: 'Attacking Sacrifices',
    icon: '🎁',
    difficulty: 'Tactical',
    fen: 'r1bq1rk1/ppp2ppp/2n1pn2/8/2BP4/3QPN2/PP1N1PPP/R3K2R w KQ - 0 9',
    question: "When White plays the classic Bxh7+ sacrifice against a castled King on g8, what is the key follow-up combination?",
    options: [
      {
        text: 'Follow with Ng5+ and Qh5 or Qd3 to deliver decisive mating blows.',
        isCorrect: true,
        explanation: 'Accurate! The bishop strips the King of its primary defender. Ng5+ forces the King back, and Qh5 seals the mating net.',
      },
      {
        text: 'Offer an immediate draw now that material is down.',
        isCorrect: false,
        explanation: 'You do not sacrifice a whole piece just to offer a draw!',
      },
      {
        text: 'Retreat the pieces back to the back rank.',
        isCorrect: false,
        explanation: 'After sacrificing material, hesitation is fatal. You must pursue the attack with energy!',
      },
      {
        text: 'Castle queenside and wait for the endgame.',
        isCorrect: false,
        explanation: 'If you delay, Black consolidates their extra piece and wins.',
      },
    ],
    coachTip: 'Check the prerequisites: ensure Black cannot play ...Nf6 to defend h7, and make sure your Queen can easily access the h-file.',
    xpReward: 35,
  },
  {
    id: 'quiz-7',
    title: 'Removing the Defender',
    theme: 'Tactics & Calculation',
    icon: '🎯',
    difficulty: 'Intermediate',
    fen: 'r1b2rk1/pp3ppp/2n1pn2/8/2B5/1N2PN2/PP3PPP/R4RK1 w - - 0 12',
    question: "An enemy piece is safe only because one specific defender guards it. What tactical pattern captures or drives away that defender?",
    options: [
      {
        text: 'Removing the Defender (Deflection / Elimination)',
        isCorrect: true,
        explanation: 'Correct! By eliminating, capturing, or deflecting the key defender, the previously protected piece collapses and falls for free.',
      },
      {
        text: 'The 50-move rule',
        isCorrect: false,
        explanation: 'The 50-move rule is a draw condition, not an attacking tactical motif.',
      },
      {
        text: 'Castling long',
        isCorrect: false,
        explanation: 'Castling is a King safety maneuver.',
      },
      {
        text: 'Threefold repetition',
        isCorrect: false,
        explanation: 'Repetition leads to a draw.',
      },
    ],
    coachTip: 'Whenever you see an opponent’s piece with only ONE defender, ask yourself: "Can I attack or capture that defender?"',
    xpReward: 30,
  },
  {
    id: 'quiz-8',
    title: 'Smothered Checkmate',
    theme: 'Checkmate Patterns',
    icon: '🐴',
    difficulty: 'Intermediate',
    fen: '6rk/5Npp/8/8/8/8/8/4K3 w - - 0 1',
    question: "Black's King on h8 is surrounded on all sides by friendly pieces (Kh8, Rg8, pawns g7 & h7). White lands Nf7#. Why can't the King escape?",
    options: [
      {
        text: 'The King is "smothered" by its own pieces and cannot step onto occupied squares!',
        isCorrect: true,
        explanation: 'Classic Smothered Mate! The knight delivers check, and because the King’s own army occupies every adjacent escape square, it is instant mate.',
      },
      {
        text: 'The King is allowed to jump over its own pieces.',
        isCorrect: false,
        explanation: 'Kings can never jump over pieces in chess.',
      },
      {
        text: 'The King must capture the attacking knight diagonally.',
        isCorrect: false,
        explanation: 'The knight is not adjacent, so the King cannot reach it.',
      },
      {
        text: 'The Black Rook is permitted to move backwards through pawns.',
        isCorrect: false,
        explanation: 'Rooks cannot jump over friendly pawns.',
      },
    ],
    coachTip: 'The Smothered Mate is one of the most famous patterns in chess history. Remember the Queen sacrifice setup: Qg8+! Rxg8 Nf7#.',
    xpReward: 30,
  },
  {
    id: 'quiz-9',
    title: 'The En Passant Rule',
    theme: 'Pawn Rules',
    icon: '♟️',
    difficulty: 'Beginner',
    fen: 'rnbqkbnr/ppp1pppp/8/3pP3/8/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 3',
    question: "White's pawn is on e5. Black pushes d7-d5 two squares forward. How does White execute the En Passant capture?",
    options: [
      {
        text: 'White moves diagonally to d6, removing the Black d5 pawn from the board immediately.',
        isCorrect: true,
        explanation: 'Correct! When a pawn moves 2 squares past an enemy pawn on the 5th rank, it can be captured as if it had only moved 1 square, on the immediate next turn.',
      },
      {
        text: 'White takes the pawn on d5 directly moving straight ahead.',
        isCorrect: false,
        explanation: 'Pawns capture diagonally, not straight forward.',
      },
      {
        text: 'White can wait 5 turns and then capture en passant.',
        isCorrect: false,
        explanation: 'En passant must be executed on the immediate reply, or the right is forfeited.',
      },
      {
        text: 'Only Queens are allowed to capture en passant.',
        isCorrect: false,
        explanation: 'En passant is exclusively a pawn-to-pawn interaction.',
      },
    ],
    coachTip: 'Remember: En passant is ONLY valid on the very first turn after the two-square pawn push!',
    xpReward: 25,
  },
  {
    id: 'quiz-10',
    title: 'The Windmill (See-Saw)',
    theme: 'Advanced Combinations',
    icon: '🔄',
    difficulty: 'Tactical',
    fen: '4r1k1/5ppp/8/8/2B5/8/5RPP/6K1 w - - 0 1',
    question: "A Rook and Bishop work in tandem: the Rook moves with check, retreats with a discovered check from the Bishop, and repeats. What is this called?",
    options: [
      {
        text: 'The Windmill (or See-Saw Attack)',
        isCorrect: true,
        explanation: 'Spot on! The alternating direct checks and discovered checks form a devastating "windmill" that can vacuum up the opponent’s entire army.',
      },
      {
        text: 'A Perpetual Draw',
        isCorrect: false,
        explanation: 'While repeating, the attacking side is actively gobbling up free pieces at every turn!',
      },
      {
        text: 'The Fool\'s Mate',
        isCorrect: false,
        explanation: 'Fool\'s Mate is the two-move checkmate in the opening.',
      },
      {
        text: 'A Blindfold Standoff',
        isCorrect: false,
        explanation: 'Not a recognized chess term.',
      },
    ],
    coachTip: 'Famous demonstration: Torre vs. Lasker (Moscow, 1925), where a windmill won a Queen and multiple pawns in consecutive moves!',
    xpReward: 35,
  },
];
