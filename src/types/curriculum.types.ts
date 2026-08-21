export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
export type BoardOrientation = 'white' | 'black';
export type BoardControlMode = 'COACH_ONLY' | 'ONE_STUDENT' | 'SELECTED_STUDENTS' | 'EVERYONE';

export interface TeachingTag {
  id: string;
  name: string;
  color?: string;
  createdAt?: string;
}

export interface TeachingPosition {
  id: string;
  lessonId: string;
  positionNumber?: number;
  title: string;
  description?: string;
  chapterTitle?: string;
  fen: string;
  solution?: string;
  alternativeSolution?: string;
  hint?: string;
  explanation?: string;
  difficulty: DifficultyLevel;
  theme?: string;
  tags: string[];
  boardOrientation: BoardOrientation;
  defaultBoardLock: boolean;
  stockfishEval?: string;
  coachNotes?: string;
  notes?: string;
  orderNumber: number;
  isArchived?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LessonMedia {
  id: string;
  lessonId: string;
  type: 'pdf' | 'video' | 'image';
  title: string;
  url: string;
  sizeBytes?: number;
  createdAt: string;
}

export interface CurriculumLesson {
  id: string;
  chapterId: string;
  title: string;
  description?: string;
  objectives?: string;
  coachNotes?: string;
  estimatedDuration: number; // minutes
  difficulty: DifficultyLevel;
  tags: string[];
  orderNumber: number;
  isArchived?: boolean;
  version?: number;
  positionsCount?: number;
  positions?: TeachingPosition[];
  media?: LessonMedia[];
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumChapter {
  id: string;
  courseId: string;
  title: string;
  description?: string;
  orderNumber: number;
  isArchived?: boolean;
  lessonsCount?: number;
  lessons?: CurriculumLesson[];
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumCourse {
  id: string;
  programId: string;
  title: string;
  description?: string;
  orderNumber: number;
  isArchived?: boolean;
  chaptersCount?: number;
  chapters?: CurriculumChapter[];
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumProgram {
  id: string;
  title: string;
  description?: string;
  targetLevel: DifficultyLevel;
  orderNumber: number;
  isArchived?: boolean;
  version?: number;
  coursesCount?: number;
  courses?: CurriculumCourse[];
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumVersionHistory {
  id: string;
  entityType: 'program' | 'course' | 'chapter' | 'lesson' | 'position';
  entityId: string;
  version: number;
  snapshot: any;
  changedBy?: string;
  createdAt: string;
}

export interface ScoringRules {
  wrongMovePenalty: number;   // default -5
  illegalMovePenalty: number; // default -2
  hintUsedPenalty: number;    // default -10
  solutionViewedPenalty: number; // default 0
}

export interface ClassroomTeachingSession {
  id: string;
  classId: string;
  lessonId?: string;
  currentPositionIndex: number;
  boardControlMode: BoardControlMode;
  practiceMode: boolean;
  attemptLimit: number;
  timerSeconds: number;
  scoringRules: ScoringRules;
  savedState?: any;
  endedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentClassroomAttempt {
  id: string;
  sessionId: string;
  positionId: string;
  studentId: string;
  studentName?: string;
  moves: string[];
  currentFen?: string;
  status: 'thinking' | 'solved' | 'failed';
  attemptsCount: number;
  hintsUsed: number;
  solutionViewed: boolean;
  timeTakenSeconds: number;
  score: number;
  accuracy: number;
  createdAt: string;
  updatedAt: string;
}
