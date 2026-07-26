import type { PuzzleData, PuzzleSource } from './types';
import { getDifficultyLabel } from './types';

// ─── Lichess API Response Shape ───────────────────────────────────────────────

interface LichessPuzzleResponse {
  puzzle: {
    id: string;
    rating: number;
    themes: string[];
    solution: string[];
    initialPly: number;
  };
  game: {
    pgn: string;
    id: string;
  };
}

// ─── Offline Fallback Cache (Strictly Bounded to 10 Puzzles) ─────────────────

const OFFLINE_FALLBACK_PUZZLES: PuzzleData[] = [
  {
    id: 'offline-1',
    source: 'lichess',
    // Scholar's mate position — white queen on f3 attacks f7. White to move.
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
    id: 'offline-2',
    source: 'lichess',
    initialFen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    solution: ['c4f7', 'e8f7', 'f3e5', 'c6e5'],
    playerToMove: 'white',
    rating: 1000,
    difficulty: 'Intermediate',
    themes: ['sacrifice', 'opening'],
    numberOfMoves: 2,
    externalUrl: 'https://lichess.org/training/sacrifice',
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-3',
    source: 'lichess',
    initialFen: '6k1/5ppp/8/8/8/8/8/6K1 w - - 0 1',
    solution: ['g1f2'],
    playerToMove: 'white',
    rating: 600,
    difficulty: 'Beginner',
    themes: ['endgame'],
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
    // White bishop on f1 can capture on f7 to fork king and rook
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
  {
    id: 'offline-7',
    source: 'lichess',
    initialFen: 'r1bqk2r/ppp2ppp/2np1n2/1B2p3/4P3/P1P2N2/1PPP1PPP/R1BQK2R w KQkq - 0 6',
    solution: ['d2d4', 'e5d4'],
    playerToMove: 'white',
    rating: 1100,
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
    rating: 1000,
    difficulty: 'Intermediate',
    themes: ['opening', 'french'],
    numberOfMoves: 1,
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-9',
    source: 'lichess',
    initialFen: 'rnbqkbnr/ppp1pppp/8/3P4/8/8/PPPP1PPP/RNBQKBNR b KQkq - 0 2',
    solution: ['d8d5', 'b1c3'],
    playerToMove: 'black',
    rating: 950,
    difficulty: 'Beginner',
    themes: ['opening', 'scandinavian'],
    numberOfMoves: 1,
    puzzleDate: '2026-07-13',
  },
  {
    id: 'offline-10',
    source: 'lichess',
    initialFen: '8/8/p7/1P6/8/8/8/k6K w - - 0 1',
    solution: ['b5b6', 'a6a5', 'b6b7'],
    playerToMove: 'white',
    rating: 1200,
    difficulty: 'Intermediate',
    themes: ['endgame', 'pawnPromotion'],
    numberOfMoves: 2,
    puzzleDate: '2026-07-13',
  },
];

const LICHESS_DAILY_URL = 'https://lichess.org/api/puzzle/daily';

/**
 * Fetches the official Lichess Daily Puzzle and normalizes it into PuzzleData.
 * Falls back to offline cached puzzles (strictly capped at 10) in case of API failure.
 */
async function fetchLichessDailyPuzzle(): Promise<PuzzleData> {
  const getFallbackPuzzle = async (): Promise<PuzzleData> => {
    try {
      const { fetchLocalPuzzle } = await import('./local');
      const localP = await fetchLocalPuzzle();
      if (localP) return localP;
    } catch {}
    const cappedFallbacks = OFFLINE_FALLBACK_PUZZLES.slice(0, 10);
    const day = new Date().getDate();
    return cappedFallbacks[day % cappedFallbacks.length];
  };

  try {
    const res = await fetch(LICHESS_DAILY_URL, {
      headers: {
        Accept: 'application/json',
        ...(process.env.LICHESS_API_TOKEN
          ? { Authorization: `Bearer ${process.env.LICHESS_API_TOKEN}` }
          : {}),
      },
      next: { revalidate: 1800 },
    });

    if (!res.ok) {
      console.warn(`Lichess API returned status ${res.status}. Loading offline fallback puzzle.`);
      return await getFallbackPuzzle();
    }

    const data: LichessPuzzleResponse = await res.json();
    const { puzzle, game } = data;

    // Replay PGN to initialPly position to get the FEN
    const { Chess } = await import('chess.js');
    const chess = new Chess();

    const cleanPgn = game.pgn
      .replace(/\{[^}]*\}/g, '')
      .replace(/\$\d+/g, '')
      .trim();

    chess.loadPgn(cleanPgn);

    const fullHistory = chess.history({ verbose: true });
    const targetPly = puzzle.initialPly;

    const positionChess = new Chess();
    for (let i = 0; i < targetPly && i < fullHistory.length; i++) {
      positionChess.move(fullHistory[i].san);
    }

    const initialFen = positionChess.fen();
    const playerToMove = positionChess.turn() === 'w' ? 'white' : 'black';
    const numberOfMoves = Math.ceil(puzzle.solution.length / 2);
    const rating = puzzle.rating;

    const oppMove = fullHistory[targetPly];
    const opponentMoveUci = oppMove ? `${oppMove.from}${oppMove.to}${oppMove.promotion || ''}` : undefined;
    const opponentMoveSan = oppMove ? oppMove.san : undefined;

    return {
      id: puzzle.id,
      source: 'lichess',
      initialFen,
      solution: puzzle.solution,
      playerToMove,
      rating,
      difficulty: getDifficultyLabel(rating),
      themes: puzzle.themes.filter((t) => t !== 'master' && t !== 'masterVsMaster'),
      numberOfMoves,
      opponentMoveUci,
      opponentMoveSan,
      externalUrl: `https://lichess.org/training/${puzzle.id}`,
      puzzleDate: new Date().toISOString().split('T')[0],
    };
  } catch (err) {
    console.error('Failed to fetch from Lichess daily puzzle API, loading fallback:', err);
    return await getFallbackPuzzle();
  }
}

export const lichessAdapter: PuzzleSource = {
  fetchDailyPuzzle: fetchLichessDailyPuzzle,
};

export { fetchLichessDailyPuzzle };
