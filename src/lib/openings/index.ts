// ─────────────────────────────────────────────────────────────────────────────
// ChessHub AI Opening Teacher — Supabase Library Layer
// Server-side only. Never import in client components.
// ─────────────────────────────────────────────────────────────────────────────

import { createSupabaseServer } from '@/lib/supabase/server';
import type {
  DbOpening,
  DbOpeningChapter,
  DbOpeningPosition,
  DbStudentOpeningProgress,
  DbStudentChapterProgress,
  DbStudentOpeningMistake,
  DbStudentOpeningScores,
  OpeningWithProgress,
  OpeningChapterWithProgress,
  MasteryLevel,
  MistakeType,
  OpeningDifficulty,
} from '@/types/opening-teacher';

// Re-export helper
export { getMasteryLevel } from '@/types/opening-teacher';


// ─────────────────────────────────────────────────────────────────────────────
// READING OPENING CATALOGUE
// ─────────────────────────────────────────────────────────────────────────────

/** List all published openings (no progress — public catalogue view) */
export async function listOpenings(difficulty?: OpeningDifficulty) {
  const supabase = createSupabaseServer();
  let query = supabase
    .from('openings')
    .select('*')
    .eq('is_published', true)
    .order('order_num');

  if (difficulty) {
    query = query.eq('difficulty', difficulty);
  }

  const { data, error } = await query;
  if (error) {
    console.error('[listOpenings]', error.message);
    return { success: false, error: error.message, data: [] as DbOpening[] };
  }
  return { success: true, data: (data ?? []) as DbOpening[] };
}

/** Get a single opening by ID */
export async function getOpeningById(openingId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('openings')
    .select('*')
    .eq('id', openingId)
    .eq('is_published', true)
    .single();

  if (error) {
    return { success: false, error: error.message, data: null };
  }
  return { success: true, data: data as DbOpening };
}

/** List all chapters for an opening */
export async function getOpeningChapters(openingId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('opening_chapters')
    .select('*')
    .eq('opening_id', openingId)
    .eq('is_published', true)
    .order('chapter_num');

  if (error) {
    return { success: false, error: error.message, data: [] as DbOpeningChapter[] };
  }
  return { success: true, data: (data ?? []) as DbOpeningChapter[] };
}

/** Get a single chapter by opening ID + chapter number */
export async function getOpeningChapter(openingId: string, chapterNum: number) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('opening_chapters')
    .select('*')
    .eq('opening_id', openingId)
    .eq('chapter_num', chapterNum)
    .eq('is_published', true)
    .single();

  if (error) {
    return { success: false, error: error.message, data: null };
  }
  return { success: true, data: data as DbOpeningChapter };
}

/** Get positions for a chapter */
export async function getChapterPositions(chapterId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('opening_positions')
    .select('*')
    .eq('chapter_id', chapterId)
    .eq('is_archived', false)
    .order('order_num');

  if (error) {
    return { success: false, error: error.message, data: [] as DbOpeningPosition[] };
  }
  return { success: true, data: (data ?? []) as DbOpeningPosition[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT PROGRESS READING
// ─────────────────────────────────────────────────────────────────────────────

/** Get student's progress for all openings */
export async function getStudentOpeningProgressAll(studentId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('student_opening_progress')
    .select('*')
    .eq('student_id', studentId);

  if (error) {
    return { success: false, error: error.message, data: [] as DbStudentOpeningProgress[] };
  }
  return { success: true, data: (data ?? []) as DbStudentOpeningProgress[] };
}

/** Get student's progress for a specific opening */
export async function getStudentOpeningProgress(studentId: string, openingId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('student_opening_progress')
    .select('*')
    .eq('student_id', studentId)
    .eq('opening_id', openingId)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message, data: null };
  }
  return { success: true, data: data as DbStudentOpeningProgress | null };
}

/** Get student's chapter progress for an opening */
export async function getStudentChapterProgressAll(studentId: string, openingId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('student_chapter_progress')
    .select('*')
    .eq('student_id', studentId)
    .eq('opening_id', openingId);

  if (error) {
    return { success: false, error: error.message, data: [] as DbStudentChapterProgress[] };
  }
  return { success: true, data: (data ?? []) as DbStudentChapterProgress[] };
}

/** Get student's chapter progress for a specific chapter */
export async function getStudentChapterProgress(studentId: string, chapterId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('student_chapter_progress')
    .select('*')
    .eq('student_id', studentId)
    .eq('chapter_id', chapterId)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message, data: null };
  }
  return { success: true, data: data as DbStudentChapterProgress | null };
}

/** Get student's opening score */
export async function getStudentOpeningScores(studentId: string, openingId: string) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('student_opening_scores')
    .select('*')
    .eq('student_id', studentId)
    .eq('opening_id', openingId)
    .maybeSingle();

  if (error) {
    return { success: false, error: error.message, data: null };
  }
  return { success: true, data: data as DbStudentOpeningScores | null };
}

/** Get student's mistakes for an opening (for revision) */
export async function getStudentMistakes(
  studentId: string,
  openingId?: string,
  resolved?: boolean
) {
  const supabase = createSupabaseServer();
  let query = supabase
    .from('student_opening_mistakes')
    .select('*')
    .eq('student_id', studentId)
    .order('attempt_count', { ascending: false });

  if (openingId) query = query.eq('opening_id', openingId);
  if (resolved !== undefined) query = query.eq('is_resolved', resolved);

  const { data, error } = await query.limit(20);

  if (error) {
    return { success: false, error: error.message, data: [] as DbStudentOpeningMistake[] };
  }
  return { success: true, data: (data ?? []) as DbStudentOpeningMistake[] };
}

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATED VIEWS (for opening library page)
// ─────────────────────────────────────────────────────────────────────────────

/** Get all openings with student progress attached */
export async function getOpeningsWithProgress(studentId: string): Promise<{
  success: boolean;
  data: OpeningWithProgress[];
  error?: string;
}> {
  const [openingsRes, progressRes, scoresRes] = await Promise.all([
    listOpenings(),
    getStudentOpeningProgressAll(studentId),
    // Get scores for all openings at once
    (async () => {
      const supabase = createSupabaseServer();
      const { data } = await supabase
        .from('student_opening_scores')
        .select('*')
        .eq('student_id', studentId);
      return data ?? [];
    })(),
  ]);

  if (!openingsRes.success) {
    return { success: false, error: openingsRes.error, data: [] };
  }

  const progressMap = new Map(
    progressRes.data.map(p => [p.opening_id, p])
  );
  const scoresMap = new Map(
    (scoresRes as DbStudentOpeningScores[]).map(s => [s.opening_id, s])
  );

  const withProgress: OpeningWithProgress[] = openingsRes.data.map(op => ({
    ...op,
    progress: progressMap.get(op.id) ?? null,
    scores: scoresMap.get(op.id) ?? null,
  }));

  return { success: true, data: withProgress };
}

/** Get a single opening with all chapters + student progress */
export async function getOpeningDetail(openingId: string, studentId: string) {
  const [openingRes, chaptersRes, progressRes, chapterProgressRes, scoresRes] =
    await Promise.all([
      getOpeningById(openingId),
      getOpeningChapters(openingId),
      getStudentOpeningProgress(studentId, openingId),
      getStudentChapterProgressAll(studentId, openingId),
      getStudentOpeningScores(studentId, openingId),
    ]);

  if (!openingRes.success || !openingRes.data) {
    return { success: false, error: 'Opening not found', data: null };
  }

  const chapterProgressMap = new Map(
    chapterProgressRes.data.map(cp => [cp.chapter_id, cp])
  );

  const chaptersWithProgress: OpeningChapterWithProgress[] =
    chaptersRes.data.map(ch => ({
      ...ch,
      progress: chapterProgressMap.get(ch.id) ?? null,
    }));

  return {
    success: true,
    data: {
      ...openingRes.data,
      progress: progressRes.data,
      scores: scoresRes.data,
      chapters: chaptersWithProgress,
    } as OpeningWithProgress,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// STUDENT PROGRESS WRITING
// ─────────────────────────────────────────────────────────────────────────────

/** Initialize or update opening-level progress */
export async function upsertOpeningProgress(
  studentId: string,
  openingId: string,
  updates: Partial<DbStudentOpeningProgress>
) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('student_opening_progress')
    .upsert(
      {
        student_id: studentId,
        opening_id: openingId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,opening_id' }
    )
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true, data };
}

/** Initialize or update chapter-level progress */
export async function upsertChapterProgress(
  studentId: string,
  chapterId: string,
  openingId: string,
  updates: Partial<DbStudentChapterProgress>
) {
  const supabase = createSupabaseServer();
  const { data, error } = await supabase
    .from('student_chapter_progress')
    .upsert(
      {
        student_id: studentId,
        chapter_id: chapterId,
        opening_id: openingId,
        ...updates,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,chapter_id' }
    )
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // After updating chapter, check if we should unlock next chapter
  if (updates.status === 'completed' && updates.score !== undefined) {
    await maybeUnlockNextChapter(studentId, openingId, chapterId, updates.score);
  }

  return { success: true, data };
}

/** Unlock the next chapter if score threshold is met */
async function maybeUnlockNextChapter(
  studentId: string,
  openingId: string,
  completedChapterId: string,
  score: number
) {
  const supabase = createSupabaseServer();

  // Get the completed chapter's number
  const { data: completedChapter } = await supabase
    .from('opening_chapters')
    .select('chapter_num, unlock_threshold')
    .eq('id', completedChapterId)
    .single();

  if (!completedChapter) return;

  // Check if score meets threshold
  if (score < completedChapter.unlock_threshold) return;

  // Get the next chapter
  const nextChapterNum = completedChapter.chapter_num + 1;
  if (nextChapterNum > 8) return; // Already the last chapter

  const { data: nextChapter } = await supabase
    .from('opening_chapters')
    .select('id')
    .eq('opening_id', openingId)
    .eq('chapter_num', nextChapterNum)
    .single();

  if (!nextChapter) return;

  // Unlock the next chapter
  await supabase
    .from('student_chapter_progress')
    .upsert(
      {
        student_id: studentId,
        chapter_id: nextChapter.id,
        opening_id: openingId,
        is_unlocked: true,
        status: 'unlocked',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,chapter_id' }
    );
}

/** Record a student mistake */
export async function recordMistake(
  studentId: string,
  openingId: string,
  chapterId: string | null,
  positionId: string | null,
  positionFen: string,
  studentMove: string,
  expectedMove: string,
  mistakeType: MistakeType,
  evalDiff?: number
) {
  const supabase = createSupabaseServer();

  // Check if this exact mistake already exists (same FEN + student move)
  const { data: existing } = await supabase
    .from('student_opening_mistakes')
    .select('id, attempt_count')
    .eq('student_id', studentId)
    .eq('opening_id', openingId)
    .eq('position_fen', positionFen)
    .eq('student_move', studentMove)
    .maybeSingle();

  if (existing) {
    // Increment attempt count
    const { error } = await supabase
      .from('student_opening_mistakes')
      .update({
        attempt_count: existing.attempt_count + 1,
        last_attempted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        eval_difference: evalDiff ?? null,
      })
      .eq('id', existing.id);

    return { success: !error, error: error?.message };
  }

  // Insert new mistake
  const { error } = await supabase.from('student_opening_mistakes').insert({
    student_id: studentId,
    opening_id: openingId,
    chapter_id: chapterId,
    position_id: positionId,
    position_fen: positionFen,
    student_move: studentMove,
    expected_move: expectedMove,
    mistake_type: mistakeType,
    eval_difference: evalDiff ?? null,
    attempt_count: 1,
  });

  return { success: !error, error: error?.message };
}

/** Update opening scores */
export async function updateOpeningScores(
  studentId: string,
  openingId: string,
  scores: {
    knowledge_score?: number;
    move_recognition_score?: number;
    plans_score?: number;
    tactical_score?: number;
    responses_score?: number;
    practical_score?: number;
    test_score?: number;
  }
) {
  const supabase = createSupabaseServer();

  // Calculate overall score as average of available scores
  const scoreValues = [
    scores.knowledge_score,
    scores.move_recognition_score,
    scores.plans_score,
    scores.tactical_score,
    scores.responses_score,
    scores.practical_score,
  ].filter((v): v is number => v !== undefined);

  const overall_score =
    scoreValues.length > 0
      ? Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length)
      : 0;

  // Compute mastery level — need to inline since we can't call the exported function as a value at module level
  let mastery_level: MasteryLevel = 'learning';
  if (overall_score >= 90) mastery_level = 'mastered';
  else if (overall_score >= 70) mastery_level = 'strong';
  else if (overall_score >= 50) mastery_level = 'familiar';

  const { data, error } = await supabase
    .from('student_opening_scores')
    .upsert(
      {
        student_id: studentId,
        opening_id: openingId,
        ...scores,
        overall_score,
        mastery_level,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'student_id,opening_id' }
    )
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message };
  }

  // Also update the student_opening_progress overall_score
  await upsertOpeningProgress(studentId, openingId, {
    overall_score,
    mastery_level,
  });

  return { success: true, data };
}

// ─────────────────────────────────────────────────────────────────────────────
// INITIALIZING CHAPTER 1 UNLOCK
// ─────────────────────────────────────────────────────────────────────────────

/** When a student starts an opening for the first time, unlock Chapter 1 */
export async function initializeOpeningForStudent(studentId: string, openingId: string) {
  const supabase = createSupabaseServer();

  // Get chapter 1
  const { data: ch1 } = await supabase
    .from('opening_chapters')
    .select('id')
    .eq('opening_id', openingId)
    .eq('chapter_num', 1)
    .single();

  if (!ch1) return { success: false, error: 'Chapter 1 not found' };

  // Create opening progress
  await upsertOpeningProgress(studentId, openingId, {
    status: 'in_progress',
    started_at: new Date().toISOString(),
  });

  // Unlock chapter 1
  await upsertChapterProgress(studentId, ch1.id, openingId, {
    is_unlocked: true,
    status: 'unlocked',
  });

  return { success: true };
}
