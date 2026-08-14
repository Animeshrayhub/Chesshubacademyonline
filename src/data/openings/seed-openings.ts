// ─────────────────────────────────────────────────────────────────────────────
// ChessHub AI Opening Teacher — Seed Data (20 Openings)
// Each opening has full 8-chapter curriculum content
// ─────────────────────────────────────────────────────────────────────────────

import type {
  OpeningDifficulty,
  OpeningStyle,
  OpeningColor,
  ChapterType,
  ChapterContent,
  SocraticQuestion,
} from '@/types/opening-teacher';

export interface SeedOpening {
  eco_code: string;
  name: string;
  name_hindi: string;
  color: OpeningColor;
  description: string;
  description_hindi: string;
  starting_fen: string;
  opening_moves: string;
  difficulty: OpeningDifficulty;
  style: OpeningStyle;
  tags: string[];
  order_num: number;
}

export interface SeedChapter {
  chapter_num: number;
  title: string;
  title_hindi: string;
  chapter_type: ChapterType;
  estimated_minutes: number;
  beginner_content: string;
  intermediate_content: string;
  advanced_content: string;
  beginner_content_hindi: string;
  content_json: ChapterContent;
}

export interface SeedPosition {
  chapter_num: number;  // Refers to chapter_num (1-8)
  title: string;
  fen: string;
  board_orientation: 'white' | 'black';
  explanation: string;
  explanation_hindi: string;
  recommended_moves: string[];
  alternative_moves: string[];
  wrong_moves: string[];
  question: string;
  question_hindi: string;
  hints: string[];
  hints_hindi: string[];
  tactical_theme: string | null;
  common_mistake_move: string | null;
  common_mistake_explanation: string | null;
  order_num: number;
  difficulty: OpeningDifficulty;
  is_interactive: boolean;
}

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: BUILD GENERIC CHAPTER CONTENT
// ─────────────────────────────────────────────────────────────────────────────

function makeChapterContent(
  intro: string,
  intro_hindi: string,
  keyIdeas: string[],
  questions: SocraticQuestion[]
): ChapterContent {
  return {
    intro,
    intro_hindi,
    sections: [{ type: 'text', content: intro, content_hindi: intro_hindi }],
    socratic_questions: questions,
    key_ideas: keyIdeas,
    key_ideas_hindi: keyIdeas,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// THE 20 OPENINGS
// ─────────────────────────────────────────────────────────────────────────────

export const SEED_OPENINGS: SeedOpening[] = [
  // ── BEGINNER ──────────────────────────────────────────────────────────────
  {
    eco_code: 'C50',
    name: 'Italian Game',
    name_hindi: 'इटालियन गेम',
    color: 'white',
    description: 'One of the oldest and most popular openings. White develops quickly toward the center and prepares to attack the f7 pawn.',
    description_hindi: 'सबसे पुराने और लोकप्रिय ओपनिंग में से एक। सफेद जल्दी से केंद्र की ओर विकसित होता है।',
    starting_fen: START_FEN,
    opening_moves: '1.e4 e5 2.Nf3 Nc6 3.Bc4',
    difficulty: 'Beginner',
    style: 'Tactical',
    tags: ['e4', 'classical', 'open game', 'beginner-friendly'],
    order_num: 1,
  },
  {
    eco_code: 'D02',
    name: 'London System',
    name_hindi: 'लंदन सिस्टम',
    color: 'white',
    description: 'A solid, flexible system for White that works against almost any Black setup. Ideal for beginners who want a reliable opening without memorizing long theory.',
    description_hindi: 'सफेद के लिए एक ठोस, लचीली प्रणाली जो लगभग किसी भी काले सेटअप के खिलाफ काम करती है।',
    starting_fen: START_FEN,
    opening_moves: '1.d4 d5 2.Nf3 Nf6 3.Bf4',
    difficulty: 'Beginner',
    style: 'Solid',
    tags: ['d4', 'solid', 'system', 'beginner-friendly', 'universal'],
    order_num: 2,
  },
  {
    eco_code: 'C20',
    name: "King's Pawn Opening",
    name_hindi: 'किंग्स पॉन ओपनिंग',
    color: 'white',
    description: 'The most popular first move in chess, fighting for the center with the e-pawn and opening lines for the queen and bishop.',
    description_hindi: 'शतरंज में सबसे लोकप्रिय पहला कदम, केंद्र के लिए लड़ना।',
    starting_fen: START_FEN,
    opening_moves: '1.e4',
    difficulty: 'Beginner',
    style: 'Tactical',
    tags: ['e4', 'open game', 'beginner', 'central control'],
    order_num: 3,
  },
  {
    eco_code: 'C23',
    name: "Scholar's Mate",
    name_hindi: "स्कॉलर्स मेट (चार-चाल मेट)",
    color: 'white',
    description: "The famous 4-move checkmate targeting the weak f7 pawn (1.e4 e5 2.Bc4 Nc6 3.Qh5 Nf6?? 4.Qxf7#). Learn how to play it AND how to defend against it perfectly!",
    description_hindi: "f7 प्यादे को निशाना बनाने वाला प्रसिद्ध 4-चाल चेकमेट। इसे खेलना और इसके खिलाफ रक्षा करना सीखें!",
    starting_fen: START_FEN,
    opening_moves: '1.e4 e5 2.Bc4 Nc6 3.Qh5',
    difficulty: 'Beginner',
    style: 'Aggressive',
    tags: ['e4', 'checkmate', 'f7 attack', 'trap', 'beginner-essential'],
    order_num: 3.5,
  },
  {
    eco_code: 'A00',
    name: "Fool's Mate",
    name_hindi: "फूल्स मेट (दो-चाल मेट)",
    color: 'black',
    description: "The fastest possible checkmate in chess (1.f3 e5 2.g4 Qh4#). Teaches the vital rule: NEVER weaken the diagonal leading to your king early in the game!",
    description_hindi: "शतरंज में सबसे तेज़ संभव चेकमेट (2 चालें)। सिखाता है: राजा के विकर्ण को कभी कमजोर न करें!",
    starting_fen: START_FEN,
    opening_moves: '1.f3 e5 2.g4 Qh4#',
    difficulty: 'Beginner',
    style: 'Tactical',
    tags: ['black', 'checkmate', 'fastest mate', 'king safety', 'diagonal attack'],
    order_num: 3.6,
  },
  {
    eco_code: 'B01',
    name: 'Scandinavian Defense',
    name_hindi: 'स्कैंडिनेवियाई डिफेंस',
    color: 'black',
    description: 'Black immediately challenges White\'s center pawn on move 1. A dynamic defense that leads to unbalanced positions.',
    description_hindi: 'काला तुरंत पहले चाल पर सफेद के केंद्रीय प्यादे को चुनौती देता है।',
    starting_fen: START_FEN,
    opening_moves: '1.e4 d5',
    difficulty: 'Beginner',
    style: 'Aggressive',
    tags: ['e4', 'black', 'counter-attack', 'beginner-friendly'],
    order_num: 4,
  },
  {
    eco_code: 'C00',
    name: 'French Defense',
    name_hindi: 'फ्रेंच डिफेंस',
    color: 'black',
    description: 'A solid defense where Black builds a strong pawn chain. White gets space in the center but Black gets counterplay on the queenside.',
    description_hindi: 'एक मजबूत डिफेंस जहां काला एक मजबूत प्यादा श्रृंखला बनाता है।',
    starting_fen: START_FEN,
    opening_moves: '1.e4 e6 2.d4 d5',
    difficulty: 'Beginner',
    style: 'Solid',
    tags: ['e4', 'black', 'pawn chain', 'counterplay', 'solid'],
    order_num: 5,
  },
  {
    eco_code: 'C60',
    name: 'Ruy Lopez (Spanish Game)',
    name_hindi: 'रुए लोपेज़ (स्पेनिश गेम)',
    color: 'white',
    description: 'One of the most famous openings, played at the highest levels. White puts pressure on the knight that defends the e5 pawn.',
    description_hindi: 'सबसे प्रसिद्ध ओपनिंग में से एक, उच्चतम स्तर पर खेला जाता है।',
    starting_fen: START_FEN,
    opening_moves: '1.e4 e5 2.Nf3 Nc6 3.Bb5',
    difficulty: 'Beginner',
    style: 'Positional',
    tags: ['e4', 'white', 'classical', 'world championship', 'positional'],
    order_num: 6,
  },
  {
    eco_code: 'D06',
    name: "Queen's Gambit",
    name_hindi: 'क्वींस गैम्बिट',
    color: 'white',
    description: 'White offers a pawn to gain control of the center. One of the most respected openings in chess history.',
    description_hindi: 'सफेद केंद्र का नियंत्रण पाने के लिए एक प्यादा प्रदान करता है।',
    starting_fen: START_FEN,
    opening_moves: '1.d4 d5 2.c4',
    difficulty: 'Beginner',
    style: 'Positional',
    tags: ['d4', 'white', 'classical', 'pawn sacrifice', 'central control'],
    order_num: 7,
  },
  {
    eco_code: 'B10',
    name: 'Caro-Kann Defense',
    name_hindi: 'कारो-कान डिफेंस',
    color: 'black',
    description: 'A solid defense against 1.e4. Black challenges the center with c6 and d5, leading to a solid pawn structure without the weaknesses of the French.',
    description_hindi: '1.e4 के खिलाफ एक ठोस डिफेंस। काला c6 और d5 से केंद्र को चुनौती देता है।',
    starting_fen: START_FEN,
    opening_moves: '1.e4 c6 2.d4 d5',
    difficulty: 'Beginner',
    style: 'Solid',
    tags: ['e4', 'black', 'solid', 'classical', 'pawn structure'],
    order_num: 8,
  },
  // ── INTERMEDIATE ──────────────────────────────────────────────────────────
  {
    eco_code: 'B90',
    name: 'Sicilian Defense — Najdorf',
    name_hindi: 'सिसिलियन डिफेंस — नजदोर्फ',
    color: 'black',
    description: 'The most popular defense in chess at grandmaster level. Black fights for the initiative with active counterplay on the queenside.',
    description_hindi: 'ग्रैंडमास्टर स्तर पर शतरंज में सबसे लोकप्रिय डिफेंस।',
    starting_fen: START_FEN,
    opening_moves: '1.e4 c5 2.Nf3 d6 3.d4 cxd4 4.Nxd4 Nf6 5.Nc3 a6',
    difficulty: 'Intermediate',
    style: 'Tactical',
    tags: ['e4', 'black', 'dynamic', 'complex', 'counter-attack'],
    order_num: 9,
  },
  {
    eco_code: 'E60',
    name: "King's Indian Defense",
    name_hindi: "किंग्स इंडियन डिफेंस",
    color: 'black',
    description: 'A hypermodern defense where Black allows White to build a pawn center, then attacks it with ...e5 or ...c5.',
    description_hindi: 'एक हाइपरमॉडर्न डिफेंस जहां काला सफेद को पॉन सेंटर बनाने देता है।',
    starting_fen: START_FEN,
    opening_moves: '1.d4 Nf6 2.c4 g6 3.Nc3 Bg7',
    difficulty: 'Intermediate',
    style: 'Aggressive',
    tags: ['d4', 'black', 'fianchetto', 'hypermodern', 'dynamic'],
    order_num: 10,
  },
  {
    eco_code: 'E20',
    name: 'Nimzo-Indian Defense',
    name_hindi: 'निम्जो-इंडियन डिफेंस',
    color: 'black',
    description: 'Black pins the knight on c3 with Bb4, preventing e4. A strategically rich defense with many ideas.',
    description_hindi: 'काला Bb4 के साथ c3 पर नाइट को पिन करता है, e4 को रोकता है।',
    starting_fen: START_FEN,
    opening_moves: '1.d4 Nf6 2.c4 e6 3.Nc3 Bb4',
    difficulty: 'Intermediate',
    style: 'Positional',
    tags: ['d4', 'black', 'pin', 'strategic', 'imbalance'],
    order_num: 11,
  },
  {
    eco_code: 'D10',
    name: 'Slav Defense',
    name_hindi: 'स्लाव डिफेंस',
    color: 'black',
    description: 'A solid defense against the Queen\'s Gambit. Black supports the d5 pawn with c6, keeping the c8 bishop active.',
    description_hindi: "क्वींस गैम्बिट के खिलाफ एक ठोस डिफेंस।",
    starting_fen: START_FEN,
    opening_moves: '1.d4 d5 2.c4 c6',
    difficulty: 'Intermediate',
    style: 'Solid',
    tags: ['d4', 'black', 'solid', 'pawn structure', 'queenside'],
    order_num: 12,
  },
  {
    eco_code: 'A10',
    name: 'English Opening',
    name_hindi: 'इंग्लिश ओपनिंग',
    color: 'white',
    description: 'White starts with 1.c4, a flexible hypermodern approach controlling the center from the flanks.',
    description_hindi: 'सफेद 1.c4 से शुरू करता है, एक लचीला हाइपरमॉडर्न दृष्टिकोण।',
    starting_fen: START_FEN,
    opening_moves: '1.c4',
    difficulty: 'Intermediate',
    style: 'Universal',
    tags: ['c4', 'white', 'hypermodern', 'flexible', 'positional'],
    order_num: 13,
  },
  {
    eco_code: 'B07',
    name: 'Pirc Defense',
    name_hindi: 'पिर्क डिफेंस',
    color: 'black',
    description: 'Black allows White to build a strong pawn center, then attacks it with piece pressure and counterplay.',
    description_hindi: 'काला सफेद को मजबूत पॉन सेंटर बनाने देता है, फिर पीस प्रेशर से हमला करता है।',
    starting_fen: START_FEN,
    opening_moves: '1.e4 d6 2.d4 Nf6 3.Nc3 g6',
    difficulty: 'Intermediate',
    style: 'Aggressive',
    tags: ['e4', 'black', 'fianchetto', 'counterplay', 'dynamic'],
    order_num: 14,
  },
  {
    eco_code: 'A80',
    name: 'Dutch Defense',
    name_hindi: 'डच डिफेंस',
    color: 'black',
    description: 'Black controls the e4 square with f5. An unbalanced opening that leads to complex positions with kingside attacking chances for Black.',
    description_hindi: 'काला f5 के साथ e4 वर्ग को नियंत्रित करता है।',
    starting_fen: START_FEN,
    opening_moves: '1.d4 f5',
    difficulty: 'Intermediate',
    style: 'Aggressive',
    tags: ['d4', 'black', 'kingside attack', 'unbalanced', 'dynamic'],
    order_num: 15,
  },
  // ── ADVANCED ──────────────────────────────────────────────────────────────
  {
    eco_code: 'D70',
    name: 'Grünfeld Defense',
    name_hindi: 'ग्रुनफेल्ड डिफेंस',
    color: 'black',
    description: 'Black allows White a large pawn center with d4 and e4, then attacks it immediately. A deeply strategic battle around the center.',
    description_hindi: 'काला सफेद को d4 और e4 के साथ बड़ा पॉन सेंटर बनाने देता है।',
    starting_fen: START_FEN,
    opening_moves: '1.d4 Nf6 2.c4 g6 3.Nc3 d5',
    difficulty: 'Advanced',
    style: 'Tactical',
    tags: ['d4', 'black', 'hypermodern', 'pawn center', 'counterattack'],
    order_num: 16,
  },
  {
    eco_code: 'E00',
    name: 'Catalan Opening',
    name_hindi: 'कातालान ओपनिंग',
    color: 'white',
    description: 'White combines the Queen\'s Gambit and King\'s Indian Attack. The g2 bishop puts long-term pressure on the queenside.',
    description_hindi: "सफेद क्वींस गैम्बिट और किंग्स इंडियन अटैक को जोड़ता है।",
    starting_fen: START_FEN,
    opening_moves: '1.d4 Nf6 2.c4 e6 3.g3',
    difficulty: 'Advanced',
    style: 'Positional',
    tags: ['d4', 'white', 'fianchetto', 'positional', 'queenside pressure'],
    order_num: 17,
  },
  {
    eco_code: 'A57',
    name: 'Benko Gambit',
    name_hindi: 'बेंको गैम्बिट',
    color: 'black',
    description: 'Black sacrifices a pawn on the queenside for long-term positional pressure and open files.',
    description_hindi: 'काला क्वीनसाइड पर दीर्घकालिक स्थितिगत दबाव के लिए एक प्यादा बलिदान करता है।',
    starting_fen: START_FEN,
    opening_moves: '1.d4 Nf6 2.c4 c5 3.d5 b5',
    difficulty: 'Advanced',
    style: 'Aggressive',
    tags: ['d4', 'black', 'gambit', 'queenside pressure', 'pawn sacrifice'],
    order_num: 18,
  },
  {
    eco_code: 'C30',
    name: "King's Gambit",
    name_hindi: "किंग्स गैम्बिट",
    color: 'white',
    description: 'One of the oldest and most romantic openings. White sacrifices a pawn to open the f-file and attack Black\'s king.',
    description_hindi: 'सबसे पुराने और सबसे रोमांटिक ओपनिंग में से एक।',
    starting_fen: START_FEN,
    opening_moves: '1.e4 e5 2.f4',
    difficulty: 'Advanced',
    style: 'Aggressive',
    tags: ['e4', 'white', 'gambit', 'attack', 'romantic', 'f-file'],
    order_num: 19,
  },
  {
    eco_code: 'C89',
    name: 'Marshall Attack',
    name_hindi: 'मार्शल अटैक',
    color: 'black',
    description: 'Black sacrifices a pawn at move 8 for a ferocious kingside attack against the Ruy Lopez. One of the most dangerous prepared variations in chess.',
    description_hindi: 'काला रुए लोपेज़ के खिलाफ एक भयंकर किंगसाइड हमले के लिए चाल 8 पर एक प्यादा बलिदान करता है।',
    starting_fen: START_FEN,
    opening_moves: '1.e4 e5 2.Nf3 Nc6 3.Bb5 a6 4.Ba4 Nf6 5.O-O Be7 6.Re1 b5 7.Bb3 O-O 8.c3 d5',
    difficulty: 'Advanced',
    style: 'Aggressive',
    tags: ['e4', 'black', 'attack', 'sacrifice', 'ruy-lopez variation'],
    order_num: 20,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ITALIAN GAME — FULL 8-CHAPTER CONTENT (Example of complete opening data)
// Other openings follow the same structure; abbreviated here for clarity.
// The full seed script generates chapters for all 20 openings dynamically.
// ─────────────────────────────────────────────────────────────────────────────

export const ITALIAN_GAME_CHAPTERS: SeedChapter[] = [
  {
    chapter_num: 1,
    title: 'Basic Idea',
    title_hindi: 'मूल विचार',
    chapter_type: 'basic_idea',
    estimated_minutes: 8,
    beginner_content: `The Italian Game begins with 1.e4 e5 2.Nf3 Nc6 3.Bc4. 

White has three key goals:
1. Control the center with the e-pawn
2. Develop pieces quickly (knight to f3, bishop to c4)
3. Prepare to castle kingside for king safety

The bishop on c4 aims at the f7 pawn — one of the weakest squares in Black's position early in the game.

The Italian Game is perfect for beginners because it teaches all the most important opening principles: control the center, develop your pieces, keep your king safe.`,
    intermediate_content: `The Italian Game (1.e4 e5 2.Nf3 Nc6 3.Bc4) is a classical open game that has been played for centuries.

White's strategic goals:
- Control d5 and f5 with the c4 bishop
- Support a future d3-d4 pawn break
- Pressure the f7 square (bishop + knight battery)
- Maintain flexible development options

The modern Italian (with d3 instead of d4) is very popular at top levels because it avoids many of Black's sharp responses to the Giuoco Piano.`,
    advanced_content: `The Italian Game offers White rich positional play through the modern slow system (3.Bc4 Bc5 4.c3 Nf6 5.d3) or sharp tactical play through the Evan's Gambit (4.b4!?) or the Giuoco Piano (4.c3 d5).

Key strategic considerations:
- The "bind" with d3+c3+b4 is a common modern White plan
- The f7 pressure (Bc4+Nf3) can transition to tactical attacks
- Move order matters: c3 before d4 vs d3 first have different implications
- Black's ...d5 breaks are often the main counterplay`,
    beginner_content_hindi: `इटालियन गेम 1.e4 e5 2.Nf3 Nc6 3.Bc4 से शुरू होता है।

सफेद के तीन मुख्य लक्ष्य:
1. e-प्यादे से केंद्र को नियंत्रित करें
2. जल्दी से पीस विकसित करें
3. किंगसाइड कैसलिंग के लिए तैयार हों

c4 पर बिशप f7 प्यादे को निशाना बनाता है।`,
    content_json: makeChapterContent(
      'The Italian Game is one of the oldest chess openings. White controls the center, develops quickly, and prepares to castle.',
      'इटालियन गेम सबसे पुरानी शतरंज ओपनिंग में से एक है।',
      [
        'Control the center with e4 and support it with pieces',
        'Develop knights before bishops (Nf3 before Bc4)',
        'The Bc4 bishop targets the vulnerable f7 pawn',
        'Castling early gives your king safety',
      ],
      [
        {
          question: 'Why do you think the bishop is placed on c4 rather than e2 or d3?',
          question_hindi: 'बिशप को c4 पर क्यों रखा जाता है?',
          expected_keywords: ['f7', 'attack', 'pressure', 'center', 'diagonal'],
          correct_response: 'Excellent! The bishop on c4 targets the f7 pawn — a key weakness in Black\'s position early in the game.',
          partial_response: 'Good thinking! You noticed the bishop is active. The specific target is the f7 pawn, which is only defended by the king.',
          incorrect_response: 'Look at the diagonal the bishop controls from c4. What square does it target near the Black king?',
          correct_response_hindi: 'शानदार! c4 पर बिशप f7 प्यादे को निशाना बनाता है।',
          partial_response_hindi: 'अच्छी सोच! बिशप सक्रिय है। खास निशाना f7 प्यादा है।',
          incorrect_response_hindi: 'c4 से बिशप जो विकर्ण नियंत्रित करता है उसे देखें।',
        },
      ]
    ),
  },
  {
    chapter_num: 2,
    title: 'Development',
    title_hindi: 'पीस डेवलपमेंट',
    chapter_type: 'development',
    estimated_minutes: 10,
    beginner_content: `After 1.e4 e5 2.Nf3 Nc6 3.Bc4, it's time to develop more pieces.

The key development moves for White:
- Castle kingside (O-O) — brings the rook to f1 and protects the king
- Play d3 — supports the e4 pawn and prepares to develop the dark-squared bishop

For Black, the most natural development is:
- Bc5 — develops the bishop and mirrors White's structure
- Nf6 — develops the knight and attacks e4

Important rule: Don't move the same piece twice in the opening! Every move should develop a new piece.`,
    intermediate_content: `Development order matters greatly in the Italian Game.

White's main choices after 3.Bc4:
1. 4.c3 (Giuoco Piano) — prepares d4 center advance
2. 4.d3 (Modern Italian) — solid, flexible, avoids sharp lines
3. 4.b4!? (Evan's Gambit) — aggressive pawn sacrifice for rapid development

The principle: Develop with tempo where possible. Each developing move should control a key square or attack something.`,
    advanced_content: `In the Italian, move-order subtleties determine which variation you enter.

After 3.Bc4 Bc5, if White plays:
- 4.c3: enters the Giuoco Piano
- 4.d3: Modern Italian (avoids Giuoco)
- 4.b4: Evan's Gambit (rare but dangerous)
- 4.Nc3: Two Knights (different structure)

The Two Knights (3.Bc4 Nf6 4.Ng5) leads to completely different territory — the Fried Liver Attack or the Traxler Counter-Gambit.`,
    beginner_content_hindi: `3.Bc4 के बाद और पीस विकसित करने का समय है।

सफेद के मुख्य विकास कदम:
- किंगसाइड कैसल (O-O)
- d3 खेलें — e4 प्यादे को सहारा दें

काले के लिए प्राकृतिक विकास:
- Bc5 — बिशप को विकसित करें
- Nf6 — नाइट विकसित करें`,
    content_json: makeChapterContent(
      'In the Development chapter, we learn how each piece finds its ideal square in the Italian Game.',
      'डेवलपमेंट चैप्टर में हम सीखते हैं कि इटालियन गेम में प्रत्येक पीस अपना आदर्श वर्ग कैसे पाता है।',
      [
        'Develop knights before bishops when possible',
        'Don\'t move the same piece twice without good reason',
        'Castle early to protect your king',
        'Connect your rooks by developing all pieces',
      ],
      [
        {
          question: 'After 1.e4 e5 2.Nf3 Nc6 3.Bc4, what do you think is Black\'s best developing move?',
          question_hindi: '3.Bc4 के बाद काले का सबसे अच्छा विकास कदम क्या है?',
          expected_keywords: ['Bc5', 'Nf6', 'mirror', 'bishop', 'knight'],
          correct_response: 'Great! Both 3...Bc5 and 3...Nf6 are excellent. Bc5 mirrors White\'s setup. Nf6 attacks the e4 pawn directly.',
          partial_response: 'You\'re on the right track. The key is to develop a piece that either copies White\'s plan or challenges the center.',
          incorrect_response: 'Let\'s look at Black\'s pieces. Which ones aren\'t developed yet? Where should they go?',
          correct_response_hindi: 'बढ़िया! 3...Bc5 और 3...Nf6 दोनों उत्कृष्ट हैं।',
          partial_response_hindi: 'आप सही रास्ते पर हैं।',
          incorrect_response_hindi: 'काले के पीस देखें। कौन से अभी विकसित नहीं हैं?',
        },
      ]
    ),
  },
  {
    chapter_num: 3,
    title: 'Main Line',
    title_hindi: 'मेन लाइन',
    chapter_type: 'main_line',
    estimated_minutes: 15,
    beginner_content: `The main line of the Italian Game continues:

1.e4 e5 — both sides fight for the center
2.Nf3 Nc6 — White attacks e5, Black defends it  
3.Bc4 Bc5 — both bishops point at each other's f-pawns
4.c3 — White prepares d4 to build a strong center
4...Nf6 — Black develops and attacks e4
5.d4 — White strikes in the center
5...exd4 — Black takes, opening the e-file
6.cxd4 — White recaptures with the pawn, gaining a center

After 6.cxd4 Bb4+, Black checks to force White to block.

This is the Giuoco Piano (Italian for "Quiet Game") — but it's not so quiet!`,
    intermediate_content: `The classical Italian main line: 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3 Nf6 5.d4 exd4 6.cxd4

After 6...Bb4+ White can play:
- 7.Bd2 (solid) — blocking the check calmly
- 7.Nc3 (aggressive) — allowing doubled pawns but gaining space

After 7.Bd2 Bxd2+ 8.Nbxd2, the position is slightly better for White with a strong center.

Key plans: d4-d5 to push the center, Ng5 attacks on f7, queenside expansion.`,
    advanced_content: `The Modern Italian (1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.d3) is more popular at grandmaster level.

After 4.d3 Nf6 5.O-O O-O 6.c3, White prepares a3-b4 expansion or d4 depending on circumstances.

Key nuances:
- The tempo move a3 (preventing Bb4) is important
- White aims for slow kingside attack with Nf1-g3-f5
- Black has ...d5 as a central break if White is slow
- Move order between c3 and O-O matters against the Two Knights`,
    beginner_content_hindi: `इटालियन गेम की मेन लाइन:

1.e4 e5 — दोनों केंद्र के लिए लड़ते हैं
2.Nf3 Nc6 — सफेद e5 पर हमला करता है, काला बचाव करता है
3.Bc4 Bc5 — दोनों बिशप एक-दूसरे के f-प्यादों को निशाना बनाते हैं
4.c3 — सफेद d4 की तैयारी करता है
4...Nf6 — काला विकसित होता है और e4 पर हमला करता है
5.d4 — सफेद केंद्र में वार करता है`,
    content_json: makeChapterContent(
      'We learn the main moves of the Italian Game one by one, understanding the reason behind each move.',
      'हम इटालियन गेम की मुख्य चालें एक-एक करके सीखते हैं।',
      [
        'Every move should have a purpose — control, develop, or attack',
        '4.c3 prepares d4 to build a strong pawn center',
        'When Black plays ...Bb4+, White must block with a piece',
        'The d4 push is White\'s key idea to fight for center control',
      ],
      [
        {
          question: 'After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.c3, why does White play c3 instead of immediately d4?',
          question_hindi: 'c3 क्यों खेला जाता है, सीधे d4 क्यों नहीं?',
          expected_keywords: ['support', 'd4', 'recapture', 'pawn', 'center'],
          correct_response: 'Exactly right! c3 prepares to recapture on d4 with the pawn (cxd4) after ...exd4, maintaining a strong pawn center.',
          partial_response: 'Good thinking. The key is that c3 helps White recapture on d4 with a pawn instead of a piece, keeping the center strong.',
          incorrect_response: 'Think about what happens if White plays d4 directly without c3. After ...exd4, how does White recapture?',
          correct_response_hindi: 'बिल्कुल सही! c3 d4 पर प्यादे से दोबारा कब्जा करने की तैयारी करता है।',
          partial_response_hindi: 'अच्छी सोच। c3 सफेद को d4 पर प्यादे से दोबारा कब्जा करने में मदद करता है।',
          incorrect_response_hindi: 'सोचें कि c3 के बिना d4 खेलने पर क्या होगा।',
        },
      ]
    ),
  },
  {
    chapter_num: 4,
    title: "Black's Responses",
    title_hindi: 'काले की प्रतिक्रियाएं',
    chapter_type: 'responses',
    estimated_minutes: 12,
    beginner_content: `After 1.e4 e5 2.Nf3 Nc6 3.Bc4, Black has several good responses:

1. 3...Bc5 — The Giuoco Piano ("Quiet Game")
   Black mirrors White's setup. Both sides fight for the center.

2. 3...Nf6 — The Two Knights Defense
   Black immediately attacks the e4 pawn. This can lead to very sharp play.

3. 3...Be7 — A solid but passive choice
   Black defends but gives White more space.

4. 3...d6 — The Hungarian Defense
   Very solid but slightly passive.

For beginners, 3...Bc5 is the most natural and instructive choice.`,
    intermediate_content: `After 3.Bc4, Black's responses create very different types of positions:

3...Bc5 (Giuoco Piano): Symmetrical development, fight for d4/d5
3...Nf6 (Two Knights): Immediate counter-attack on e4, leads to complications
3...d6: Solid but White gets easy equality advantage
3...Nd4!? (Blackburne Gambit): Wild gambit, not recommended

Against 3...Nf6, White must decide:
- 4.Ng5 (Fried Liver territory) — aggressive
- 4.d4 (Open variation) — pawn sacrifice for activity
- 4.d3 — solid, keep it simple`,
    advanced_content: `The Two Knights Defense (3...Nf6 4.Ng5) leads to the critical Fried Liver Attack after 4...d5 5.exd5 Na5 6.Bb5+ c6 7.dxc6 bxc6 8.Be2 h6 9.Nf3 e4.

The Traxler Counter-Gambit (3...Nf6 4.Ng5 Bc5!?) is Black's most dangerous answer.

At top level, 3...Bc5 with 4.d3 and the slow Italian is the main battleground. Black's responses include:
- 4...Nf6 (main): develops toward e4
- 4...d6 (solid)
- 4...f5!? (aggressive, the Boden-Kieseritzky)`,
    beginner_content_hindi: `3.Bc4 के बाद काले के पास कई अच्छे जवाब हैं:

1. 3...Bc5 — जियुओको पियानो
2. 3...Nf6 — टू नाइट्स डिफेंस
3. 3...Be7 — ठोस लेकिन निष्क्रिय
4. 3...d6 — हंगेरियन डिफेंस

शुरुआती खिलाड़ियों के लिए 3...Bc5 सबसे स्वाभाविक है।`,
    content_json: makeChapterContent(
      'Understanding how Black can respond helps White prepare the right plans. Each response needs a different approach.',
      'काले की प्रतिक्रियाओं को समझना सफेद को सही योजना बनाने में मदद करता है।',
      [
        '3...Bc5 mirrors White and leads to balanced play',
        '3...Nf6 attacks e4 and leads to sharp complications',
        'White must know the plan against each Black response',
        'Never play on autopilot — adapt your plan to what Black does',
      ],
      [
        {
          question: 'If Black plays 3...Nf6 instead of 3...Bc5, what is the difference? What does Nf6 threaten?',
          question_hindi: 'अगर काला 3...Nf6 खेलता है तो क्या अंतर है? Nf6 क्या धमकी देता है?',
          expected_keywords: ['e4', 'attack', 'pawn', 'knight', 'center'],
          correct_response: 'Perfect! Nf6 directly attacks the e4 pawn. White must either defend it or use the tempo to create threats.',
          partial_response: 'Good observation. Nf6 is a developing move that also creates an immediate threat against the e4 pawn.',
          incorrect_response: 'Look at the Nf6 knight. Which White pawn does it attack directly from f6?',
          correct_response_hindi: 'परफेक्ट! Nf6 सीधे e4 प्यादे पर हमला करता है।',
          partial_response_hindi: 'अच्छा अवलोकन। Nf6 e4 प्यादे के खिलाफ एक तत्काल खतरा बनाता है।',
          incorrect_response_hindi: 'Nf6 नाइट देखें। यह किस सफेद प्यादे पर सीधे हमला करता है?',
        },
      ]
    ),
  },
  {
    chapter_num: 5,
    title: 'Tactical Ideas',
    title_hindi: 'टैक्टिकल आइडियाज',
    chapter_type: 'tactics',
    estimated_minutes: 15,
    beginner_content: `The Italian Game has many exciting tactical ideas:

1. The Fork Trick: After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5, White threatens Nxf7 — a fork winning both the queen and rook!

2. Scholar's Mate idea: Bc4 + Qh5 aims at f7, the weakest pawn near Black's king.

3. The Fried Liver Attack: After 4.Ng5 d5 5.exd5, White can sacrifice the knight on f7!

These tactics all revolve around the weak f7 pawn.

Important: These tactics only work if Black doesn't see them coming! Your job as a student is to learn both how to use them AND how to defend against them.`,
    intermediate_content: `Italian Game tactical patterns:

1. Fried Liver Attack (3.Bc4 Nf6 4.Ng5 d5 5.exd5 Nxd5 6.Nxf7!): Knight sacrifice for huge compensation
2. Legal's Mate (Nxe5 sacrificing the queen): Works when opponent takes the queen after Nxe5
3. Evan's Gambit tactics: After 4.b4 Bxb4 5.c3 Ba5 6.d4, White gets huge center and attacking chances
4. Bc4+Ng5+Qf3 battery: Can be lethal if Black doesn't know the correct defense

The underlying idea: f7 is only defended by the king, making it vulnerable to piece coordination.`,
    advanced_content: `Advanced Italian tactical motifs:

1. The Greco Attack (c3 Italian): After ...Nxe4, White has d4-d5 fork possibilities
2. Boden's Mate potential: Bc4+Qa5 can deliver crisscross bishop checkmate
3. Rook lift Rf1-f3-g3/h3 is a common attacking motif in the Classical Italian
4. The ...d5 break timing: If Black plays ...d5 at the wrong moment, White has Nxd5 tactics
5. Piece sacrifice on f7 in the Giuoco: Under specific conditions, Bxf7+! can work`,
    beginner_content_hindi: `इटालियन गेम में कई रोमांचक टैक्टिकल आइडिया हैं:

1. फोर्क ट्रिक: Nxf7 — क्वीन और रूक दोनों जीतना!
2. स्कॉलर्स मेट: Bc4 + Qh5 f7 को निशाना बनाता है
3. फ्राइड लिवर अटैक: f7 पर नाइट बलिदान!

ये सभी टैक्टिक्स f7 प्यादे के आसपास केंद्रित हैं।`,
    content_json: makeChapterContent(
      'The Italian Game is rich in tactical patterns. We study the most important ones so you can use them — and defend against them.',
      'इटालियन गेम टैक्टिकल पैटर्न से भरा है।',
      [
        'The f7 pawn is the most common tactical target in the Italian',
        'The fork trick with Nxf7 wins material if Black plays Nxd5',
        'The Fried Liver Attack is a famous knight sacrifice on f7',
        'Always check if your pieces coordinate for a tactical shot',
      ],
      [
        {
          question: 'After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5, White threatens Nxf7. What should Black do?',
          question_hindi: '4.Ng5 के बाद White Nxf7 की धमकी देता है। काले को क्या करना चाहिए?',
          expected_keywords: ['d5', 'counter', 'attack', 'center', 'threat'],
          correct_response: 'Excellent! 4...d5! is the correct response. Black counterattacks the center rather than defending passively.',
          partial_response: 'Good instinct. The best response is 4...d5! — counterattacking rather than just defending.',
          incorrect_response: 'Remember: in chess, the best defense is often a counter-attack. Instead of just protecting f7, can Black threaten something back?',
          correct_response_hindi: 'उत्कृष्ट! 4...d5! सही जवाब है। काला केंद्र पर पलटवार करता है।',
          partial_response_hindi: 'अच्छी प्रवृत्ति। सबसे अच्छा जवाब 4...d5! है।',
          incorrect_response_hindi: 'याद रखें: शतरंज में सबसे अच्छा बचाव अक्सर पलटवार होता है।',
        },
      ]
    ),
  },
  {
    chapter_num: 6,
    title: 'Common Mistakes',
    title_hindi: 'सामान्य गलतियां',
    chapter_type: 'mistakes',
    estimated_minutes: 12,
    beginner_content: `Every player makes mistakes in the Italian Game. Let's learn the most common ones so you can avoid them!

Mistake 1: Moving the queen too early
Many beginners play Qf3 or Qh5 early. This wastes time and the queen gets attacked.

Mistake 2: Playing d4 too early without c3
After 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.d4?!, Black can play 4...exd4 5.Nxd4?! and after 5...Qh4! White is in trouble.

Mistake 3: Forgetting to castle
Keeping the king in the center after opening lines is dangerous!

Mistake 4: Taking the pawn with 3...Nxe4?
After 3.Bc4, if it were Black's turn, taking e4 with the knight (if given the chance) can be a trap!`,
    intermediate_content: `Common intermediate-level mistakes in the Italian:

1. Premature d4: Without proper preparation, d4 can backfire
2. Ng5 without follow-up: 4.Ng5 without a clear plan often just develops a piece to be kicked back
3. Ignoring Black's ...d5 break: If White is slow, ...d5 equalizes or even favors Black
4. Over-focusing on the f7 target: White can neglect development for short-term tactical threats
5. The trap: 4.c3 Nxe4!? (if White forgets to protect e4): 5.Nxe4? d5 wins a piece!`,
    advanced_content: `Advanced mistakes and subtleties:

1. Playing c3 too early: In some lines, c3 weakens b3 and allows ...Qb6 ideas
2. Move order: 4.d3 Nf6 5.Nc3?! allows 5...Nd4 with good play for Black  
3. The c3+d4 plan timed badly: If White plays 5.d4 before castle, Black has 5...Ng4! ideas
4. Forgetting the bishop escape: After 4.c3 Bc5 5.d4 exd4 6.cxd4 Bb4+, White's d-pawn can fall if mishandled
5. Transposition errors: Playing into the Two Knights when you prepared the Giuoco`,
    beginner_content_hindi: `हर खिलाड़ी इटालियन गेम में गलतियां करता है। सबसे आम गलतियां:

गलती 1: क्वीन को बहुत जल्दी ले जाना
गलती 2: c3 के बिना d4 खेलना
गलती 3: कैसल करना भूलना
गलती 4: e4 प्यादा जल्दी लेना`,
    content_json: makeChapterContent(
      'We study the most common mistakes players make in the Italian Game. Understanding mistakes is just as important as knowing the correct moves.',
      'हम इटालियन गेम में सबसे सामान्य गलतियों का अध्ययन करते हैं।',
      [
        'Moving the queen early wastes time and invites attacks',
        'Always protect your e4 pawn before pushing d4',
        'Castle as soon as your king becomes unsafe',
        'Check for tactics before every move',
      ],
      [
        {
          question: 'A student plays 1.e4 e5 2.Nf3 Nc6 3.Bc4 Bc5 4.d4? immediately without playing c3 first. What is the problem with this?',
          question_hindi: 'c3 के बिना 4.d4 खेलने की क्या समस्या है?',
          expected_keywords: ['recapture', 'piece', 'pawn', 'center', 'exd4', 'Nxd4'],
          correct_response: 'Excellent! After 4...exd4 5.Nxd4 Qh4!, Black attacks e4 and threatens checkmate on f2 at the same time!',
          partial_response: 'Good start. After 4...exd4, White takes back with the knight (Nxd4). Then what can Black do to cause problems?',
          incorrect_response: 'After 4.d4 exd4, try to recapture with the knight on f3. Then look at Black\'s next move — what attacks can Black make?',
          correct_response_hindi: 'उत्कृष्ट! 4...exd4 5.Nxd4 Qh4! के बाद काला e4 पर हमला करता है!',
          partial_response_hindi: 'अच्छी शुरुआत।',
          incorrect_response_hindi: '4.d4 exd4 के बाद नाइट से दोबारा कब्जा करने की कोशिश करें।',
        },
      ]
    ),
  },
  {
    chapter_num: 7,
    title: 'Practice',
    title_hindi: 'अभ्यास',
    chapter_type: 'practice',
    estimated_minutes: 20,
    beginner_content: `It\'s time to practice what you\'ve learned!

In this chapter, you will play the Italian Game against the AI coach.

Practice Mode Guidelines:
- Try to remember the correct moves from Chapters 1-6
- The AI will tell you if you make a mistake, but won\'t immediately reveal the answer
- Focus on the WHY behind each move, not just memorizing moves
- Use hints if you get stuck — but try without them first!

Remember the key ideas:
1. Control the center
2. Develop pieces quickly
3. Castle your king
4. Look for the f7 tactical ideas`,
    intermediate_content: `Intermediate Practice:

Play the Italian Game with deeper understanding. Try to:
- Find the correct move order (c3 before d4)
- Respond correctly to Black\'s different setups (Bc5 vs Nf6)
- Use the d4 advance at the right moment
- Recognize when to castle vs continue development

Challenge Mode: Play without any hints for 8 moves.`,
    advanced_content: `Advanced Practice Scenarios:

1. Navigate the Giuoco Piano correctly for 10+ moves
2. Handle the Two Knights Defense (3...Nf6)
3. Try the Evan\'s Gambit (4.b4) in Practice Mode
4. Respond to Black\'s ...d5 break correctly
5. Achieve a good middlegame position from the opening`,
    beginner_content_hindi: `अब आप जो सीखा उसका अभ्यास करने का समय है!

इस चैप्टर में, आप AI कोच के खिलाफ इटालियन गेम खेलेंगे।

मुख्य विचार याद रखें:
1. केंद्र को नियंत्रित करें
2. पीस जल्दी विकसित करें
3. किंग को कैसल करें`,
    content_json: makeChapterContent(
      'Practice applying the Italian Game. Play the opening, make decisions, and learn from your moves.',
      'इटालियन गेम को लागू करने का अभ्यास करें।',
      [
        'Apply what you learned in a real game position',
        'Think before each move: What is my goal?',
        'Try to castle within the first 8-10 moves',
        'Look for tactical opportunities involving f7',
      ],
      []
    ),
  },
  {
    chapter_num: 8,
    title: 'Final Test',
    title_hindi: 'अंतिम परीक्षा',
    chapter_type: 'test',
    estimated_minutes: 15,
    beginner_content: `Test your Italian Game knowledge!

This test covers:
- Opening ideas and goals
- Move recognition (find the correct move)
- Understanding plans
- Responding to Black\'s setups
- Common mistakes to avoid
- Tactical patterns

You need 90% to complete this chapter and earn the "Italian Game: Familiar" badge.

Good luck! You\'ve studied hard — trust your preparation.`,
    intermediate_content: `Intermediate Test — Italian Game

This test requires deeper understanding:
- Explain WHY each move is correct
- Find the refutation of incorrect moves
- Navigate variations you haven\'t memorized
- Recognize transpositions

Scoring: Each question tests a different skill category.`,
    advanced_content: `Advanced Test — Italian Game

Deep strategic and tactical test:
- Compare Italian Game plans with Ruy Lopez
- Evaluate positions after 10+ moves
- Find the critical moment in complex positions
- Assess when to deviate from theory`,
    beginner_content_hindi: `अपने इटालियन गेम ज्ञान का परीक्षण करें!

यह परीक्षा कवर करती है:
- ओपनिंग विचार और लक्ष्य
- मूव पहचान
- योजनाओं को समझना

आपको इस चैप्टर को पूरा करने के लिए 90% चाहिए।`,
    content_json: makeChapterContent(
      'Test your complete understanding of the Italian Game. This is a comprehensive assessment across all 7 chapters.',
      'इटालियन गेम की अपनी संपूर्ण समझ का परीक्षण करें।',
      [
        'Review all 7 chapters before taking the test',
        'Think carefully before answering — no time pressure',
        'Every question tests a real chess skill',
        'Mistakes will be remembered and practiced later',
      ],
      []
    ),
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// ITALIAN GAME — INTERACTIVE POSITIONS (per chapter)
// ─────────────────────────────────────────────────────────────────────────────

export const ITALIAN_GAME_POSITIONS: SeedPosition[] = [
  // Chapter 1 — Basic Idea positions
  {
    chapter_num: 1,
    title: 'Starting Position',
    fen: START_FEN,
    board_orientation: 'white',
    explanation: "This is the starting position. White will play 1.e4 to control the center. The center squares e4, e5, d4, d5 are the most important squares in the opening.",
    explanation_hindi: "यह शुरुआती स्थिति है। सफेद केंद्र को नियंत्रित करने के लिए 1.e4 खेलेगा।",
    recommended_moves: ['e4'],
    alternative_moves: ['d4', 'c4'],
    wrong_moves: ['a4', 'h4', 'Na3', 'Nh3'],
    question: "What should White play first to fight for the center?",
    question_hindi: "केंद्र के लिए लड़ने के लिए सफेद को पहले क्या खेलना चाहिए?",
    hints: ["Move a center pawn", "The most popular first move uses the king's pawn"],
    hints_hindi: ["एक केंद्र प्यादा चलाएं", "सबसे लोकप्रिय पहला कदम किंग के प्यादे का उपयोग करता है"],
    tactical_theme: null,
    common_mistake_move: 'h4',
    common_mistake_explanation: "h4 is a flank move that doesn't fight for the center. The opening principle says: control the center first!",
    order_num: 1,
    difficulty: 'Beginner',
    is_interactive: true,
  },
  {
    chapter_num: 1,
    title: 'After 1.e4 e5 — Two Pawns in the Center',
    fen: 'rnbqkbnr/pppp1ppp/8/4p3/4P3/8/PPPP1PPP/RNBQKBNR w KQkq e6 0 2',
    board_orientation: 'white',
    explanation: "Both sides have placed a pawn in the center. Now White develops the kingside knight to f3 to attack the e5 pawn and prepare to castle.",
    explanation_hindi: "दोनों पक्षों ने केंद्र में एक प्यादा रखा है। अब सफेद Nf3 खेलेगा।",
    recommended_moves: ['Nf3'],
    alternative_moves: ['Nc3', 'd4'],
    wrong_moves: ['Qh5', 'Bc4', 'f4'],
    question: "What's White's best developing move? Remember: develop knights before bishops when possible!",
    question_hindi: "सफेद का सबसे अच्छा विकास कदम क्या है?",
    hints: ["Which piece can attack the e5 pawn?", "The knight on g1 has a natural square on f3"],
    hints_hindi: ["e5 प्यादे पर कौन सा पीस हमला कर सकता है?", "g1 पर नाइट का स्वाभाविक वर्ग f3 है"],
    tactical_theme: null,
    common_mistake_move: 'Qh5',
    common_mistake_explanation: "Bringing the queen out early is a common beginner mistake. The queen can be attacked by Black's pieces, wasting time.",
    order_num: 2,
    difficulty: 'Beginner',
    is_interactive: true,
  },
  {
    chapter_num: 1,
    title: 'After 1.e4 e5 2.Nf3 Nc6 — Place the Bishop',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3',
    board_orientation: 'white',
    explanation: "After 2.Nf3 Nc6, it's time for White to develop the light-squared bishop. The ideal square is c4, where it points at the weak f7 pawn.",
    explanation_hindi: "2.Nf3 Nc6 के बाद, सफेद का लाइट-स्क्वेर बिशप विकसित करने का समय है।",
    recommended_moves: ['Bc4'],
    alternative_moves: ['Bb5', 'd4', 'Nc3'],
    wrong_moves: ['Bc3', 'Bd3', 'Be2'],
    question: "Where should the bishop go? Think about what square gives it the most power!",
    question_hindi: "बिशप कहाँ जाना चाहिए?",
    hints: ["The bishop should go to an active square", "Which square lets the bishop target Black's f7 pawn?"],
    hints_hindi: ["बिशप एक सक्रिय वर्ग पर जाना चाहिए", "कौन सा वर्ग बिशप को काले के f7 प्यादे को निशाना बनाने देता है?"],
    tactical_theme: null,
    common_mistake_move: 'Be2',
    common_mistake_explanation: "Be2 is too passive. The bishop has no targets and blocks the kingside. Bc4 is much more active, aiming at f7.",
    order_num: 3,
    difficulty: 'Beginner',
    is_interactive: true,
  },
  // Chapter 3 — Main Line positions
  {
    chapter_num: 3,
    title: 'After 3.Bc4 Bc5 — Key Decision',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 4 4',
    board_orientation: 'white',
    explanation: "After 3.Bc4 Bc5, White needs to prepare the d4 center advance. The move c3 supports d4. This position is the Giuoco Piano.",
    explanation_hindi: "3.Bc4 Bc5 के बाद, सफेद को d4 केंद्र अग्रिम की तैयारी करनी होगी।",
    recommended_moves: ['c3', 'd3', 'Nf3'],
    alternative_moves: ['Nc3', 'b4', 'O-O'],
    wrong_moves: ['Nxe5', 'Bxf7', 'Qh5'],
    question: "White wants to play d4 to control the center. What move should White make first to prepare d4?",
    question_hindi: "सफेद d4 खेलना चाहता है। d4 तैयार करने के लिए पहले क्या खेलना चाहिए?",
    hints: ["Think about what happens after d4...exd4. How can White recapture?", "c3 allows White to recapture with a pawn on d4"],
    hints_hindi: ["d4...exd4 के बाद क्या होता है?", "c3 सफेद को d4 पर प्यादे से दोबारा कब्जा करने देता है"],
    tactical_theme: null,
    common_mistake_move: 'Nxe5',
    common_mistake_explanation: "Nxe5?? is a blunder! After 4...Nxe5, the knight on e5 and the bishop on c4 are both attacked. White loses material.",
    order_num: 1,
    difficulty: 'Beginner',
    is_interactive: true,
  },
  // Chapter 6 — Common Mistakes (wrong move to find)
  {
    chapter_num: 6,
    title: 'Spot the Mistake: Early Queen',
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/8/PPPP1PPP/RNBQK1NR w KQkq - 4 4',
    board_orientation: 'white',
    explanation: "This is a critical moment. White wants to attack Black immediately. They are thinking about playing 4.Qh5 to threaten f7. Is this a good idea?",
    explanation_hindi: "यह एक महत्वपूर्ण क्षण है। सफेद 4.Qh5 के बारे में सोच रहा है। क्या यह अच्छा विचार है?",
    recommended_moves: ['c3', 'd3', 'Nf3', 'Nc3'],
    alternative_moves: [],
    wrong_moves: ['Qh5'],
    question: "White is tempted to play 4.Qh5! to threaten f7. Why is this NOT a good idea?",
    question_hindi: "सफेद 4.Qh5 खेलने के लिए ललचाया हुआ है। यह अच्छा विचार क्यों नहीं है?",
    hints: ["What can Black do when the queen comes to h5?", "Can Black develop a piece and attack the queen at the same time?"],
    hints_hindi: ["जब क्वीन h5 पर आती है तो काला क्या कर सकता है?", "क्या काला एक पीस विकसित करते हुए क्वीन पर हमला कर सकता है?"],
    tactical_theme: 'tempo',
    common_mistake_move: 'Qh5',
    common_mistake_explanation: "After 4.Qh5?! Black plays 4...g6! attacking the queen. The queen is forced to retreat, wasting a tempo and giving Black free development.",
    order_num: 1,
    difficulty: 'Beginner',
    is_interactive: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Generate generic chapters for other openings (abbreviated)
// The full app uses this pattern for all 20 openings
// ─────────────────────────────────────────────────────────────────────────────

export function generateGenericChapters(opening: SeedOpening): SeedChapter[] {
  const chapterTypes: Array<{ num: number; type: ChapterType; title: string; title_hindi: string; minutes: number }> = [
    { num: 1, type: 'basic_idea',   title: 'Basic Idea',    title_hindi: 'मूल विचार',          minutes: 8  },
    { num: 2, type: 'development',  title: 'Development',   title_hindi: 'पीस डेवलपमेंट',      minutes: 10 },
    { num: 3, type: 'main_line',    title: 'Main Line',     title_hindi: 'मेन लाइन',            minutes: 15 },
    { num: 4, type: 'responses',    title: "Opponent's Responses", title_hindi: 'प्रतिद्वंद्वी की प्रतिक्रियाएं', minutes: 12 },
    { num: 5, type: 'tactics',      title: 'Tactical Ideas', title_hindi: 'टैक्टिकल आइडियाज', minutes: 15 },
    { num: 6, type: 'mistakes',     title: 'Common Mistakes', title_hindi: 'सामान्य गलतियां',   minutes: 12 },
    { num: 7, type: 'practice',     title: 'Practice',      title_hindi: 'अभ्यास',              minutes: 20 },
    { num: 8, type: 'test',         title: 'Final Test',    title_hindi: 'अंतिम परीक्षा',       minutes: 15 },
  ];

  return chapterTypes.map(ch => ({
    chapter_num: ch.num,
    title: `${opening.name} — ${ch.title}`,
    title_hindi: `${opening.name_hindi} — ${ch.title_hindi}`,
    chapter_type: ch.type,
    estimated_minutes: ch.minutes,
    beginner_content: `This is the ${ch.title} chapter for the ${opening.name}. Content covers beginner-level understanding of the ${ch.title.toLowerCase()} concepts in this opening.`,
    intermediate_content: `Intermediate ${ch.title} for ${opening.name}. This section assumes familiarity with basic chess principles and goes deeper into the strategic and tactical ideas.`,
    advanced_content: `Advanced ${ch.title} for ${opening.name}. This covers grandmaster-level ideas, move-order subtleties, and deep positional concepts.`,
    beginner_content_hindi: `${opening.name_hindi} के लिए ${ch.title_hindi} चैप्टर।`,
    content_json: makeChapterContent(
      `Learn the ${ch.title.toLowerCase()} of the ${opening.name} (${opening.eco_code}).`,
      `${opening.name_hindi} का ${ch.title_hindi} सीखें।`,
      [
        `Understand the key ${ch.title.toLowerCase()} concepts in the ${opening.name}`,
        `Learn why each move matters in this opening`,
      ],
      []
    ),
  }));
}
