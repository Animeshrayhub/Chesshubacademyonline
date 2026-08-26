export type StudentColor = 'white' | 'black' | 'random';
export type TimeControlOption = 'unlimited' | '10+0' | '10+5' | '15+10' | '5+0';
export type GameResult = 'win' | 'loss' | 'draw' | 'in_progress';
export type GameTermination = 
  | 'checkmate'
  | 'stalemate'
  | 'resignation'
  | 'draw_agreement'
  | 'timeout'
  | 'repetition'
  | 'insufficient_material'
  | '50_move'
  | 'abandonment'
  | 'in_progress';

export type WeaknessStatus = 'NEEDS_PRACTICE' | 'IMPROVING' | 'STRONG' | 'MASTERED';
export type MistakeType = 'blunder' | 'mistake' | 'inaccuracy' | 'missed_opportunity';
export type MistakeSeverity = 'high' | 'medium' | 'low';

export interface BotLevelConfig {
  level: number;
  rating: number;
  name: string;
  description: string;
  depth: number;
  skillLevel: number;
  avatarIcon: string;
}

export interface StudentBotProfile {
  id: string;
  student_id: string;
  rating: number;
  highest_rating: number;
  current_level: number;
  unlocked_levels: number[];
  coach_unlocked_levels: number[];
  games_played: number;
  wins: number;
  losses: number;
  draws: number;
  win_streak: number;
  highest_win_streak: number;
  puzzles_solved: number;
  created_at: string;
  updated_at: string;
}

export interface BotGameRecord {
  id: string;
  student_id: string;
  bot_level: number;
  bot_rating: number;
  student_color: 'white' | 'black';
  time_control: TimeControlOption;
  status: 'in_progress' | 'completed' | 'abandoned';
  result: GameResult;
  termination: GameTermination;
  started_at: string;
  ended_at?: string;
  reconnect_deadline?: string;
  initial_fen: string;
  final_fen?: string;
  pgn?: string;
  move_count: number;
  student_rating_before: number;
  rating_change: number;
  student_rating_after: number;
  analysis_status: 'pending' | 'analyzing' | 'completed' | 'failed';
  analysis_summary?: GameAnalysisSummary;
  created_at: string;
}

export interface RatingHistoryEntry {
  id: string;
  student_id: string;
  game_id: string;
  before_rating: number;
  result: GameResult;
  rating_change: number;
  after_rating: number;
  bot_level: number;
  bot_rating: number;
  created_at: string;
}

export interface AnalyzedMistake {
  id: string;
  student_id: string;
  game_id: string;
  move_number: number;
  fen_before: string;
  fen_after: string;
  played_move: string;
  best_move: string;
  evaluation_before: string;
  evaluation_after: string;
  evaluation_drop: number;
  mistake_type: MistakeType;
  severity: MistakeSeverity;
  theme: string;
  explanation: string;
  better_idea?: string;
  created_at: string;
}

export interface StudentWeakness {
  id: string;
  student_id: string;
  weakness_type: string;
  occurrences: number;
  recent_occurrences: number;
  severity: MistakeSeverity;
  confidence: number;
  last_seen: string;
  last_practiced?: string;
  puzzles_generated: number;
  puzzles_completed: number;
  puzzles_correct: number;
  status: WeaknessStatus;
  created_at: string;
  updated_at: string;
}

export interface PersonalizedPuzzle {
  id: string;
  student_id: string;
  source_game_id?: string;
  source_mistake_id?: string;
  weakness_type: string;
  fen: string;
  side_to_move: 'white' | 'black';
  solution: string;
  explanation: string;
  title: string;
  difficulty: number;
  status: 'active' | 'solved' | 'failed' | 'archived';
  attempts: number;
  correct_attempts: number;
  last_attempted?: string;
  created_at: string;
}

export interface StudentBadge {
  id: string;
  student_id: string;
  badge_key: string;
  title: string;
  description: string;
  icon: string;
  awarded_at: string;
}

export interface GameAnalysisSummary {
  accuracy: number;
  blunders: number;
  mistakes: number;
  inaccuracies: number;
  missedOpportunities: number;
  keyMoments: AnalyzedMistake[];
  recommendedPuzzles: PersonalizedPuzzle[];
}
