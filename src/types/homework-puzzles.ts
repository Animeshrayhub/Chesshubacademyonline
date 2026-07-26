// ============================================================
// ChessHub Academy — Homework Puzzle Module Types
// ============================================================

// ── Enums ────────────────────────────────────────────────────

export type PuzzleDifficulty = 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
export type PuzzleTheme =
  | 'fork' | 'pin' | 'skewer' | 'discovered_attack' | 'double_check'
  | 'back_rank' | 'smothered_mate' | 'mate_in_one' | 'mate_in_two' | 'mate_in_three'
  | 'deflection' | 'decoy' | 'zwischenzug' | 'promotion' | 'endgame'
  | 'opening_trap' | 'tactics' | 'sacrifice' | 'zugzwang';

export type AttemptStatus   = 'unsolved' | 'solved' | 'failed' | 'skipped';
export type ProgressStatus  = 'not_started' | 'in_progress' | 'completed' | 'passed' | 'failed';
export type WeaknessLevel   = 'strong' | 'normal' | 'weak' | 'critical';
export type ReviewStatus    = 'pending' | 'reviewed' | 'approved' | 'returned_for_retry';
export type UnlockedBy      = 'auto' | 'coach' | 'admin';

// ── Database Row Types ────────────────────────────────────────

export interface DbHomeworkPuzzle {
  id:            string;
  title:         string;
  fen:           string;
  solution:      string[];          // UCI move sequence
  alt_solutions?: string[];         // Alternative UCI move sequence variations
  theme:         PuzzleTheme | string;
  difficulty:    PuzzleDifficulty;
  rating:        number;
  estimated_time?: number;          // Estimated time in minutes
  tags?:         string[];
  chapter_id?:    string | null;
  status?:       'active' | 'draft' | 'archived';
  hint_1:        string | null;
  hint_2:        string | null;
  hint_3:        string | null;
  explanation:   string | null;
  source:        string;
  source_id:     string | null;
  created_by:    string | null;
  created_at:    string;
  updated_at:    string;
  is_active:     boolean;
}

/** Sanitized version sent to student — solution and hints stripped until unlocked */
export interface StudentPuzzleView {
  id:            string;
  title:         string;
  fen:           string;
  theme:         string;
  difficulty:    PuzzleDifficulty;
  rating:        number;
  estimated_time?: number;
  tags?:         string[];
  puzzle_order:  number;
  // hints and solution only present when allowed
  hint_1?:       string | null;
  hint_2?:       string | null;
  hint_3?:       string | null;
  solution?:     string[];   // only when solution_unlocked = true
  alt_solutions?: string[];
  explanation?:  string | null;
}

export interface DbHomeworkChapterPuzzle {
  id:           string;
  chapter_id:   string;
  puzzle_id:    string;
  puzzle_order: number;
  created_at:   string;
}

export interface DbStudentPuzzleAttempt {
  id:                 string;
  assignment_id:      string;
  puzzle_id:          string;
  student_profile_id: string;
  puzzle_order:       number;
  attempts_used:      number;      // 0-3
  hints_used:         number;      // 0-3
  status:             AttemptStatus;
  score:              number;
  time_seconds:       number;
  solution_unlocked:  boolean;
  started_at:         string;
  solved_at:          string | null;
  last_move:          string | null;
  correct_on_attempt: number | null;
}

export interface DbHomeworkHintUsage {
  id:              string;
  attempt_id:      string;
  hint_level:      1 | 2 | 3;
  points_deducted: number;
  requested_at:    string;
}

export interface DbHomeworkProgress {
  id:                  string;
  assignment_id:       string;
  student_profile_id:  string;
  total_puzzles:       number;
  solved_puzzles:      number;
  failed_puzzles:      number;
  total_score:         number;
  max_possible_score:  number;
  accuracy:            number;
  avg_time_seconds:    number;
  total_hints_used:    number;
  status:              ProgressStatus;
  started_at:          string | null;
  completed_at:        string | null;
  last_activity_at:    string;
}

export interface DbThemeProgress {
  id:                 string;
  student_profile_id: string;
  theme:              string;
  total_assigned:     number;
  total_solved:       number;
  total_wrong:        number;
  accuracy:           number;
  avg_time_seconds:   number;
  hints_used:         number;
  best_score:         number;
  current_streak:     number;
  best_streak:        number;
  last_solved_at:     string | null;
  weakness_level:     WeaknessLevel;
  updated_at:         string;
}

export interface DbChapterProgress {
  id:                 string;
  student_profile_id: string;
  chapter_id:         string;
  is_unlocked:        boolean;
  unlock_threshold:   number;
  achieved_accuracy:  number;
  unlocked_at:        string | null;
  unlocked_by:        UnlockedBy;
  override_coach_id:  string | null;
  created_at:         string;
}

export interface DbCoachReview {
  id:              string;
  assignment_id:   string;
  coach_id:        string;
  feedback:        string | null;
  grade_override:  number | null;
  status:          ReviewStatus;
  override_unlock: boolean;
  reviewed_at:     string;
}

// ── Application-level Types ───────────────────────────────────

export interface PuzzleSessionState {
  puzzles:          StudentPuzzleView[];
  currentIndex:     number;
  attempts:         Record<string, DbStudentPuzzleAttempt>;  // puzzleId → attempt
  progress:         DbHomeworkProgress | null;
  isComplete:       boolean;
}

export interface PuzzleMoveResult {
  correct:          boolean;
  nextExpected?:    string;   // next move in solution (UCI) for multi-move sequences
  isComplete:       boolean;  // true when full solution chain is done
  attemptsLeft:     number;
  scoreEarned:      number;
  message:          string;
}

export interface HintResponse {
  hintText:       string;
  hintLevel:      1 | 2 | 3;
  pointsDeducted: number;
  alreadyUsed:    boolean;
}

export interface HomeworkAnalytics {
  assignmentId:     string;
  workbookTitle:    string;
  chapterTitle:     string;
  totalStudents:    number;
  completedCount:   number;
  passedCount:      number;
  avgAccuracy:      number;
  avgScore:         number;
  avgHintsUsed:     number;
  avgTimeSeconds:   number;
  themeBreakdown:   ThemeBreakdownItem[];
  studentBreakdown: StudentBreakdownItem[];
}

export interface ThemeBreakdownItem {
  theme:         string;
  totalAttempts: number;
  solved:        number;
  accuracy:      number;
  avgTime:       number;
}

export interface StudentBreakdownItem {
  studentId:       string;
  studentName:     string;
  solved:          number;
  total:           number;
  accuracy:        number;
  score:           number;
  hintsUsed:       number;
  status:          ProgressStatus;
  completedAt:     string | null;
}

// ── API Request / Response Shapes ────────────────────────────

export interface CreatePuzzleInput {
  title:       string;
  fen:         string;
  solution:    string[];
  theme:       string;
  difficulty:  PuzzleDifficulty;
  rating?:     number;
  hint1?:      string;
  hint2?:      string;
  hint3?:      string;
  explanation?: string;
  sourceId?:   string;
}

export interface AssignPuzzlesInput {
  chapterId: string;
  puzzleIds: string[];
}

export interface SubmitMoveInput {
  assignmentId: string;
  puzzleId:     string;
  uciMove:      string;
  timeSeconds:  number;
}

export interface RequestHintInput {
  assignmentId: string;
  puzzleId:     string;
  hintLevel:    1 | 2 | 3;
}

export interface UnlockSolutionInput {
  assignmentId: string;
  puzzleId:     string;
}

export interface CoachReviewInput {
  assignmentId:   string;
  feedback:       string;
  gradeOverride?: number;
  status:         ReviewStatus;
  overrideUnlock?: boolean;
}

// ── Score Constants ───────────────────────────────────────────
export const PUZZLE_SCORES = {
  FIRST_ATTEMPT:  100,
  SECOND_ATTEMPT:  80,
  THIRD_ATTEMPT:   60,
  FAILED:            0,
} as const;

export const HINT_DEDUCTIONS = {
  HINT_1: 10,   // general idea
  HINT_2: 15,   // piece clue
  HINT_3: 20,   // direction clue
} as const;

export const MAX_ATTEMPTS = 3;

export const UNLOCK_THRESHOLD = 90; // percent accuracy

// ── Theme Display Config ──────────────────────────────────────
export const THEME_CONFIG: Record<string, { label: string; emoji: string; color: string }> = {
  fork:              { label: 'Fork',              emoji: '⚡', color: '#f59e0b' },
  pin:               { label: 'Pin',               emoji: '📌', color: '#3b82f6' },
  skewer:            { label: 'Skewer',            emoji: '🗡️', color: '#ef4444' },
  discovered_attack: { label: 'Discovered Attack', emoji: '💥', color: '#8b5cf6' },
  double_check:      { label: 'Double Check',      emoji: '✌️', color: '#ec4899' },
  back_rank:         { label: 'Back Rank',         emoji: '🏰', color: '#06b6d4' },
  smothered_mate:    { label: 'Smothered Mate',    emoji: '🤫', color: '#64748b' },
  mate_in_one:       { label: 'Mate in One',       emoji: '♟️', color: '#22c55e' },
  mate_in_two:       { label: 'Mate in Two',       emoji: '♟️', color: '#16a34a' },
  mate_in_three:     { label: 'Mate in Three',     emoji: '♟️', color: '#15803d' },
  deflection:        { label: 'Deflection',        emoji: '↩️', color: '#f97316' },
  decoy:             { label: 'Decoy',             emoji: '🎣', color: '#a78bfa' },
  zwischenzug:       { label: 'Zwischenzug',       emoji: '🔄', color: '#f43f5e' },
  promotion:         { label: 'Promotion',         emoji: '👑', color: '#eab308' },
  endgame:           { label: 'Endgame',           emoji: '🏁', color: '#6366f1' },
  opening_trap:      { label: 'Opening Trap',      emoji: '🪤', color: '#84cc16' },
  tactics:           { label: 'Tactics',           emoji: '⚔️', color: '#0ea5e9' },
  sacrifice:         { label: 'Sacrifice',         emoji: '🫡', color: '#fb923c' },
  zugzwang:          { label: 'Zugzwang',          emoji: '🛑', color: '#94a3b8' },
};
