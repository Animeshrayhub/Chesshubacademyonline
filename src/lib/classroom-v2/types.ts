/**
 * Classroom V2 Canonical Type Definitions
 * Single Source of Truth for State, Roles, Events, and Payloads.
 */

export type UserRole = 'admin' | 'coach' | 'student';

export type ClassroomMode = 'NORMAL_GAME' | 'PUZZLE' | 'CURRICULUM' | 'ANALYSIS';

export type BoardOrientation = 'white' | 'black';

export type QuizStatus = 'draft' | 'active' | 'closed' | 'revealed' | 'ended';

export interface MoveData {
  moveNumber: number;
  san: string;
  from: string;
  to: string;
  piece?: string;
  color: 'w' | 'b';
  promotion?: string;
  fenAfter: string;
  uci?: string;
  playedBy: string; // user id
  timestamp: string;
}

export interface BoardArrow {
  from: string;
  to: string;
  color?: string; // Hex or CSS color
}

export interface BoardHighlight {
  square: string;
  color?: string; // Hex or CSS color
}

export interface CanonicalBoardState {
  fen: string;
  initialFen: string;
  moves: MoveData[];
  pgn: string;
  currentMoveIndex: number;
  sideToMove: 'w' | 'b';
  orientation: BoardOrientation;
  mode: ClassroomMode;
  isBoardLocked: boolean;
  allowIllegalMoves: boolean;
  arrows: BoardArrow[];
  highlights: BoardHighlight[];
}

export interface CanonicalPuzzleState {
  puzzleId: string;
  title: string;
  fen: string;
  solution: string[]; // UCI or SAN moves in sequence
  moveIndex: number; // current progress along solution
  sideToMove: 'w' | 'b';
  status: 'unsolved' | 'solving' | 'solved' | 'failed';
  instructions?: string;
}

export interface CanonicalGameState {
  gameId: string;
  whiteName: string;
  blackName: string;
  result: string;
  pgn: string;
  initialFen: string;
  moves: MoveData[];
  currentMoveIndex: number;
}

export interface CanonicalCurriculumState {
  chapterId: string;
  chapterTitle: string;
  topic: string;
  content?: string;
  currentFen: string;
  moves: string[];
}

export interface PermissionsState {
  coachId: string;
  boardControllers: string[]; // List of userIds allowed to move (supports 1-to-1 and future group)
  isBoardLocked: boolean;
}

export interface CoachQuestion {
  id: string;
  text: string;
  type:
    | 'Best Move'
    | 'Find the Threat'
    | 'What is Wrong?'
    | 'Which Piece?'
    | 'Calculate'
    | 'Explain Your Move'
    | 'Custom Question';
  sentAt: string;
}

export interface PuzzleAttemptResult {
  puzzleId: string;
  studentId: string;
  solved: boolean;
  attempts: number;
  timestamp: string;
}

export interface QuizQuestionOption {
  text: string;
}

export interface ClassroomQuizState {
  quizId: string;
  status: QuizStatus;
  question: string;
  options: string[];
  correctIndex: number | null; // Scrubbed server-side for students until revealed!
  explanation: string | null;
  startedAt: string;
  totalSubmissions?: number;
}

export interface ClassroomSnapshot {
  classId: string;
  sessionId: string;
  className: string;
  coachName: string;
  scheduledStart: string;
  startedAt: string | null;
  durationMinutes: number;
  status: 'scheduled' | 'active' | 'ended';
  isLive: boolean;
  version: number;
  board: CanonicalBoardState;
  puzzle: CanonicalPuzzleState | null;
  game: CanonicalGameState | null;
  curriculum: CanonicalCurriculumState | null;
  quiz: ClassroomQuizState | null;
  permissions: PermissionsState;
  /** Active coach question broadcast to all students */
  activeQuestion: CoachQuestion | null;
  updatedAt: string;
}

export interface ParticipantInfo {
  userId: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isOnline: boolean;
  hasBoardControl: boolean;
  raisedHand: boolean;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  senderId: string;
  senderName: string;
  senderRole: UserRole;
  message: string;
  isPrivate: boolean;
  recipientId?: string;
  createdAt: string;
}

export interface StudentResponseItem {
  id: string;
  sessionId: string;
  studentId: string;
  studentName: string;
  prompt: string;
  response: string;
  createdAt: string;
}

export interface ClassroomBookmark {
  id: string;
  classId: string;
  sessionId: string;
  createdBy: string;
  fen: string;
  moveIndex: number;
  note: string;
  createdAt: string;
}

export interface ClassroomTimelineEvent {
  id: string;
  classId: string;
  sessionId: string;
  eventType:
    | 'CLASS_STARTED'
    | 'GAME_LOADED'
    | 'PUZZLE_STARTED'
    | 'PUZZLE_SOLVED'
    | 'CURRICULUM_LOADED'
    | 'BOOKMARK_CREATED'
    | 'QUIZ_STARTED'
    | 'RESPONSE_CREATED'
    | 'CLASS_ENDED';
  metadata: Record<string, any>;
  createdAt: string;
}
