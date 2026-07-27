import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabaseServer';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { fetchLichessDailyPuzzle } from '@/lib/puzzles/lichess';
import type { PuzzleData } from '@/lib/puzzles/types';

export const dynamic = 'force-dynamic';

// Bounded list of fallback puzzles categorized by difficulty
const FALLBACK_PUZZLES: PuzzleData[] = [
  // ─── Lichess Study: Mate in 1 (Chapters 1 - 24) ──────────────────────────
  { id: 'mate1-1', source: 'lichess', initialFen: '3q1rk1/5pbg/5Qp1/8/8/2B5/5PPP/6K1 w - - 0 1', solution: ['f6g7'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-2', source: 'lichess', initialFen: '2r2rk1/2q2p1p/6pQ/4P1N1/8/8/PPP5/2KR4 w - - 0 1', solution: ['h6h7'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-3', source: 'lichess', initialFen: 'r2q1rk1/pp1p1p1p/5PpQ/8/4N3/8/PP3PPP/R5K1 w - - 0 1', solution: ['h6g7'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-4', source: 'lichess', initialFen: '6r1/7k/2p1pPp1/3p4/8/1R6/5PPP/5K2 w - - 0 1', solution: ['b3h3'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-5', source: 'lichess', initialFen: 'r5k1/q4p2/5Bp1/8/8/8/PP6/K6R w - - 0 1', solution: ['h1h8'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-6', source: 'lichess', initialFen: 'r4rk1/5p1p/8/8/8/8/1BP5/2KR4 w - - 0 1', solution: ['d1g1'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-7', source: 'lichess', initialFen: '4r2k/4r1p1/6p1/8/2B5/8/1PP5/2KR4 w - - 0 1', solution: ['d1h1'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-8', source: 'lichess', initialFen: '8/2r1N1pk/8/8/8/2q2p2/2P5/2KR4 w - - 0 1', solution: ['d1h1'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-9', source: 'lichess', initialFen: 'r7/4KNkp/8/8/a7/8/8/1R6 w - - 0 1', solution: ['b1g1'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-10', source: 'lichess', initialFen: '2kr4/3n4/2p5/8/5B2/8/6PP/5B1K w - - 0 1', solution: ['f4a6'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-11', source: 'lichess', initialFen: 'r1b1kb1r/5ppp/8/6B1/8/8/5PPP/3R3K w - - 0 1', solution: ['d1d8'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-12', source: 'lichess', initialFen: 'r4rk1/p6p/1n6/5N1/3B4/3B4/6PP/7K w - - 0 1', solution: ['d3h7'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-13', source: 'lichess', initialFen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w - - 0 1', solution: ['f3f7'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-14', source: 'lichess', initialFen: 'rnbqkbnr/ppppp2p/5p2/6p1/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 1', solution: ['d1h5'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-15', source: 'lichess', initialFen: '6k1/5ppp/a1p5/3b4/8/1pB5/1Pr2PPP/3RR1K1 w - - 0 1', solution: ['e1e8'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-16', source: 'lichess', initialFen: 'rnbq1rk1/ppp2ppp/3bp3/3p3Q/3P4/3BPN2/PPP2PPP/RNB1K2R w - - 0 1', solution: ['h5h7'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-17', source: 'lichess', initialFen: '6k1/p1p2rpp/1q6/2p5/4P3/PQ6/1P4PP/3R3K w - - 0 1', solution: ['d1d8'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-18', source: 'lichess', initialFen: 'rnb4k/p5pp/8/4N3/8/1B6/PPP5/2K4R w - - 0 1', solution: ['e5g6'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-19', source: 'lichess', initialFen: '6r1/2Q2P2/5k2/5P2/5K2/8/8/8 w - - 0 1', solution: ['f7g8q'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-20', source: 'lichess', initialFen: '8/3pkP2/4p3/8/8/3K4/8/5R2 w - - 0 1', solution: ['f7f8q'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-21', source: 'lichess', initialFen: '3Nnr2/R2PkP2/4p3/8/8/4K3/8/3R4 w - - 0 1', solution: ['f7e8q'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-22', source: 'lichess', initialFen: '2kr4/3p4/8/4B3/8/3B4/3K4/8 w - - 0 1', solution: ['d3a6'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-23', source: 'lichess', initialFen: '2kr4/8/8/8/Q7/6B1/6K1/8 w - - 0 1', solution: ['a4c6'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },
  { id: 'mate1-24', source: 'lichess', initialFen: '3r4/1pk5/3pP3/2N5/8/8/8/2R4K w - - 0 1', solution: ['c5d7'], playerToMove: 'white', rating: 800, difficulty: 'Beginner', themes: ['mate', 'mateIn1'], numberOfMoves: 1 },

  // ─── Beginner (Rating < 1200) ───────────────────────────────────────────────
  {
    id: 'offline-1',
    source: 'lichess',
    initialFen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K2R w KQkq - 4 4',
    solution: ['f3f7'],
    playerToMove: 'white',
    rating: 800,
    difficulty: 'Beginner',
    themes: ['mate', 'mateIn1', 'opening'],
    numberOfMoves: 1,
    externalUrl: 'https://lichess.org/training/mateIn1',
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-3',
    source: 'lichess',
    initialFen: 'r5k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1',
    solution: ['a1a8'],
    playerToMove: 'white',
    rating: 600,
    difficulty: 'Beginner',
    themes: ['mate', 'mateIn1', 'endgame'],
    numberOfMoves: 1,
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-4',
    source: 'lichess',
    initialFen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2',
    solution: ['e4d5', 'd8d5'],
    playerToMove: 'white',
    rating: 700,
    difficulty: 'Beginner',
    themes: ['opening'],
    numberOfMoves: 1,
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-5',
    source: 'lichess',
    initialFen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 2 6',
    solution: ['c4f7'],
    playerToMove: 'white',
    rating: 850,
    difficulty: 'Beginner',
    themes: ['tactics', 'advantage', 'fork'],
    numberOfMoves: 1,
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-6',
    source: 'lichess',
    initialFen: 'r3k2r/pbppqppp/1pn1pn2/8/1bPP4/2N1PN2/PP1BBPPP/R2QK2R w KQkq - 4 8',
    solution: ['e1g1'],
    playerToMove: 'white',
    rating: 900,
    difficulty: 'Beginner',
    themes: ['castling', 'middlegame'],
    numberOfMoves: 1,
    puzzleDate: '2026-07-13',
  },

  // ─── Intermediate (Rating 1200 - 1599) ──────────────────────────────────────
  {
    id: 'offline-2',
    source: 'lichess',
    initialFen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['c4f7', 'e8f7', 'f3e5', 'c6e5'],
    playerToMove: 'white',
    rating: 1300,
    difficulty: 'Intermediate',
    themes: ['sacrifice', 'opening'],
    numberOfMoves: 2,
    externalUrl: 'https://lichess.org/training/sacrifice',
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-7',
    source: 'lichess',
    initialFen: 'r1bqk2r/ppp2ppp/2n2n2/1B2p3/4P3/P1P2N2/1PPP1PPP/R1BQK2R w KQkq - 0 6',
    solution: ['d2d4', 'e5d4'],
    playerToMove: 'white',
    rating: 1250,
    difficulty: 'Intermediate',
    themes: ['opening', 'center'],
    numberOfMoves: 1,
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-8',
    source: 'lichess',
    initialFen: 'rnbqkbnr/ppp2ppp/4p3/3p4/3PP3/8/PPP2PPP/RNBQKBNR w KQkq - 0 3',
    solution: ['e4e5', 'c7c5'],
    playerToMove: 'white',
    rating: 1200,
    difficulty: 'Intermediate',
    themes: ['opening', 'french'],
    numberOfMoves: 1,
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-11',
    source: 'lichess',
    initialFen: 'r3kb1r/pp3ppp/2n5/1B2p3/4P3/8/PP3PPP/R1B1K1NR w KQkq - 0 10',
    solution: ['e4f5'],
    playerToMove: 'white',
    rating: 1400,
    difficulty: 'Intermediate',
    themes: ['advantage', 'tactics'],
    numberOfMoves: 1,
    puzzleDate: '2026-07-13',
  },

  // ─── Advanced (Rating 1600 - 1999) ──────────────────────────────────────────
  {
    id: 'offline-12',
    source: 'lichess',
    initialFen: '2k5/pp3ppp/2p5/8/8/8/qP3PPP/4Q1K1 w - - 0 25',
    solution: ['e1e8', 'c8c7', 'e8e7', 'c7c8'],
    playerToMove: 'white',
    rating: 1650,
    difficulty: 'Advanced',
    themes: ['endgame', 'perpetualCheck'],
    numberOfMoves: 2,
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-13',
    source: 'lichess',
    initialFen: '5rk1/1p3ppp/pb6/3p4/8/1P6/PBP1QPP1/4R1K1 w - - 0 20',
    solution: ['e2e8', 'f8e8', 'e1e8'],
    playerToMove: 'white',
    rating: 1750,
    difficulty: 'Advanced',
    themes: ['mate', 'backrank'],
    numberOfMoves: 2,
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-14',
    source: 'lichess',
    initialFen: '6rk/5Qpp/7N/8/8/8/6PP/6K1 w - - 0 1',
    solution: ['f7g8', 'g8g8', 'h6f7'],
    playerToMove: 'white',
    rating: 1900,
    difficulty: 'Advanced',
    themes: ['mate', 'smothered'],
    numberOfMoves: 2,
    puzzleDate: '2026-07-13',
  },

  // ─── Expert (Rating 2000 - 2399) ────────────────────────────────────────────
  {
    id: 'offline-15',
    source: 'lichess',
    initialFen: '2r2rk1/pp1N1ppp/4p3/3p4/8/2R1B3/PP3PPP/5RK1 w - - 0 1',
    solution: ['d7f8', 'g8f8', 'c3c8'],
    playerToMove: 'white',
    rating: 2150,
    difficulty: 'Expert',
    themes: ['tactics', 'advantage'],
    numberOfMoves: 2,
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-16',
    source: 'lichess',
    initialFen: 'r1b2rk1/1pp2ppp/pb1p4/3P4/PPB1P2q/5Q2/2P2PPP/R1B2RK1 w - - 0 13',
    solution: ['f3g3', 'h4g3', 'h2g3'],
    playerToMove: 'white',
    rating: 2300,
    difficulty: 'Expert',
    themes: ['middlegame', 'tactics'],
    numberOfMoves: 2,
    puzzleDate: '2026-07-13',
  },

  // ─── Discovered Attack & Tactical Motifs ─────────────────────────────────────
  {
    id: 'disc-1',
    source: 'lichess',
    initialFen: 'r1b1k2r/pppp1ppp/8/4q3/8/2B5/PPP2PPP/R3KB1R w KQkq - 0 1',
    solution: ['c3e5'],
    playerToMove: 'white',
    rating: 1100,
    difficulty: 'Beginner',
    themes: ['discoveredAttack', 'tactics', 'hangingPiece'],
    numberOfMoves: 1,
  },
  {
    id: 'disc-2',
    source: 'lichess',
    initialFen: '3r2k1/5ppp/8/8/3B4/8/3R1PPP/6K1 w - - 0 1',
    solution: ['d4f6', 'd8d2'],
    playerToMove: 'white',
    rating: 1300,
    difficulty: 'Intermediate',
    themes: ['discoveredAttack', 'tactics'],
    numberOfMoves: 2,
  },
  {
    id: 'pin-1',
    source: 'lichess',
    initialFen: 'r1bqk1nr/pppp1ppp/2n5/4p3/1b2P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4',
    solution: ['c3d5'],
    playerToMove: 'white',
    rating: 1000,
    difficulty: 'Beginner',
    themes: ['pin', 'opening'],
    numberOfMoves: 1,
  },
  {
    id: 'skewer-1',
    source: 'lichess',
    initialFen: '4k3/8/8/8/8/8/1R6/1K1R4 w - - 0 1',
    solution: ['b2b8', 'e8e7', 'b8h8'],
    playerToMove: 'white',
    rating: 1200,
    difficulty: 'Intermediate',
    themes: ['skewer', 'endgame'],
    numberOfMoves: 2,
  },
  {
    id: 'mate2-1',
    source: 'lichess',
    initialFen: 'r1b2r1k/pp3p1p/2n2p2/8/2B5/6R1/PPP2PPP/3R2K1 w - - 0 1',
    solution: ['d1d6', 'h8g8', 'd6f6'],
    playerToMove: 'white',
    rating: 1300,
    difficulty: 'Intermediate',
    themes: ['mate', 'mateIn2'],
    numberOfMoves: 2,
  },
  {
    id: 'mate3-1',
    source: 'lichess',
    initialFen: 'r1b2rk1/ppp2ppp/8/8/3B4/8/PPP2PPP/R2R2K1 w - - 0 1',
    solution: ['d4bc5', 'f8e8', 'd1d8'],
    playerToMove: 'white',
    rating: 1500,
    difficulty: 'Intermediate',
    themes: ['mate', 'mateIn3'],
    numberOfMoves: 3,
  },
  {
    id: 'zugzwang-1',
    source: 'lichess',
    initialFen: '8/8/8/8/8/5k2/4p3/4K3 w - - 0 1',
    solution: ['e1d2', 'f3f2', 'd2d3', 'e2e1q'],
    playerToMove: 'white',
    rating: 1600,
    difficulty: 'Advanced',
    themes: ['zugzwang', 'endgame'],
    numberOfMoves: 2,
  },

  // ─── Master (Rating >= 2400) ────────────────────────────────────────────────
  {
    id: 'offline-17',
    source: 'lichess',
    initialFen: '8/8/1P6/8/8/5k2/4p3/4K3 w - - 0 1',
    solution: ['b6b7', 'f3e3', 'b7b8q'],
    playerToMove: 'white',
    rating: 2500,
    difficulty: 'Master',
    themes: ['endgame', 'pawnPromotion'],
    numberOfMoves: 2,
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-18',
    source: 'lichess',
    initialFen: '8/8/p7/1P6/8/8/8/k6K w - - 0 1',
    solution: ['b5b6', 'a6a5', 'b6b7'],
    playerToMove: 'white',
    rating: 2600,
    difficulty: 'Master',
    themes: ['endgame', 'pawnPromotion'],
    numberOfMoves: 2,
    puzzleDate: '2026-07-13',
  }
];

export async function GET(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const requestedLevel = searchParams.get('level'); // Beginner, Intermediate, Advanced, Expert, Master
    const requestedTheme = searchParams.get('theme'); // mateIn1, mateIn2, fork, pin, skewer, sacrifice, discoveredAttack, etc.

    let targetDifficulty = requestedLevel;

    if (!targetDifficulty) {
      const admin = createSupabaseAdmin();
      const { data: student } = await admin
        .from('student_profiles')
        .select('level')
        .eq('user_id', user.id)
        .maybeSingle();

      const studentLevel = student?.level || 'BEGINNER';
      targetDifficulty = studentLevel === 'BEGINNER' 
        ? 'Beginner' 
        : studentLevel === 'INTERMEDIATE' 
        ? 'Intermediate' 
        : 'Advanced';
    }

    // Strict Theme-First Filtering
    let pool = FALLBACK_PUZZLES;

    if (requestedTheme && requestedTheme !== 'ALL') {
      const themeMatches = FALLBACK_PUZZLES.filter((p) =>
        p.themes.some((t) => t.toLowerCase() === requestedTheme.toLowerCase())
      );

      if (themeMatches.length > 0) {
        // Theme matching is strictly prioritized!
        const diffInTheme = themeMatches.filter(
          (p) => p.difficulty.toLowerCase() === targetDifficulty!.toLowerCase()
        );
        pool = diffInTheme.length > 0 ? diffInTheme : themeMatches;
      }
    } else {
      const diffMatches = pool.filter(
        (p) => p.difficulty.toLowerCase() === targetDifficulty!.toLowerCase()
      );
      if (diffMatches.length > 0) pool = diffMatches;
    }

    const randomIndex = Math.floor(Math.random() * pool.length);
    const selectedPuzzle = pool[randomIndex];

    // Modify the ID slightly to make it unique per fetch session
    const finalPuzzle = {
      ...selectedPuzzle,
      id: `${selectedPuzzle.id}-${Date.now()}`
    };

    return NextResponse.json(finalPuzzle);
  } catch (error) {
    console.error('[/api/puzzles/next] Error generating next puzzle:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
