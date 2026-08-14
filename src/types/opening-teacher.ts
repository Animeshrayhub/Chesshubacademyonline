// ─────────────────────────────────────────────────────────────────────────────
// ChessHub AI Opening Teacher — Type Definitions
// ─────────────────────────────────────────────────────────────────────────────

export type OpeningDifficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type OpeningStyle = 'Tactical' | 'Positional' | 'Aggressive' | 'Solid' | 'Universal';
export type OpeningColor = 'white' | 'black' | 'both';
export type ChapterType =
  | 'basic_idea'
  | 'development'
  | 'main_line'
  | 'responses'
  | 'tactics'
  | 'mistakes'
  | 'practice'
  | 'test';

export type MasteryLevel = 'not_started' | 'learning' | 'familiar' | 'strong' | 'mastered';
export type ProgressStatus = 'not_started' | 'in_progress' | 'completed';
export type ChapterStatus = 'locked' | 'unlocked' | 'in_progress' | 'completed';
export type MistakeType =
  | 'wrong_move'
  | 'illegal_move'
  | 'missed_tactic'
  | 'wrong_plan'
  | 'premature_move';

// ─────────────────────────────────────────────────────────────────────────────
// DATABASE ENTITY TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface DbOpening {
  id: string;
  eco_code: string;
  name: string;
  name_hindi: string | null;
  color: OpeningColor;
  description: string | null;
  description_hindi: string | null;
  starting_fen: string;
  opening_moves: string;
  difficulty: OpeningDifficulty;
  style: OpeningStyle;
  is_published: boolean;
  order_num: number;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface DbOpeningVariation {
  id: string;
  opening_id: string;
  name: string;
  pgn: string;
  move_sequence: string;
  final_fen: string | null;
  difficulty: OpeningDifficulty;
  is_main_line: boolean;
  order_num: number;
  created_at: string;
}

export interface DbOpeningChapter {
  id: string;
  opening_id: string;
  chapter_num: number;
  title: string;
  title_hindi: string | null;
  chapter_type: ChapterType;
  content_json: ChapterContent;
  beginner_content: string | null;
  intermediate_content: string | null;
  advanced_content: string | null;
  beginner_content_hindi: string | null;
  intermediate_content_hindi: string | null;
  advanced_content_hindi: string | null;
  estimated_minutes: number;
  unlock_threshold: number;
  is_published: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbOpeningPosition {
  id: string;
  chapter_id: string;
  opening_id: string;
  title: string;
  fen: string;
  board_orientation: 'white' | 'black';
  explanation: string | null;
  explanation_hindi: string | null;
  recommended_moves: string[];
  alternative_moves: string[];
  wrong_moves: string[];
  question: string | null;
  question_hindi: string | null;
  hints: string[];
  hints_hindi: string[];
  tactical_theme: string | null;
  common_mistake_move: string | null;
  common_mistake_explanation: string | null;
  stockfish_eval: string | null;
  order_num: number;
  difficulty: OpeningDifficulty;
  is_interactive: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbStudentOpeningProgress {
  id: string;
  student_id: string;
  opening_id: string;
  status: ProgressStatus;
  overall_score: number;
  difficulty_override: OpeningDifficulty | null;
  mastery_level: MasteryLevel;
  started_at: string | null;
  last_practiced_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbStudentChapterProgress {
  id: string;
  student_id: string;
  chapter_id: string;
  opening_id: string;
  is_unlocked: boolean;
  status: ChapterStatus;
  score: number;
  positions_attempted: number;
  positions_correct: number;
  hints_used: number;
  time_spent_seconds: number;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbStudentOpeningMistake {
  id: string;
  student_id: string;
  opening_id: string;
  chapter_id: string | null;
  position_id: string | null;
  position_fen: string;
  student_move: string;
  expected_move: string;
  eval_before: string | null;
  eval_after: string | null;
  eval_difference: number | null;
  mistake_type: MistakeType;
  attempt_count: number;
  successful_recovery_count: number;
  is_resolved: boolean;
  last_attempted_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbStudentOpeningScores {
  id: string;
  student_id: string;
  opening_id: string;
  knowledge_score: number;
  move_recognition_score: number;
  plans_score: number;
  tactical_score: number;
  responses_score: number;
  practical_score: number;
  overall_score: number;
  mastery_level: MasteryLevel;
  test_score: number | null;
  test_completed_at: string | null;
  updated_at: string;
}

export interface DbAiOpeningSession {
  id: string;
  student_id: string;
  opening_id: string | null;
  chapter_id: string | null;
  messages_json: AiMessage[];
  context_json: AiContext;
  current_fen: string | null;
  last_position_id: string | null;
  started_at: string;
  updated_at: string;
  ended_at: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// CHAPTER CONTENT JSON STRUCTURE
// ─────────────────────────────────────────────────────────────────────────────

export interface ChapterContent {
  intro: string;
  intro_hindi?: string;
  sections: ChapterSection[];
  socratic_questions: SocraticQuestion[];
  key_ideas: string[];
  key_ideas_hindi?: string[];
}

export interface ChapterSection {
  type: 'text' | 'move_demo' | 'position' | 'question' | 'tip';
  content: string;
  content_hindi?: string;
  fen?: string;               // For position sections
  moves?: string[];           // Moves to demonstrate
  move_explanations?: string[]; // One explanation per move
}

export interface SocraticQuestion {
  question: string;
  question_hindi?: string;
  expected_keywords: string[]; // Keywords that indicate understanding
  correct_response: string;
  partial_response: string;
  incorrect_response: string;
  correct_response_hindi?: string;
  partial_response_hindi?: string;
  incorrect_response_hindi?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// AI CONVERSATION TYPES
// ─────────────────────────────────────────────────────────────────────────────

export type AiMessageRole = 'coach' | 'student' | 'system';

export interface AiMessage {
  id: string;
  role: AiMessageRole;
  content: string;
  content_hindi?: string;
  timestamp: string;
  // Metadata
  position_id?: string;
  fen?: string;
  move?: string;
  is_question?: boolean;
  question_answered?: boolean;
}

export interface AiContext {
  student_id: string;
  student_level: OpeningDifficulty;
  opening_id: string;
  opening_name: string;
  chapter_num: number;
  chapter_type: ChapterType;
  current_fen: string;
  language: 'en' | 'hi';
  mistakes_count: number;
  recent_mistakes: Array<{ fen: string; move: string; type: MistakeType }>;
  chapter_score: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// FRONTEND / COMPONENT TYPES
// ─────────────────────────────────────────────────────────────────────────────

export interface OpeningWithProgress extends DbOpening {
  progress?: DbStudentOpeningProgress | null;
  scores?: DbStudentOpeningScores | null;
  chapters?: OpeningChapterWithProgress[];
}

export interface OpeningChapterWithProgress extends DbOpeningChapter {
  progress?: DbStudentChapterProgress | null;
}

export interface OpeningLibrarySection {
  title: string;
  description: string;
  openings: OpeningWithProgress[];
}

export interface LessonState {
  currentPositionIndex: number;
  positions: DbOpeningPosition[];
  currentFen: string;
  moveHistory: string[];
  isPlayerTurn: boolean;
  lastMoveResult: MoveResult | null;
  hintsUsed: number;
  hintIndex: number;
  aiMessages: AiMessage[];
  isAiThinking: boolean;
  chapterScore: number;
  isComplete: boolean;
}

export interface MoveResult {
  move: string;
  isLegal: boolean;
  isCorrect: boolean;
  isInOpeningDb: boolean;
  evalBefore?: string;
  evalAfter?: string;
  explanation?: string;
  explanation_hindi?: string;
  hints?: string[];
  mistakeType?: MistakeType;
}

export interface StockfishResult {
  bestMove: string;
  eval: string;             // e.g. '+0.5', '#3'
  evalType: 'cp' | 'mate'; // centipawn or mate
  depth: number;
  pv: string[];             // principal variation
}

export interface TeachingRequest {
  student_id: string;
  opening_id: string;
  chapter_num: number;
  current_fen: string;
  student_message: string;
  student_move?: string;
  move_result?: MoveResult;
  context: AiContext;
  language: 'en' | 'hi';
}

export interface TeachingResponse {
  message: string;
  message_hindi?: string;
  is_question: boolean;
  expected_answer_keywords?: string[];
  suggested_move?: string;
  next_position_id?: string;
  advance_position: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// SCORE CALCULATION HELPERS
// ─────────────────────────────────────────────────────────────────────────────

export function getMasteryLevel(score: number): MasteryLevel {
  if (score >= 90) return 'mastered';
  if (score >= 70) return 'strong';
  if (score >= 50) return 'familiar';
  if (score > 0)   return 'learning';
  return 'not_started';
}

export const MASTERY_LABELS: Record<MasteryLevel, string> = {
  not_started: 'Not Started',
  learning:    'Learning',
  familiar:    'Familiar',
  strong:      'Strong',
  mastered:    'Mastered',
};

export const MASTERY_COLORS: Record<MasteryLevel, string> = {
  not_started: 'bg-slate-100 text-slate-500 border-slate-200',
  learning:    'bg-blue-50 text-blue-700 border-blue-200',
  familiar:    'bg-amber-50 text-amber-700 border-amber-200',
  strong:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  mastered:    'bg-purple-50 text-purple-700 border-purple-200',
};

export const CHAPTER_LABELS: Record<ChapterType, string> = {
  basic_idea:   'Chapter 1 — Basic Idea',
  development:  'Chapter 2 — Development',
  main_line:    'Chapter 3 — Main Line',
  responses:    'Chapter 4 — Responses',
  tactics:      'Chapter 5 — Tactical Ideas',
  mistakes:     'Chapter 6 — Common Mistakes',
  practice:     'Chapter 7 — Practice',
  test:         'Chapter 8 — Final Test',
};

export const CHAPTER_ICONS: Record<ChapterType, string> = {
  basic_idea:   '💡',
  development:  '♟️',
  main_line:    '📍',
  responses:    '🔄',
  tactics:      '⚔️',
  mistakes:     '⚠️',
  practice:     '🎯',
  test:         '📝',
};

export const START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
