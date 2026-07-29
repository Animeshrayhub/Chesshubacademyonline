export interface TeachingPosition {
  id: string;
  lessonId: string;
  title: string;
  fen: string;
  solution?: string;
  hint?: string;
  explanation?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  tags: string[];
  orderNumber: number;
  boardOrientation: 'white' | 'black';
  defaultBoardLock: boolean;
  notes?: string;
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
  orderNumber: number;
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
  chaptersCount?: number;
  chapters?: CurriculumChapter[];
  createdAt: string;
  updatedAt: string;
}

export interface CurriculumProgram {
  id: string;
  title: string;
  description?: string;
  targetLevel: 'Beginner' | 'Intermediate' | 'Advanced' | 'Master';
  orderNumber: number;
  coursesCount?: number;
  courses?: CurriculumCourse[];
  createdAt: string;
  updatedAt: string;
}
