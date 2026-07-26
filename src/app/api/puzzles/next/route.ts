import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabaseServer';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { fetchLichessDailyPuzzle } from '@/lib/puzzles/lichess';
import type { PuzzleData } from '@/lib/puzzles/types';

export const dynamic = 'force-dynamic';

// Bounded list of fallback puzzles categorized by difficulty
const FALLBACK_PUZZLES: PuzzleData[] = [
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

    // Filter local puzzles by student difficulty, fallback to random if none
    let pool = FALLBACK_PUZZLES.filter(p => p.difficulty.toLowerCase() === targetDifficulty!.toLowerCase());
    if (pool.length === 0) pool = FALLBACK_PUZZLES;

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
