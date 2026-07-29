import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type {
  CurriculumProgram,
  CurriculumCourse,
  CurriculumChapter,
  CurriculumLesson,
  TeachingPosition,
  LessonMedia,
} from '@/types/curriculum.types';

// In-memory fallback dataset for smooth instant rendering & mock client support
let mockPrograms: CurriculumProgram[] = [
  {
    id: 'prog-1',
    title: 'Grandmaster Tactical Foundations',
    description: 'Master essential tactical patterns: forks, pins, skewers, and checkmate motifs.',
    targetLevel: 'Beginner',
    orderNumber: 1,
    coursesCount: 2,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    courses: [
      {
        id: 'crs-1',
        programId: 'prog-1',
        title: 'Tactical Motifs Level 1',
        description: 'Basic forks, pins, and back-rank checkmates.',
        orderNumber: 1,
        chaptersCount: 2,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: [
          {
            id: 'chp-1',
            courseId: 'crs-1',
            title: 'Chapter 1: The Knight Fork',
            description: 'Learn to exploit the unique L-shape geometry of the knight.',
            orderNumber: 1,
            lessonsCount: 2,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lessons: [
              {
                id: 'les-1',
                chapterId: 'chp-1',
                title: 'Lesson 1.1: King & Queen Royal Forks',
                description: 'Forking king and queen simultaneously on c7/f7.',
                orderNumber: 1,
                positionsCount: 3,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                positions: [
                  {
                    id: 'pos-1',
                    lessonId: 'les-1',
                    title: 'Classic c7 Royal Fork Sacrifice',
                    fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/4n3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4',
                    solution: 'Nxe5 Nxe5 d4',
                    hint: 'Look for the centralized knight fork on c7!',
                    explanation: 'By sacrificing the central knight, White creates a winning double attack on queen and rook.',
                    difficulty: 'Beginner',
                    tags: ['Fork', 'Knight', 'Tactics'],
                    orderNumber: 1,
                    boardOrientation: 'white',
                    defaultBoardLock: true,
                    notes: 'Emphasize controlling c7 square before jumping with Knight.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  {
                    id: 'pos-2',
                    lessonId: 'les-1',
                    title: 'Back-Rank Mate Threat & Fork',
                    fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
                    solution: 'Rb8#',
                    hint: 'The opponent king has no escape squares on the 8th rank.',
                    explanation: 'Classic back-rank checkmate because Black pawns block their own king.',
                    difficulty: 'Beginner',
                    tags: ['Back-Rank', 'Checkmate'],
                    orderNumber: 2,
                    boardOrientation: 'white',
                    defaultBoardLock: false,
                    notes: 'Show students the difference between back-rank checkmate and queen pin.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                  {
                    id: 'pos-3',
                    lessonId: 'les-1',
                    title: 'Pin & Sacrifice on h7',
                    fen: 'r2q1rk1/ppp2ppp/2n5/3p4/3P4/2PB1Q2/P1P2PPP/R4RK1 w - - 0 1',
                    solution: 'Bxh7+ Kxh7 Qh5+ Kg8',
                    hint: 'Sacrifice the bishop on h7 to tear open the black king castle!',
                    explanation: 'The Greek Gift Sacrifice opening the h-file for a fatal queen attack.',
                    difficulty: 'Intermediate',
                    tags: ['Greek Gift', 'Sacrifice', 'Attacking King'],
                    orderNumber: 3,
                    boardOrientation: 'white',
                    defaultBoardLock: true,
                    notes: 'Ensure students calculate Black knight defending f6.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'prog-2',
    title: 'Master Opening Repertoire',
    description: 'Deep opening theory: Ruy Lopez, Italian Game, and Sicilian Defense.',
    targetLevel: 'Intermediate',
    orderNumber: 2,
    coursesCount: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    courses: [
      {
        id: 'crs-2',
        programId: 'prog-2',
        title: 'Ruy Lopez Championship Lines',
        description: 'Classical lines for White against e5.',
        orderNumber: 1,
        chaptersCount: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        chapters: [
          {
            id: 'chp-2',
            courseId: 'crs-2',
            title: 'Chapter 1: Main Line Morphy Defense',
            description: '3. Bb5 a6 4. Ba4 Nf6 5. O-O',
            orderNumber: 1,
            lessonsCount: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            lessons: [
              {
                id: 'les-2',
                chapterId: 'chp-2',
                title: 'Lesson 1.1: Controlling the Central Pawn Structure',
                description: 'Using c3 and d4 to establish central pawn dominance.',
                orderNumber: 1,
                positionsCount: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                positions: [
                  {
                    id: 'pos-4',
                    lessonId: 'les-2',
                    title: 'Ruy Lopez Main Line Setup',
                    fen: 'r1bqkb1r/1ppp1ppp/p1n2n2/4p3/B3P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 2 4',
                    solution: 'O-O Be7 Re1 b5 Bb3 d6 c3',
                    hint: 'Castle early and prepare the c3-d4 pawn push.',
                    explanation: 'White secures the king and prepares to contest the center with d4.',
                    difficulty: 'Intermediate',
                    tags: ['Ruy Lopez', 'Opening Theory'],
                    orderNumber: 1,
                    boardOrientation: 'white',
                    defaultBoardLock: true,
                    notes: 'Explain why d4 is delayed until c3 and Re1 are played.',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

/**
 * Returns full curriculum hierarchy (Programs -> Courses -> Chapters -> Lessons -> Positions).
 */
export async function getCurriculumHierarchy(): Promise<CurriculumProgram[]> {
  try {
    const admin = createSupabaseAdmin();
    const { data: dbPrograms, error } = await admin
      .from('curriculum_programs')
      .select('*, courses:curriculum_courses(*, chapters:curriculum_chapters(*, lessons:curriculum_lessons(*, positions:teaching_positions(*)))))')
      .order('order_number', { ascending: true });

    if (!error && dbPrograms && dbPrograms.length > 0) {
      return dbPrograms.map((p: any) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        targetLevel: p.target_level || 'Beginner',
        orderNumber: p.order_number || 1,
        coursesCount: p.courses?.length || 0,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        courses: (p.courses || []).map((c: any) => ({
          id: c.id,
          programId: c.program_id,
          title: c.title,
          description: c.description,
          orderNumber: c.order_number || 1,
          chaptersCount: c.chapters?.length || 0,
          createdAt: c.created_at,
          updatedAt: c.updated_at,
          chapters: (c.chapters || []).map((ch: any) => ({
            id: ch.id,
            courseId: ch.course_id,
            title: ch.title,
            description: ch.description,
            orderNumber: ch.order_number || 1,
            lessonsCount: ch.lessons?.length || 0,
            createdAt: ch.created_at,
            updatedAt: ch.updated_at,
            lessons: (ch.lessons || []).map((les: any) => ({
              id: les.id,
              chapterId: les.chapter_id,
              title: les.title,
              description: les.description,
              orderNumber: les.order_number || 1,
              positionsCount: les.positions?.length || 0,
              createdAt: les.created_at,
              updatedAt: les.updated_at,
              positions: (les.positions || []).map((pos: any) => ({
                id: pos.id,
                lessonId: pos.lesson_id,
                title: pos.title,
                fen: pos.fen,
                solution: pos.solution,
                hint: pos.hint,
                explanation: pos.explanation,
                difficulty: pos.difficulty || 'Beginner',
                tags: pos.tags || [],
                orderNumber: pos.order_number || 1,
                boardOrientation: pos.board_orientation || 'white',
                defaultBoardLock: pos.default_board_lock ?? true,
                notes: pos.notes,
                createdAt: pos.created_at,
                updatedAt: pos.updated_at,
              })),
            })),
          })),
        })),
      }));
    }
  } catch (e) {
    console.warn('[curriculumService] Supabase fallback to mock dataset:', e);
  }

  return mockPrograms;
}

/**
 * Creates a new Program.
 */
export async function createProgram(data: Partial<CurriculumProgram>): Promise<CurriculumProgram> {
  const newProgram: CurriculumProgram = {
    id: `prog-${Date.now()}`,
    title: data.title || 'New Program Track',
    description: data.description || '',
    targetLevel: data.targetLevel || 'Beginner',
    orderNumber: mockPrograms.length + 1,
    coursesCount: 0,
    courses: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  mockPrograms.push(newProgram);
  return newProgram;
}

/**
 * Creates a new Course inside a Program.
 */
export async function createCourse(programId: string, data: Partial<CurriculumCourse>): Promise<CurriculumCourse> {
  const program = mockPrograms.find((p) => p.id === programId);
  const newCourse: CurriculumCourse = {
    id: `crs-${Date.now()}`,
    programId,
    title: data.title || 'New Course',
    description: data.description || '',
    orderNumber: (program?.courses?.length || 0) + 1,
    chaptersCount: 0,
    chapters: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (program) {
    if (!program.courses) program.courses = [];
    program.courses.push(newCourse);
    program.coursesCount = program.courses.length;
  }

  return newCourse;
}

/**
 * Creates a new Chapter inside a Course.
 */
export async function createChapter(courseId: string, data: Partial<CurriculumChapter>): Promise<CurriculumChapter> {
  let targetCourse: CurriculumCourse | undefined;
  for (const p of mockPrograms) {
    const found = p.courses?.find((c) => c.id === courseId);
    if (found) {
      targetCourse = found;
      break;
    }
  }

  const newChapter: CurriculumChapter = {
    id: `chp-${Date.now()}`,
    courseId,
    title: data.title || 'New Chapter',
    description: data.description || '',
    orderNumber: (targetCourse?.chapters?.length || 0) + 1,
    lessonsCount: 0,
    lessons: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (targetCourse) {
    if (!targetCourse.chapters) targetCourse.chapters = [];
    targetCourse.chapters.push(newChapter);
    targetCourse.chaptersCount = targetCourse.chapters.length;
  }

  return newChapter;
}

/**
 * Creates a new Lesson inside a Chapter.
 */
export async function createLesson(chapterId: string, data: Partial<CurriculumLesson>): Promise<CurriculumLesson> {
  let targetChapter: CurriculumChapter | undefined;
  for (const p of mockPrograms) {
    for (const c of p.courses || []) {
      const found = c.chapters?.find((ch) => ch.id === chapterId);
      if (found) {
        targetChapter = found;
        break;
      }
    }
  }

  const newLesson: CurriculumLesson = {
    id: `les-${Date.now()}`,
    chapterId,
    title: data.title || 'New Lesson',
    description: data.description || '',
    orderNumber: (targetChapter?.lessons?.length || 0) + 1,
    positionsCount: 0,
    positions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (targetChapter) {
    if (!targetChapter.lessons) targetChapter.lessons = [];
    targetChapter.lessons.push(newLesson);
    targetChapter.lessonsCount = targetChapter.lessons.length;
  }

  return newLesson;
}

/**
 * Creates or updates a Teaching Position in a Lesson.
 */
export async function saveTeachingPosition(lessonId: string, positionData: Partial<TeachingPosition>): Promise<TeachingPosition> {
  let targetLesson: CurriculumLesson | undefined;
  for (const p of mockPrograms) {
    for (const c of p.courses || []) {
      for (const ch of c.chapters || []) {
        const found = ch.lessons?.find((l) => l.id === lessonId);
        if (found) {
          targetLesson = found;
          break;
        }
      }
    }
  }

  if (!targetLesson) {
    throw new Error('Lesson not found');
  }

  if (!targetLesson.positions) targetLesson.positions = [];

  const existingIdx = targetLesson.positions.findIndex((pos) => pos.id === positionData.id);

  const updatedPos: TeachingPosition = {
    id: positionData.id || `pos-${Date.now()}`,
    lessonId,
    title: positionData.title || 'Teaching Position',
    fen: positionData.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    solution: positionData.solution || '',
    hint: positionData.hint || '',
    explanation: positionData.explanation || '',
    difficulty: positionData.difficulty || 'Beginner',
    tags: positionData.tags || ['Tactics'],
    orderNumber: positionData.orderNumber || targetLesson.positions.length + 1,
    boardOrientation: positionData.boardOrientation || 'white',
    defaultBoardLock: positionData.defaultBoardLock ?? true,
    notes: positionData.notes || '',
    createdAt: positionData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    targetLesson.positions[existingIdx] = updatedPos;
  } else {
    targetLesson.positions.push(updatedPos);
  }

  targetLesson.positionsCount = targetLesson.positions.length;
  return updatedPos;
}

/**
 * Duplicates a Lesson with all its Teaching Positions.
 */
export async function duplicateLesson(lessonId: string): Promise<CurriculumLesson> {
  let sourceLesson: CurriculumLesson | undefined;
  let parentChapter: CurriculumChapter | undefined;

  for (const p of mockPrograms) {
    for (const c of p.courses || []) {
      for (const ch of c.chapters || []) {
        const found = ch.lessons?.find((l) => l.id === lessonId);
        if (found) {
          sourceLesson = found;
          parentChapter = ch;
          break;
        }
      }
    }
  }

  if (!sourceLesson || !parentChapter) {
    throw new Error('Source lesson not found for duplication.');
  }

  const duplicatedLesson: CurriculumLesson = {
    id: `les-${Date.now()}`,
    chapterId: sourceLesson.chapterId,
    title: `${sourceLesson.title} (Copy)`,
    description: sourceLesson.description,
    orderNumber: (parentChapter.lessons?.length || 0) + 1,
    positionsCount: sourceLesson.positions?.length || 0,
    positions: (sourceLesson.positions || []).map((pos, idx) => ({
      ...pos,
      id: `pos-${Date.now()}-${idx}`,
      lessonId: `les-${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (!parentChapter.lessons) parentChapter.lessons = [];
  parentChapter.lessons.push(duplicatedLesson);
  parentChapter.lessonsCount = parentChapter.lessons.length;

  return duplicatedLesson;
}

/**
 * Reorders positions in a lesson.
 */
export async function reorderTeachingPositions(lessonId: string, positionIds: string[]): Promise<boolean> {
  let targetLesson: CurriculumLesson | undefined;
  for (const p of mockPrograms) {
    for (const c of p.courses || []) {
      for (const ch of c.chapters || []) {
        const found = ch.lessons?.find((l) => l.id === lessonId);
        if (found) {
          targetLesson = found;
          break;
        }
      }
    }
  }

  if (targetLesson && targetLesson.positions) {
    const posMap = new Map(targetLesson.positions.map((p) => [p.id, p]));
    const reordered: TeachingPosition[] = [];
    positionIds.forEach((id, idx) => {
      const pos = posMap.get(id);
      if (pos) {
        pos.orderNumber = idx + 1;
        reordered.push(pos);
      }
    });
    targetLesson.positions = reordered;
    return true;
  }
  return false;
}
