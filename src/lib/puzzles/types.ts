// ─── Puzzle Source Abstraction ────────────────────────────────────────────────
// Phase 1: Lichess is the active source.
// Phase 2: ChessHub DB source can be plugged in by implementing PuzzleSource.
// UI components consume PuzzleData only — never raw source types.

// ─── Normalized Puzzle Shape ──────────────────────────────────────────────────

export interface PuzzleData {
  /** Unique identifier from the source (Lichess ID or ChessHub UUID) */
  id: string;

  /** Source system that provided this puzzle */
  source: 'lichess' | 'chesshub';

  /** FEN position BEFORE the first puzzle move (position to solve from) */
  initialFen: string;

  /** Ordered solution moves in UCI format e.g. ['e2e4', 'e7e5'] */
  solution: string[];

  /** Side to move: 'white' | 'black' */
  playerToMove: 'white' | 'black';

  /** Puzzle rating (difficulty number) */
  rating: number;

  /** Difficulty label derived from rating */
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert' | 'Master';

  /** Thematic tags e.g. ['fork', 'pin', 'mateIn2'] */
  themes: string[];

  /** Approximate number of moves the student must find */
  numberOfMoves: number;

  /** Opponent's last move in UCI format e.g. 'd7d5' */
  opponentMoveUci?: string;

  /** Opponent's last move in SAN format e.g. 'd5' */
  opponentMoveSan?: string;

  /** Optional URL to the original puzzle on Lichess */
  externalUrl?: string;

  /** Date string — for daily puzzles */
  puzzleDate?: string;
}

// ─── Solve Result ─────────────────────────────────────────────────────────────

export interface PuzzleResult {
  puzzleId: string;
  puzzleSource: 'lichess' | 'chesshub';
  puzzleRating?: number;
  puzzleThemes?: string[];
  solved: boolean;
  attempts: number;
  timeSeconds: number;
  accuracy: number; // 0–100
}

// ─── DB Row (puzzle_results table) ───────────────────────────────────────────

export interface DbPuzzleResult {
  id: string;
  student_id: string;
  puzzle_source: 'lichess' | 'chesshub';
  puzzle_id: string;
  puzzle_rating: number | null;
  puzzle_themes: string[];
  solved_at: string;
  attempts: number;
  solved: boolean;
  time_seconds: number | null;
  accuracy: number | null;
  is_favourite: boolean;
  coach_assigned: boolean;
  created_at: string;
}

// ─── Student Puzzle Stats (for coach view) ────────────────────────────────────

export interface StudentPuzzleStats {
  totalAttempts: number;
  totalSolved: number;
  solveRate: number; // 0–100 percent
  averageTime: number; // seconds
  averageAccuracy: number; // 0–100
  solvedToday: number;
  recentResults: DbPuzzleResult[];
}

// ─── PuzzleSource Interface (future-proofing) ─────────────────────────────────
// Any new puzzle source must satisfy this contract.

export interface PuzzleSource {
  fetchDailyPuzzle(): Promise<PuzzleData>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function getDifficultyLabel(rating: number): PuzzleData['difficulty'] {
  if (rating < 1200) return 'Beginner';
  if (rating < 1600) return 'Intermediate';
  if (rating < 2000) return 'Advanced';
  if (rating < 2400) return 'Expert';
  return 'Master';
}

export function estimateSolveTime(numberOfMoves: number, rating: number): string {
  // Rough heuristic: harder puzzles take longer per move
  const baseSeconds = numberOfMoves * (rating > 1800 ? 30 : rating > 1400 ? 20 : 12);
  const minutes = Math.round(baseSeconds / 60);
  if (minutes < 1) return '< 1 min';
  if (minutes === 1) return '~1 min';
  return `~${minutes} min`;
}
