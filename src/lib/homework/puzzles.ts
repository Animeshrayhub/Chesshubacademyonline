import { createSupabaseAdmin } from '../supabase/admin';
import { assertAdmin, assertCoach, assertStudent, assertAdminOrCoach } from '../permissions';
import { getCurrentUser } from '../supabase/auth';
import {
  BaseError, DatabaseError, NotFoundError,
  ForbiddenError, InternalServerError, ValidationError,
  AuthenticationError,
  type Result,
} from '../errors';
import { Chess } from 'chess.js';
import type {
  DbHomeworkPuzzle, DbStudentPuzzleAttempt, DbHomeworkProgress,
  DbThemeProgress, DbChapterProgress, CreatePuzzleInput,
  PuzzleMoveResult, HintResponse, StudentPuzzleView,
  HomeworkAnalytics, StudentBreakdownItem, ThemeBreakdownItem,
} from '@/types/homework-puzzles';
import {
  PUZZLE_SCORES, HINT_DEDUCTIONS, MAX_ATTEMPTS, UNLOCK_THRESHOLD,
} from '@/types/homework-puzzles';

// ─── Puzzle Library (Admin) ───────────────────────────────────────────────────

/**
 * Lists all puzzles in the library with optional filters.
 */
export async function listPuzzles(filters?: {
  theme?: string;
  difficulty?: string;
  isActive?: boolean;
}): Promise<Result<DbHomeworkPuzzle[]>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    let query = admin.from('homework_puzzles').select('*').order('created_at', { ascending: false });
    if (filters?.theme)      query = query.eq('theme', filters.theme);
    if (filters?.difficulty) query = query.eq('difficulty', filters.difficulty);
    if (filters?.isActive !== undefined) query = query.eq('is_active', filters.isActive);
    const { data, error } = await query;
    if (error) {
      console.warn('[listPuzzles] DB notice:', error.message);
      return { success: true, data: [] };
    }
    return { success: true, data: data ?? [] };
  } catch (err) {
    return { success: true, data: [] };
  }
}

/**
 * Creates a new puzzle in the admin library.
 */
export async function createPuzzle(input: CreatePuzzleInput): Promise<Result<DbHomeworkPuzzle>> {
  try {
    await assertAdmin();
    if (!input.fen || !input.solution?.length) {
      return { success: false, error: new ValidationError('FEN and solution are required', {}) };
    }
    // Validate FEN
    try { new Chess(input.fen); } catch {
      return { success: false, error: new ValidationError('Invalid FEN position', {}) };
    }
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.from('homework_puzzles').insert({
      title:       input.title,
      fen:         input.fen,
      solution:    input.solution,
      theme:       input.theme || 'tactics',
      difficulty:  input.difficulty || 'intermediate',
      rating:      input.rating ?? 1500,
      hint_1:      input.hint1 ?? null,
      hint_2:      input.hint2 ?? null,
      hint_3:      input.hint3 ?? null,
      explanation: input.explanation ?? null,
      source_id:   input.sourceId ?? null,
    }).select().single();
    if (error || !data) return { success: false, error: new DatabaseError('Failed to create puzzle', error) };
    return { success: true, data };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

/**
 * Updates an existing puzzle.
 */
export async function updatePuzzle(
  id: string,
  input: Partial<CreatePuzzleInput>
): Promise<Result<DbHomeworkPuzzle>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const updates: Record<string, unknown> = {};
    if (input.title !== undefined)       updates.title       = input.title;
    if (input.fen !== undefined)         updates.fen         = input.fen;
    if (input.solution !== undefined)    updates.solution    = input.solution;
    if (input.theme !== undefined)       updates.theme       = input.theme;
    if (input.difficulty !== undefined)  updates.difficulty  = input.difficulty;
    if (input.rating !== undefined)      updates.rating      = input.rating;
    if (input.hint1 !== undefined)       updates.hint_1      = input.hint1;
    if (input.hint2 !== undefined)       updates.hint_2      = input.hint2;
    if (input.hint3 !== undefined)       updates.hint_3      = input.hint3;
    if (input.explanation !== undefined) updates.explanation = input.explanation;
    const { data, error } = await admin.from('homework_puzzles').update(updates).eq('id', id).select().single();
    if (error || !data) return { success: false, error: new DatabaseError('Failed to update puzzle', error) };
    return { success: true, data };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

/**
 * Soft-deletes a puzzle (sets is_active = false).
 */
export async function deactivatePuzzle(id: string): Promise<Result<{ id: string }>> {
  try {
    await assertAdmin();
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('homework_puzzles').update({ is_active: false }).eq('id', id);
    if (error) return { success: false, error: new DatabaseError('Failed to deactivate puzzle', error) };
    return { success: true, data: { id } };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

// ─── Chapter ↔ Puzzle Assignment (Coach / Admin) ─────────────────────────────

/**
 * Assigns a list of puzzles to a chapter (creates junction records).
 */
export async function assignPuzzlesToChapter(
  chapterId: string,
  puzzleIds: string[]
): Promise<Result<{ count: number }>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();

    const { data: existing } = await admin
      .from('homework_chapter_puzzles')
      .select('puzzle_order')
      .eq('chapter_id', chapterId)
      .order('puzzle_order', { ascending: false })
      .limit(1);

    const startOrder = existing && existing.length > 0 ? (existing[0].puzzle_order || 0) : 0;

    const rows = puzzleIds.map((pid, i) => ({
      chapter_id:   chapterId,
      puzzle_id:    pid,
      puzzle_order: startOrder + i + 1,
    }));
    const { error } = await admin.from('homework_chapter_puzzles').upsert(rows, { onConflict: 'chapter_id,puzzle_id' });
    if (error) return { success: false, error: new DatabaseError('Failed to assign puzzles to chapter', error) };
    return { success: true, data: { count: puzzleIds.length } };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

/**
 * Removes a puzzle from a chapter.
 */
export async function removePuzzleFromChapter(
  chapterId: string,
  puzzleId: string
): Promise<Result<{ done: boolean }>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { error } = await admin.from('homework_chapter_puzzles')
      .delete().eq('chapter_id', chapterId).eq('puzzle_id', puzzleId);
    if (error) return { success: false, error: new DatabaseError('Failed to remove puzzle from chapter', error) };
    return { success: true, data: { done: true } };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

/**
 * Lists puzzles for a chapter (with optional order).
 */
export async function listChapterPuzzles(chapterId: string): Promise<Result<Array<DbHomeworkPuzzle & { puzzle_order: number }>>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.from('homework_chapter_puzzles')
      .select('puzzle_order, homework_puzzles(*)')
      .eq('chapter_id', chapterId)
      .order('puzzle_order', { ascending: true });
    if (error) return { success: false, error: new DatabaseError('Failed to list chapter puzzles', error) };
    const puzzles = (data ?? []).map((row: any) => ({ ...row.homework_puzzles, puzzle_order: row.puzzle_order }));
    return { success: true, data: puzzles };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

// ─── Student Puzzle Session ───────────────────────────────────────────────────

/**
 * Returns puzzles for a student assignment — NEVER exposes solution unless unlocked.
 */
export async function getChapterPuzzlesForStudent(
  assignmentId: string
): Promise<Result<StudentPuzzleView[]>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: new AuthenticationError('User is not authenticated.') };

    const admin = createSupabaseAdmin();

    // Get student profile or fallback to user ID for admin/coach testing
    const { data: profile } = await admin.from('student_profiles')
      .select('id').eq('user_id', user.id).maybeSingle();
    const profileId = profile?.id || user.id;

    // Verify assignment
    const { data: assignment } = await admin.from('homework_assignments')
      .select('chapter_id, student_id').eq('id', assignmentId).maybeSingle();
    if (!assignment) return { success: false, error: new NotFoundError('Assignment not found') };

    // Get puzzles for the chapter via 3-tier fallback strategy
    let puzzlesData: any[] = [];
    const { data: chapPuzzles } = await admin
      .from('homework_chapter_puzzles')
      .select('puzzle_id, puzzle_order')
      .eq('chapter_id', assignment.chapter_id)
      .order('puzzle_order', { ascending: true });

    if (chapPuzzles && chapPuzzles.length > 0) {
      const puzzleIds = chapPuzzles.map((cp: any) => cp.puzzle_id).filter(Boolean);
      const { data: pData } = await admin
        .from('homework_puzzles')
        .select('id, title, fen, theme, difficulty, rating, hint_1, hint_2, hint_3, explanation, solution')
        .in('id', puzzleIds);
      
      if (pData && pData.length > 0) {
        const pMap = new Map(pData.map((p: any) => [p.id, p]));
        puzzlesData = chapPuzzles
          .map((cp: any) => {
            const p = pMap.get(cp.puzzle_id);
            return p ? { ...p, puzzle_order: cp.puzzle_order } : null;
          })
          .filter(Boolean);
      }
    }

    // Fallback 1: Query homework_puzzles directly for source_id = chapter_id
    if (puzzlesData.length === 0) {
      const { data: directPuzzles } = await admin
        .from('homework_puzzles')
        .select('id, title, fen, theme, difficulty, rating, hint_1, hint_2, hint_3, explanation, solution')
        .eq('source_id', assignment.chapter_id);
      
      if (directPuzzles && directPuzzles.length > 0) {
        puzzlesData = directPuzzles.map((p: any, idx: number) => ({ ...p, puzzle_order: idx + 1 }));
      }
    }

    // Fallback 2: Parse stored PGN text from homework_chapters pgn_data
    if (puzzlesData.length === 0) {
      const { data: chapData } = await admin
        .from('homework_chapters')
        .select('pgn_data')
        .eq('id', assignment.chapter_id)
        .maybeSingle();

      if (chapData?.pgn_data) {
        const parsed = parsePgnToPuzzles(chapData.pgn_data);
        puzzlesData = parsed.map((p, idx) => ({
          id: `pgn_${idx}`,
          puzzle_order: idx + 1,
          title: p.title || `Puzzle ${idx + 1}`,
          fen: p.fen,
          solution: p.solution || [],
          theme: p.theme || 'tactics',
          difficulty: p.difficulty || 'intermediate',
          rating: 1500,
          hint_1: p.hint1 || null,
          hint_2: p.hint2 || null,
          hint_3: p.hint3 || null,
          explanation: p.explanation || null,
        }));
      }
    }

    // Get existing attempts for solution unlock check
    const { data: attempts } = await admin.from('student_puzzle_attempts')
      .select('puzzle_id, solution_unlocked, status')
      .eq('assignment_id', assignmentId)
      .eq('student_profile_id', profile.id);
    const attemptMap = new Map<string, { solution_unlocked: boolean; status: string }>(
      (attempts ?? []).map((a: any) => [a.puzzle_id, a])
    );

    const views: StudentPuzzleView[] = puzzlesData.map((p: any, idx: number) => {
      const attempt = attemptMap.get(p.id);
      const solutionUnlocked = attempt?.solution_unlocked ?? false;
      return {
        id:           p.id,
        title:        p.title,
        fen:          p.fen,
        theme:        p.theme,
        difficulty:   p.difficulty,
        rating:       p.rating || 1500,
        puzzle_order: p.puzzle_order || idx + 1,
        hint_1:       p.hint_1,
        hint_2:       p.hint_2,
        hint_3:       p.hint_3,
        explanation:  p.explanation,
        ...(solutionUnlocked ? { solution: p.solution } : {}),
      };
    });

    return { success: true, data: views };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

/**
 * Server-side move validation. Never exposes the solution to the client.
 */
export async function submitPuzzleMove(
  assignmentId: string,
  puzzleId: string,
  uciMove: string,
  timeSeconds: number
): Promise<Result<PuzzleMoveResult>> {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: new AuthenticationError('User is not authenticated.') };
    const admin = createSupabaseAdmin();

    let profile = (await admin.from('student_profiles').select('id').eq('user_id', user.id).maybeSingle()).data;
    if (!profile) {
      const { data: newP } = await admin.from('student_profiles').insert({ user_id: user.id, rating: 1200 }).select('id').single();
      profile = newP || { id: user.id };
    }

    // Load puzzle solution
    const { data: puzzle } = await admin.from('homework_puzzles')
      .select('id, fen, solution, title').eq('id', puzzleId).maybeSingle();
    if (!puzzle) return { success: false, error: new NotFoundError('Puzzle not found') };

    const { data: assignment } = await admin.from('homework_assignments')
      .select('student_id').eq('id', assignmentId).maybeSingle();
    if (!assignment || assignment.student_id !== profile.id) {
      return { success: false, error: new ForbiddenError('Not your assignment') };
    }

    // Get or create attempt
    let { data: attempt } = await admin.from('student_puzzle_attempts')
      .select('*').eq('assignment_id', assignmentId).eq('puzzle_id', puzzleId).maybeSingle();

    if (!attempt) {
      // Get puzzle_order from junction table
      const { data: junc } = await admin.from('homework_chapter_puzzles')
        .select('puzzle_order')
        .eq('puzzle_id', puzzleId)
        .eq('chapter_id', (await admin.from('homework_assignments').select('chapter_id').eq('id', assignmentId).maybeSingle()).data?.chapter_id)
        .maybeSingle();

      const { data: newAttempt, error: insertErr } = await admin.from('student_puzzle_attempts').insert({
        assignment_id:      assignmentId,
        puzzle_id:          puzzleId,
        student_profile_id: profile.id,
        puzzle_order:       junc?.puzzle_order ?? 1,
        attempts_used:      0,
        hints_used:         0,
        status:             'unsolved',
        score:              0,
        time_seconds:       timeSeconds,
        solution_unlocked:  false,
      }).select().single();
      if (insertErr || !newAttempt) return { success: false, error: new DatabaseError('Failed to create attempt', insertErr) };
      attempt = newAttempt;
    }

    if (attempt.status === 'solved') {
      return { success: true, data: { correct: true, isComplete: true, attemptsLeft: 0, scoreEarned: attempt.score, message: 'Already solved! ✅' } };
    }
    if (attempt.status === 'failed') {
      return { success: true, data: { correct: false, isComplete: true, attemptsLeft: 0, scoreEarned: 0, message: 'Puzzle failed. Reveal solution to learn! 📖' } };
    }
    if (attempt.attempts_used >= MAX_ATTEMPTS) {
      return { success: true, data: { correct: false, isComplete: true, attemptsLeft: 0, scoreEarned: 0, message: 'No attempts left. Click "Show Solution" to learn!' } };
    }

    // Validate move against solution
    const expectedMove = puzzle.solution[0]?.toLowerCase();
    const normalizedMove = uciMove.toLowerCase();
    const isCorrect =
      normalizedMove === expectedMove ||
      `${normalizedMove}q` === expectedMove; // pawn promotion default

    const newAttemptsUsed = attempt.attempts_used + 1;
    const attemptsLeft = MAX_ATTEMPTS - newAttemptsUsed;

    if (isCorrect) {
      // Calculate score based on which attempt succeeded
      let score: number = PUZZLE_SCORES.THIRD_ATTEMPT;
      if (newAttemptsUsed === 1) score = PUZZLE_SCORES.FIRST_ATTEMPT;
      else if (newAttemptsUsed === 2) score = PUZZLE_SCORES.SECOND_ATTEMPT;

      // Apply hint deductions
      const hintsUsed = attempt.hints_used;
      let hintPenalty = 0;
      if (hintsUsed >= 1) hintPenalty += HINT_DEDUCTIONS.HINT_1;
      if (hintsUsed >= 2) hintPenalty += HINT_DEDUCTIONS.HINT_2;
      if (hintsUsed >= 3) hintPenalty += HINT_DEDUCTIONS.HINT_3;
      const finalScore = Math.max(0, score - hintPenalty);

      await admin.from('student_puzzle_attempts').update({
        status:             'solved',
        attempts_used:      newAttemptsUsed,
        score:              finalScore,
        time_seconds:       timeSeconds,
        solved_at:          new Date().toISOString(),
        correct_on_attempt: newAttemptsUsed,
      }).eq('id', attempt.id);

      return {
        success: true,
        data: {
          correct:      true,
          isComplete:   true,
          attemptsLeft: 0,
          scoreEarned:  finalScore,
          message:      newAttemptsUsed === 1
            ? '🎯 Perfect! Solved on first try! +100 points'
            : `✅ Correct! Solved on attempt ${newAttemptsUsed}. +${finalScore} points`,
        },
      };
    } else {
      // Wrong move
      const isFailed = newAttemptsUsed >= MAX_ATTEMPTS;
      await admin.from('student_puzzle_attempts').update({
        status:        isFailed ? 'failed' : 'unsolved',
        attempts_used: newAttemptsUsed,
        time_seconds:  timeSeconds,
        last_move:     uciMove,
        ...(isFailed ? { score: PUZZLE_SCORES.FAILED } : {}),
      }).eq('id', attempt.id);

      if (isFailed) {
        return {
          success: true,
          data: { correct: false, isComplete: true, attemptsLeft: 0, scoreEarned: 0, message: '❌ Out of attempts. Reveal the solution to learn from it!' },
        };
      }

      return {
        success: true,
        data: {
          correct:      false,
          isComplete:   false,
          attemptsLeft,
          scoreEarned:  0,
          message:      attemptsLeft === 1
            ? `⚠️ Wrong move. Last attempt! Think carefully…`
            : `❌ Not quite. ${attemptsLeft} attempts remaining.`,
        },
      };
    }
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

/**
 * Returns a hint and records usage with point deduction.
 */
export async function requestHint(
  assignmentId: string,
  puzzleId:     string,
  hintLevel:    1 | 2 | 3
): Promise<Result<HintResponse>> {
  try {
    const user = await assertStudent();
    const admin = createSupabaseAdmin();

    const { data: profile } = await admin.from('student_profiles')
      .select('id').eq('user_id', user.id).maybeSingle();
    if (!profile) return { success: false, error: new ForbiddenError('Student profile not found') };

    // Load puzzle hints (sanitized)
    const { data: puzzle } = await admin.from('homework_puzzles')
      .select('hint_1,hint_2,hint_3').eq('id', puzzleId).maybeSingle();
    if (!puzzle) return { success: false, error: new NotFoundError('Puzzle not found') };

    const hintText = hintLevel === 1 ? puzzle.hint_1 : hintLevel === 2 ? puzzle.hint_2 : puzzle.hint_3;
    if (!hintText) {
      return { success: true, data: { hintText: 'No hint available for this level.', hintLevel, pointsDeducted: 0, alreadyUsed: false } };
    }

    const deductMap = { 1: HINT_DEDUCTIONS.HINT_1, 2: HINT_DEDUCTIONS.HINT_2, 3: HINT_DEDUCTIONS.HINT_3 };
    const pointsDeducted = deductMap[hintLevel];

    // Get attempt id
    const { data: attempt } = await admin.from('student_puzzle_attempts')
      .select('id, hints_used').eq('assignment_id', assignmentId).eq('puzzle_id', puzzleId).maybeSingle();

    if (!attempt) return { success: false, error: new NotFoundError('Start solving this puzzle first') };

    // Check if already used
    const { data: existing } = await admin.from('homework_hint_usage')
      .select('id').eq('attempt_id', attempt.id).eq('hint_level', hintLevel).maybeSingle();
    if (existing) {
      return { success: true, data: { hintText, hintLevel, pointsDeducted: 0, alreadyUsed: true } };
    }

    // Record hint usage
    await admin.from('homework_hint_usage').insert({
      attempt_id:      attempt.id,
      hint_level:      hintLevel,
      points_deducted: pointsDeducted,
    });
    await admin.from('student_puzzle_attempts').update({ hints_used: attempt.hints_used + 1 }).eq('id', attempt.id);

    return { success: true, data: { hintText, hintLevel, pointsDeducted, alreadyUsed: false } };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

/**
 * Reveals the solution for a puzzle (after max attempts exhausted).
 */
export async function unlockSolution(
  assignmentId: string,
  puzzleId:     string
): Promise<Result<{ solution: string[]; explanation: string | null }>> {
  try {
    const user = await assertStudent();
    const admin = createSupabaseAdmin();

    const { data: profile } = await admin.from('student_profiles')
      .select('id').eq('user_id', user.id).maybeSingle();
    if (!profile) return { success: false, error: new ForbiddenError('Student profile not found') };

    const { data: attempt } = await admin.from('student_puzzle_attempts')
      .select('id, status, attempts_used').eq('assignment_id', assignmentId).eq('puzzle_id', puzzleId).maybeSingle();

    if (!attempt) return { success: false, error: new NotFoundError('Attempt not found') };
    if (attempt.status !== 'failed' && attempt.attempts_used < MAX_ATTEMPTS) {
      return { success: false, error: new ForbiddenError('Solve or exhaust attempts first') };
    }

    const { data: puzzle } = await admin.from('homework_puzzles')
      .select('solution, explanation').eq('id', puzzleId).maybeSingle();
    if (!puzzle) return { success: false, error: new NotFoundError('Puzzle not found') };

    await admin.from('student_puzzle_attempts').update({ solution_unlocked: true }).eq('id', attempt.id);

    return { success: true, data: { solution: puzzle.solution, explanation: puzzle.explanation } };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

// ─── Progress ────────────────────────────────────────────────────────────────

/**
 * Gets the homework progress aggregate for a student/assignment.
 */
export async function getHomeworkProgress(
  assignmentId: string
): Promise<Result<DbHomeworkProgress | null>> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.from('homework_progress')
      .select('*').eq('assignment_id', assignmentId).maybeSingle();
    if (error) return { success: false, error: new DatabaseError('Failed to fetch progress', error) };
    return { success: true, data: data ?? null };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

/**
 * Returns all attempts for an assignment (for displaying solved/unsolved state).
 */
export async function getAssignmentAttempts(
  assignmentId: string
): Promise<Result<DbStudentPuzzleAttempt[]>> {
  try {
    const admin = createSupabaseAdmin();
    const { data, error } = await admin.from('student_puzzle_attempts')
      .select('*').eq('assignment_id', assignmentId).order('puzzle_order', { ascending: true });
    if (error) return { success: false, error: new DatabaseError('Failed to fetch attempts', error) };
    return { success: true, data: data ?? [] };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

/**
 * Coach manually unlocks next chapter for a student.
 */
export async function coachUnlockNextChapter(
  assignmentId: string
): Promise<Result<{ done: boolean }>> {
  try {
    const user = await assertCoach();
    const admin = createSupabaseAdmin();

    const { data: coachProfile } = await admin.from('coach_profiles')
      .select('id').eq('user_id', user.id).maybeSingle();
    if (!coachProfile) return { success: false, error: new ForbiddenError('Coach profile not found') };

    // Get assignment
    const { data: asgn } = await admin.from('homework_assignments')
      .select('chapter_id, student_id').eq('id', assignmentId).maybeSingle();
    if (!asgn) return { success: false, error: new NotFoundError('Assignment not found') };

    // Get workbook
    const { data: chapter } = await admin.from('homework_chapters')
      .select('workbook_id, chapter_number').eq('id', asgn.chapter_id).maybeSingle();
    if (!chapter) return { success: false, error: new NotFoundError('Chapter not found') };

    // Find next chapter
    const { data: nextChapter } = await admin.from('homework_chapters')
      .select('id').eq('workbook_id', chapter.workbook_id)
      .gt('chapter_number', chapter.chapter_number)
      .order('chapter_number', { ascending: true }).limit(1).maybeSingle();

    // Unlock current + next
    await admin.from('chapter_progress').upsert({
      student_profile_id: asgn.student_id,
      chapter_id:         asgn.chapter_id,
      is_unlocked:        true,
      unlocked_at:        new Date().toISOString(),
      unlocked_by:        'coach',
      override_coach_id:  coachProfile.id,
    }, { onConflict: 'student_profile_id,chapter_id' });

    if (nextChapter) {
      await admin.from('chapter_progress').upsert({
        student_profile_id: asgn.student_id,
        chapter_id:         nextChapter.id,
        is_unlocked:        true,
        unlocked_at:        new Date().toISOString(),
        unlocked_by:        'coach',
        override_coach_id:  coachProfile.id,
      }, { onConflict: 'student_profile_id,chapter_id' });
    }

    // Record coach review
    await admin.from('coach_reviews').upsert({
      assignment_id:  assignmentId,
      coach_id:       coachProfile.id,
      status:         'approved',
      override_unlock: true,
      reviewed_at:    new Date().toISOString(),
    }, { onConflict: 'assignment_id,coach_id' });

    return { success: true, data: { done: true } };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

// ─── Analytics (Coach / Admin) ────────────────────────────────────────────────

/**
 * Returns detailed analytics for a homework assignment.
 */
export async function getHomeworkAnalytics(
  assignmentId: string
): Promise<Result<HomeworkAnalytics>> {
  try {
    await assertAdminOrCoach();
    const admin = createSupabaseAdmin();

    const { data: progRows } = await admin.from('homework_progress')
      .select('*').eq('assignment_id', assignmentId);

    const { data: asgn } = await admin.from('homework_assignments')
      .select('chapter_id').eq('id', assignmentId).maybeSingle();

    const { data: chapter } = asgn
      ? await admin.from('homework_chapters').select('title, workbook_id').eq('id', asgn.chapter_id).maybeSingle()
      : { data: null };

    const { data: workbook } = chapter
      ? await admin.from('homework_workbooks').select('title').eq('id', chapter.workbook_id).maybeSingle()
      : { data: null };

    const rows = progRows ?? [];
    const completed = rows.filter((r: any) => r.status === 'completed' || r.status === 'passed' || r.status === 'failed');
    const passed    = rows.filter((r: any) => r.status === 'passed');

    const avgAccuracy    = rows.length ? rows.reduce((s: number, r: any) => s + (r.accuracy || 0), 0) / rows.length : 0;
    const avgScore       = rows.length ? rows.reduce((s: number, r: any) => s + (r.total_score || 0), 0) / rows.length : 0;
    const avgHints       = rows.length ? rows.reduce((s: number, r: any) => s + (r.total_hints_used || 0), 0) / rows.length : 0;
    const avgTime        = rows.length ? rows.reduce((s: number, r: any) => s + (r.avg_time_seconds || 0), 0) / rows.length : 0;

    // Per-student breakdown
    const studentProfileIds = rows.map((r: any) => r.student_profile_id);
    const { data: students } = studentProfileIds.length
      ? await admin.from('student_profiles').select('id, user_id').in('id', studentProfileIds)
      : { data: [] };
    const studentUserIds = (students ?? []).map((s: any) => s.user_id);
    const { data: users } = studentUserIds.length
      ? await admin.from('users').select('id, first_name, last_name').in('id', studentUserIds)
      : { data: [] };
    const userMap = new Map<string, { first_name: string; last_name: string }>((users ?? []).map((u: any) => [u.id, u]));
    const spMap   = new Map<string, string>((students ?? []).map((s: any) => [s.id, s.user_id]));

    const studentBreakdown: StudentBreakdownItem[] = rows.map((r: any) => {
      const uid  = spMap.get(r.student_profile_id);
      const user = uid ? userMap.get(uid) : null;
      return {
        studentId:   r.student_profile_id,
        studentName: user ? `${user.first_name} ${user.last_name}` : 'Unknown',
        solved:      r.solved_puzzles,
        total:       r.total_puzzles,
        accuracy:    r.accuracy,
        score:       r.total_score,
        hintsUsed:   r.total_hints_used,
        status:      r.status,
        completedAt: r.completed_at,
      };
    });

    // Theme breakdown from attempts
    const { data: attempts } = await admin.from('student_puzzle_attempts')
      .select('puzzle_id, status, time_seconds').eq('assignment_id', assignmentId);

    const puzzleIds = [...new Set((attempts ?? []).map((a: any) => a.puzzle_id))];
    const { data: puzzles } = puzzleIds.length
      ? await admin.from('homework_puzzles').select('id, theme').in('id', puzzleIds)
      : { data: [] };
    const themeMap = new Map<string, string>((puzzles ?? []).map((p: any) => [p.id, p.theme]));

    const themeStats: Record<string, { total: number; solved: number; timeSum: number }> = {};
    for (const att of (attempts ?? []) as any[]) {
      const theme = themeMap.get(att.puzzle_id) || 'unknown';
      if (!themeStats[theme]) themeStats[theme] = { total: 0, solved: 0, timeSum: 0 };
      themeStats[theme].total++;
      if (att.status === 'solved') themeStats[theme].solved++;
      themeStats[theme].timeSum += att.time_seconds || 0;
    }

    const themeBreakdown: ThemeBreakdownItem[] = Object.entries(themeStats).map(([theme, s]) => ({
      theme,
      totalAttempts: s.total,
      solved:        s.solved,
      accuracy:      s.total > 0 ? Math.round((s.solved / s.total) * 100 * 100) / 100 : 0,
      avgTime:       s.total > 0 ? Math.round(s.timeSum / s.total) : 0,
    }));

    return {
      success: true,
      data: {
        assignmentId,
        workbookTitle:    workbook?.title || '',
        chapterTitle:     chapter?.title  || '',
        totalStudents:    rows.length,
        completedCount:   completed.length,
        passedCount:      passed.length,
        avgAccuracy:      Math.round(avgAccuracy * 100) / 100,
        avgScore:         Math.round(avgScore),
        avgHintsUsed:     Math.round(avgHints * 100) / 100,
        avgTimeSeconds:   Math.round(avgTime),
        themeBreakdown,
        studentBreakdown,
      },
    };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

/**
 * Returns per-theme progress for a student.
 */
export async function getStudentThemeProgress(
  studentProfileId?: string
): Promise<Result<DbThemeProgress[]>> {
  try {
    const admin = createSupabaseAdmin();
    let profileId = studentProfileId;
    if (!profileId) {
      const user = await assertStudent();
      const { data: prof } = await admin.from('student_profiles').select('id').eq('user_id', user.id).maybeSingle();
      profileId = prof?.id;
    }
    if (!profileId) return { success: true, data: [] };
    const { data, error } = await admin.from('theme_progress')
      .select('*').eq('student_profile_id', profileId).order('accuracy', { ascending: true });
    if (error) return { success: false, error: new DatabaseError('Failed to fetch theme progress', error) };
    return { success: true, data: data ?? [] };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown') };
  }
}

// ─── PGN / Lichess Study Importer ─────────────────────────────────────────────

/**
 * Parses raw PGN / Lichess Study PGN text or raw FEN strings into structured CreatePuzzleInput items.
 */
export function parsePgnToPuzzles(pgnText: string): CreatePuzzleInput[] {
  const results: CreatePuzzleInput[] = [];
  if (!pgnText || !pgnText.trim()) return results;

  const cleanFenString = (rawFen: string): string => {
    let f = rawFen.trim();
    // If only position part is given (8 ranks separated by /), append default turn/castling/en-passant
    const parts = f.split(/\s+/);
    if (parts.length === 1 && f.split('/').length === 8) {
      f = `${f} w - - 0 1`;
    } else if (parts.length === 2 && f.split('/').length === 8) {
      f = `${f} - - 0 1`;
    }
    return f;
  };

  const validateAndAddFen = (fen: string, title: string, solutionMoves: string[] = []): boolean => {
    const cleaned = cleanFenString(fen);
    let validFen = cleaned;
    try {
      const chess = new Chess(cleaned);
      validFen = chess.fen();
    } catch {
      if (!cleaned.includes(' ')) {
        validFen = `${cleaned} w - - 0 1`;
      }
    }

    if (validFen.split('/').length === 8) {
      results.push({
        title: title || 'Tactics Puzzle',
        fen: validFen,
        solution: solutionMoves,
        theme: 'tactics',
        difficulty: 'intermediate',
        hint1: 'Examine candidate moves and checks.',
        hint2: 'Focus on forcing piece interactions.',
        hint3: solutionMoves.length > 0 ? `First move starts from square ${solutionMoves[0].slice(0, 2)}.` : undefined,
        explanation: solutionMoves.length > 0 ? `Solution sequence: ${solutionMoves.join(', ')}` : 'Set solution moves on interactive board',
      });
      return true;
    }
    return false;
  };

  // 1. Try PGN games splitting or single game block parsing
  const rawGames = pgnText.includes('[Event')
    ? pgnText.split(/(?=\[Event\s)/i).filter((g) => g.trim().length > 0)
    : [pgnText];

  if (rawGames.length > 0 && (pgnText.includes('[Event') || pgnText.includes('[FEN') || pgnText.match(/\d+\./))) {
    for (let i = 0; i < rawGames.length; i++) {
      const gameText = rawGames[i];
      const eventMatch = gameText.match(/\[Event\s+"([^"]+)"\]/i);
      let title = eventMatch ? eventMatch[1].trim() : `ChessHub Academy Puzzle ${i + 1}`;
      if (title.toLowerCase().includes('chessbrain')) {
        title = title.replace(/chessbrainz?/i, 'ChessHub Academy');
      }

      const fenMatch = gameText.match(/\[FEN\s+"([^"]+)"\]/i);
      let initialFen = fenMatch ? fenMatch[1].trim() : '';

      if (!initialFen) {
        const regexMatch = gameText.match(/(?:[rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}(?:\s+[wb]\s+[-KQkqA-Ha-h1-8]+\s+[-a-h1-8]+\s+\d+\s+\d+)?/);
        initialFen = regexMatch ? regexMatch[0].trim() : 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
      }

      const uciSolution: string[] = [];
      try {
        const chess = new Chess(cleanFenString(initialFen));

        const moveText = gameText
          .replace(/\[[^\]]+\]/g, '')
          .replace(/\{[^}]*\}/g, '')
          .replace(/\$\d+/g, '')
          .replace(/1\/2-1\/2|1-0|0-1|\*/g, '')
          .trim();

        const moveTokens = moveText.split(/\s+/).filter((t) => t && !t.match(/^\d+\.+$/));

        for (const token of moveTokens) {
          const cleanSan = token.replace(/^\d+\.+/, '').trim();
          if (!cleanSan) continue;
          try {
            const moveObj = chess.move(cleanSan);
            if (moveObj) {
              uciSolution.push(`${moveObj.from}${moveObj.to}${moveObj.promotion || ''}`);
            }
          } catch {
            break;
          }
        }
      } catch {
        // Continue even if move parsing fails for custom mate positions
      }

      validateAndAddFen(initialFen, title, uciSolution);
    }
    if (results.length > 0) return results;
  }

  // 2. Direct FEN extraction line by line or via regex
  const fenRegex = /(?:[rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}(?:\s+[wb]\s+[-KQkqA-Ha-h1-8]+\s+[-a-h1-8]+\s+\d+\s+\d+)?/g;
  const regexMatches = pgnText.match(fenRegex) || [];

  if (regexMatches.length > 0) {
    regexMatches.forEach((m, idx) => {
      validateAndAddFen(m, `Puzzle ${idx + 1}`);
    });
    if (results.length > 0) return results;
  }

  // 3. Fallback line-by-line parsing
  const lines = pgnText.split('\n').map(l => l.trim()).filter(Boolean);
  lines.forEach((line, idx) => {
    // Strip line numbers like "1. ", "Q1: ", etc.
    const cleanLine = line.replace(/^(?:Q?\d+[\.\:\)\s]+)/i, '').trim();
    validateAndAddFen(cleanLine, `Puzzle ${idx + 1}`);
  });

  return results;
}


/**
 * Imports PGN data into a chapter by creating puzzle records and linking them.
 */
export async function importPgnToChapter(
  chapterId: string,
  pgnData: string
): Promise<Result<{ count: number }>> {
  try {
    await assertAdminOrCoach();
    const puzzles = parsePgnToPuzzles(pgnData);
    if (puzzles.length === 0) {
      return { success: true, data: { count: 0 } };
    }

    const admin = createSupabaseAdmin();
    const puzzleIds: string[] = [];

    for (const input of puzzles) {
      const { data: inserted } = await admin.from('homework_puzzles').insert({
        title:       input.title,
        fen:         input.fen,
        solution:    input.solution,
        theme:       input.theme,
        difficulty:  input.difficulty,
        rating:      input.rating ?? 1500,
        hint_1:      input.hint1 ?? null,
        hint_2:      input.hint2 ?? null,
        hint_3:      input.hint3 ?? null,
        explanation: input.explanation ?? null,
        source:      'chapter',
        source_id:   chapterId,
      }).select('id').single();

      if (inserted?.id) {
        puzzleIds.push(inserted.id);
      }
    }

    if (puzzleIds.length > 0) {
      await assignPuzzlesToChapter(chapterId, puzzleIds);
    }

    return { success: true, data: { count: puzzleIds.length } };
  } catch (err) {
    if (err instanceof BaseError) return { success: false, error: err };
    return { success: false, error: new InternalServerError(err instanceof Error ? err.message : 'Unknown error') };
  }
}
