// ─── Public API for the Puzzles module ───────────────────────────────────────
// Phase 1: Lichess is the active puzzle source.
// Phase 2: swap `activeSource` to a ChessHub adapter — zero UI changes required.

export type {
  PuzzleData,
  PuzzleResult,
  DbPuzzleResult,
  StudentPuzzleStats,
  PuzzleSource,
} from './types';

export {
  getDifficultyLabel,
  estimateSolveTime,
} from './types';

export { lichessAdapter, fetchLichessDailyPuzzle } from './lichess';

export {
  savePuzzleResult,
  getStudentPuzzleHistory,
  getStudentPuzzleStats,
  togglePuzzleFavourite,
} from './results';

export { analyzePuzzleThemes } from './classifier';
