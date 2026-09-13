/**
 * Bot Opening Repertoire Scout Data
 * Provides detailed scouting intel for each of the 10 Bot Levels:
 * - Signature White Openings
 * - Defense against 1. e4 & 1. d4 as Black
 * - Tactical Playstyle & Strengths
 * - Exploitable Weaknesses & Coach Counter-Strategy Tips
 */

export interface BotScoutIntel {
  level: number;
  name: string;
  avatar: string;
  rating: number;
  playstyleTag: string;
  whiteRepertoire: {
    primary: string;
    secondary: string;
    frequency: string;
    plan: string;
  };
  blackRepertoire: {
    vsE4: string;
    vsD4: string;
    plan: string;
  };
  strengths: string[];
  weakness: string;
  coachAdvice: string;
  signatureTrap: string;
}

export const BOT_SCOUT_DATA: Record<number, BotScoutIntel> = {
  1: {
    level: 1,
    name: 'Level 1 — Pawn',
    avatar: '♟️',
    rating: 400,
    playstyleTag: 'Beginner & Exploratory',
    whiteRepertoire: {
      primary: "Gentle King's Pawn (1. e4 e5 2. Bc4)",
      secondary: "Queen's Pawn (1. d4)",
      frequency: '60% 1. e4 · 40% 1. d4',
      plan: 'Develops pieces casually without sharp central threats. Makes gentle moves to let students practice.',
    },
    blackRepertoire: {
      vsE4: 'Open Game (1... e5)',
      vsD4: "Closed Pawn (1... d5)",
      plan: 'Mirrors opponent moves and responds passively to central pressure.',
    },
    strengths: ['Predictable piece development', 'Avoids complex traps'],
    weakness: 'Leaves undefended pieces and neglects back-rank king safety.',
    coachAdvice: 'Claim the center with 1. e4 or 1. d4, develop all your knights and bishops, and watch for free undefended pieces!',
    signatureTrap: 'Hangs loose pawns on e5 or d5 early.',
  },

  2: {
    level: 2,
    name: 'Level 2 — Knight',
    avatar: '♞',
    rating: 600,
    playstyleTag: 'Classical Fundamentals',
    whiteRepertoire: {
      primary: 'Four Knights Game (1. e4 e5 2. Nf3 Nc6 3. Nc3)',
      secondary: "Bishop's Opening (2. Bc4)",
      frequency: '70% 1. e4 · 30% 1. d4',
      plan: 'Controls center squares with knights, develops both bishops, and castles kingside on move 5 or 6.',
    },
    blackRepertoire: {
      vsE4: 'Classical 1... e5 & Petrov Defense (2... Nf6)',
      vsD4: "Queen's Pawn Game (1... d5 2... Nf6)",
      plan: 'Fights for standard central equilibrium with minor pieces.',
    },
    strengths: ['Solid minor piece deployment', 'Castles King early'],
    weakness: 'Vulnerable to 2-move knight forks and pinned f3/c3 knights.',
    coachAdvice: 'Pin the f3 knight with Bg4! Once pinned, push pawns or bring your queen to increase pressure on the pinned piece.',
    signatureTrap: 'Relative pin on f3/f6 leads to structural weakness.',
  },

  3: {
    level: 3,
    name: 'Level 3 — Bishop',
    avatar: '♝',
    rating: 800,
    playstyleTag: 'Hyper-Aggressive & Tactical Traps',
    whiteRepertoire: {
      primary: 'Italian Game & Fried Liver Attack (4. Ng5!)',
      secondary: "Scholar's Mate Threats (2. Qh5 or 2. Bc4)",
      frequency: '85% 1. e4 · 15% 1. d4',
      plan: 'Targets f7 ruthlessly! Jumps knight to g5 on move 4 aiming for the 6. Nxf7 sacrifice to expose your King.',
    },
    blackRepertoire: {
      vsE4: 'Two Knights Defense (1... e5 2. Nf3 Nc6 3. Bc4 Nf6)',
      vsD4: "Queen's Gambit Declined (1... d5 2. c4 e6)",
      plan: 'Attacks e4 immediately, daring you into sharp tactical complications.',
    },
    strengths: ['Fierce f7 attacks', 'Aggressive piece sacrifices for initiative'],
    weakness: 'Overextends attacking pieces. If you survive the first 6 moves, you win the game with piece advantage!',
    coachAdvice: 'When White plays 4. Ng5 d5 5. exd5, DO NOT play 5... Nxd5? (Fried Liver trap!). Play 5... Na5! to attack the bishop and take control!',
    signatureTrap: 'The Fried Liver Attack: 6. Nxf7! Kxf7 7. Qf3+ Ke6.',
  },

  4: {
    level: 4,
    name: 'Level 4 — Rook',
    avatar: '♜',
    rating: 1000,
    playstyleTag: 'Positional Club Player',
    whiteRepertoire: {
      primary: 'Ruy Lopez Spanish (1. e4 e5 2. Nf3 Nc6 3. Bb5)',
      secondary: "Scotch Game (3. d4)",
      frequency: '65% 1. e4 · 35% 1. d4',
      plan: 'Pressures the c6 knight defending e5, prepares rapid d2-d4 central break, and controls the open e-file.',
    },
    blackRepertoire: {
      vsE4: 'Morphy Defense (3... a6) & Scandinavian (1... d5)',
      vsD4: 'Slav Defense (1... d5 2. c4 c6)',
      plan: 'Maintains solid pawn chains and activates rooks on open semi-files.',
    },
    strengths: ['Sound opening preparation', 'Good endgame fundamentals'],
    weakness: 'Passive piece placement when under king-side pressure.',
    coachAdvice: 'Against 3. Bb5, play 3... a6! forcing the bishop to decide. If 4. Ba4, play 4... Nf6 and castle quickly.',
    signatureTrap: 'Noah’s Ark Trap: trapping the light-squared Spanish bishop on b3 with ...a6, ...b5, ...c5, ...c4!',
  },

  5: {
    level: 5,
    name: 'Level 5 — Queen',
    avatar: '♛',
    rating: 1200,
    playstyleTag: 'Sharp Tactical Counter-Striker',
    whiteRepertoire: {
      primary: 'Open Sicilian (1. e4 c5 2. Nf3 d6 3. d4)',
      secondary: "Queen's Gambit (1. d4 d5 2. c4)",
      frequency: '50% 1. e4 · 50% 1. d4',
      plan: 'Opens lines quickly for Queen and Rooks, hunting for discovered attacks and tactical skewers.',
    },
    blackRepertoire: {
      vsE4: 'Sicilian Dragon (1... c5 ... g6) & French Defense',
      vsD4: "King's Indian Defense (1... Nf6 2. c4 g6)",
      plan: 'Launches asymmetric flank attacks against your King.',
    },
    strengths: ['Calculates 4 ply deep', 'Excels in open positions with tactics'],
    weakness: 'Weakens its own back rank during long queenside attacks.',
    coachAdvice: 'Keep the center solid! Avoid trading your center pawns unless you get clear piece activity in return.',
    signatureTrap: 'Yugoslav Attack Sicilian mating race.',
  },

  6: {
    level: 6,
    name: 'Level 6 — CM Bot',
    avatar: '🏅',
    rating: 1400,
    playstyleTag: 'Candidate Master Tournament Repertoire',
    whiteRepertoire: {
      primary: 'English Opening (1. c4) & Catalan System',
      secondary: 'London System (1. d4 d5 2. Bf4)',
      frequency: '45% 1. d4 · 35% 1. c4 · 20% 1. e4',
      plan: 'Fianchettos kingside bishop (g3-Bg2), puts relentless positional squeeze on the d5 and e4 squares.',
    },
    blackRepertoire: {
      vsE4: 'Caro-Kann Defense (1... c6 2. d4 d5)',
      vsD4: 'Nimzo-Indian Defense (1... Nf6 2. c4 e6 3. Nc3 Bb4)',
      plan: 'Maintains pristine pawn structures and neutralizes early attacks.',
    },
    strengths: ['Flawless opening principles', 'Few tactical blunders'],
    weakness: 'Slow to react to unexpected central pawn sacrifices.',
    coachAdvice: 'Strike with dynamic pawn breaks like ...c5 or ...e5 before White solidifies their positional grip!',
    signatureTrap: 'Catalan bishop laser beam cutting across the long diagonal.',
  },

  7: {
    level: 7,
    name: 'Level 7 — IM Bot',
    avatar: '🎖️',
    rating: 1600,
    playstyleTag: 'FIDE Master Precision',
    whiteRepertoire: {
      primary: 'Modern Ruy Lopez & Queen’s Gambit Declined',
      secondary: 'Vienna Gambit & King’s Indian Attack',
      frequency: '55% 1. e4 · 45% 1. d4',
      plan: 'Prophylactic play, prevents your counter-tactics before executing deep multi-piece maneuvers.',
    },
    blackRepertoire: {
      vsE4: 'Sicilian Najdorf (1... c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6)',
      vsD4: 'Grünfeld Defense (1... Nf6 2. c4 g6 3. Nc3 d5)',
      plan: 'Demolishes White’s center with pawn counter-strikes.',
    },
    strengths: ['Prophylaxis & piece harmony', 'Deadly endgame technique'],
    weakness: 'Can be pressed on the clock in complex closed pawn locks.',
    coachAdvice: 'Do not play passive waiting moves. Coordinate rooks on open files and fight for every tempo!',
    signatureTrap: 'Najdorf poison pawn variation traps.',
  },

  8: {
    level: 8,
    name: 'Level 8 — GM Bot',
    avatar: '🥇',
    rating: 1800,
    playstyleTag: 'Grandmaster Deep Theory',
    whiteRepertoire: {
      primary: 'Giuoco Pianissimo (Italian c3/d3) & Trompowsky Attack',
      secondary: 'Reti Opening (1. Nf3 d5 2. c4)',
      frequency: '50% 1. d4 · 50% 1. e4',
      plan: 'Slow positional maneuvering, squeezes small structural advantages into winning endgames.',
    },
    blackRepertoire: {
      vsE4: 'Sicilian Classical & Berlin Defense',
      vsD4: 'Semi-Slav Defense (Meran Variation)',
      plan: 'Impenetrable defense with granite pawn structures.',
    },
    strengths: ['Endgame mastery', 'Deep 12-move opening book memory'],
    weakness: 'Can get bogged down in double-edged gambit complications.',
    coachAdvice: 'Calculate forcing lines strictly: Checks, Captures, and Threats. Never leave a piece undefended for even one move!',
    signatureTrap: 'Berlin Wall endgame clamp.',
  },

  9: {
    level: 9,
    name: 'Level 9 — Super GM',
    avatar: '👑',
    rating: 2000,
    playstyleTag: 'World Championship Elite Repertoire',
    whiteRepertoire: {
      primary: 'World Elite 1. e4 & 1. d4 Repertoires',
      secondary: 'Modern Anti-Sicilian & Anti-Marshall Systems',
      frequency: '50% 1. e4 · 50% 1. d4',
      plan: 'Total board domination, combines computer precision with human strategic depth.',
    },
    blackRepertoire: {
      vsE4: 'Sicilian Najdorf & Classical French',
      vsD4: "King's Indian Mar del Plata & Grünfeld",
      plan: 'Razor-sharp piece counterplay against the White King.',
    },
    strengths: ['Nearly zero unforced errors', 'Grandmaster positional understanding'],
    weakness: 'Extremely rare; requires flawless opening preparation and tactical vision to draw or win.',
    coachAdvice: 'Play your most familiar opening! Do not experiment with unknown sidelines against this bot.',
    signatureTrap: 'Anti-Marshall 8. a4 pin and queenside infiltration.',
  },

  10: {
    level: 10,
    name: 'Level 10 — Stockfish Boss',
    avatar: '🤖',
    rating: 2200,
    playstyleTag: 'Silicon Grandmaster Overlord',
    whiteRepertoire: {
      primary: 'Universal Grandmaster Repertoire (Depth 18 Minimax)',
      secondary: 'All Classical & Hypermodern systems',
      frequency: 'Balanced across all master ECO codes',
      plan: 'Calculates every branch with mathematical precision. Punishes the slightest positional concession.',
    },
    blackRepertoire: {
      vsE4: 'Optimal engine defense lines',
      vsD4: 'Optimal engine defense lines',
      plan: 'Absolute dynamic defense and flawless counter-tactics.',
    },
    strengths: ['Infallible calculation', 'Exploits 0.2 pawn advantages relentlessly'],
    weakness: 'In closed positions with pawn chains, can be held to a draw by building an unbreakable fortress.',
    coachAdvice: 'Aim for a closed pawn fortress! Lock the center, trade queens if possible, and set up an impenetrable defensive barricade.',
    signatureTrap: '12-ply deep tactical combination.',
  },
};
