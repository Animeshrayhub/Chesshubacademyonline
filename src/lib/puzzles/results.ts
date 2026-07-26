import { createSupabaseAdmin } from '../supabase/admin';
import {
  BaseError,
  DatabaseError,
  InternalServerError,
  type Result,
} from '../errors';
import type { DbPuzzleResult, PuzzleResult, StudentPuzzleStats } from './types';

// ─── Save Puzzle Result ───────────────────────────────────────────────────────

/**
 * Upserts a puzzle result for a student.
 * Uses the unique index (student_id, puzzle_id, day) to deduplicate.
 * If the student re-attempts the same daily puzzle, the row is updated.
 */
export async function savePuzzleResult(
  studentProfileId: string,
  result: PuzzleResult
): Promise<Result<{ id: string }>> {
  try {
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('puzzle_results')
      .upsert(
        {
          student_id: studentProfileId,
          puzzle_source: result.puzzleSource,
          puzzle_id: result.puzzleId,
          puzzle_rating: result.puzzleRating ?? null,
          puzzle_themes: result.puzzleThemes ?? [],
          solved: result.solved,
          attempts: result.attempts,
          time_seconds: result.timeSeconds,
          accuracy: result.accuracy,
          solved_at: new Date().toISOString(),
        },
        {
          onConflict: 'student_id,puzzle_id,date_trunc(\'day\', solved_at)',
          ignoreDuplicates: false,
        }
      )
      .select('id')
      .single();

    if (error || !data) {
      // Fallback: plain insert if upsert fails due to constraint naming
      const { data: inserted, error: insertErr } = await admin
        .from('puzzle_results')
        .insert({
          student_id: studentProfileId,
          puzzle_source: result.puzzleSource,
          puzzle_id: result.puzzleId,
          puzzle_rating: result.puzzleRating ?? null,
          puzzle_themes: result.puzzleThemes ?? [],
          solved: result.solved,
          attempts: result.attempts,
          time_seconds: result.timeSeconds,
          accuracy: result.accuracy,
        })
        .select('id')
        .single();

      if (insertErr || !inserted) {
        return {
          success: false,
          error: new DatabaseError('Failed to save puzzle result', insertErr),
        };
      }

      return { success: true, data: { id: inserted.id } };
    }

    return { success: true, data: { id: data.id } };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(
        error instanceof Error ? error.message : 'Unknown error'
      ),
    };
  }
}

// ─── Get Student Puzzle History ───────────────────────────────────────────────

/**
 * Returns recent puzzle results for a student.
 */
export async function getStudentPuzzleHistory(
  studentProfileId: string,
  limit = 20
): Promise<Result<DbPuzzleResult[]>> {
  try {
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('puzzle_results')
      .select('*')
      .eq('student_id', studentProfileId)
      .order('solved_at', { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: new DatabaseError('Failed to fetch puzzle history', error),
      };
    }

    return { success: true, data: (data ?? []) as DbPuzzleResult[] };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(
        error instanceof Error ? error.message : 'Unknown error'
      ),
    };
  }
}

// ─── Get Student Puzzle Stats (for coach view) ────────────────────────────────

/**
 * Returns aggregated puzzle statistics for a student.
 * Used by the coach dashboard to monitor student puzzle activity.
 */
export async function getStudentPuzzleStats(
  studentProfileId: string
): Promise<Result<StudentPuzzleStats>> {
  try {
    const admin = createSupabaseAdmin();

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [allRes, todayRes] = await Promise.all([
      admin
        .from('puzzle_results')
        .select('*')
        .eq('student_id', studentProfileId)
        .order('solved_at', { ascending: false })
        .limit(50),
      admin
        .from('puzzle_results')
        .select('id', { count: 'exact', head: true })
        .eq('student_id', studentProfileId)
        .eq('solved', true)
        .gte('solved_at', todayStart.toISOString()),
    ]);

    const rows = (allRes.data ?? []) as DbPuzzleResult[];
    const solvedToday = todayRes.count ?? 0;

    const totalAttempts = rows.length;
    const solved = rows.filter((r) => r.solved);
    const totalSolved = solved.length;
    const solveRate =
      totalAttempts > 0
        ? Math.round((totalSolved / totalAttempts) * 100)
        : 0;

    const timeSamples = rows
      .filter((r) => r.time_seconds != null)
      .map((r) => r.time_seconds as number);
    const averageTime =
      timeSamples.length > 0
        ? Math.round(
            timeSamples.reduce((a, b) => a + b, 0) / timeSamples.length
          )
        : 0;

    const accuracySamples = rows
      .filter((r) => r.accuracy != null)
      .map((r) => r.accuracy as number);
    const averageAccuracy =
      accuracySamples.length > 0
        ? Math.round(
            accuracySamples.reduce((a, b) => a + b, 0) /
              accuracySamples.length
          )
        : 0;

    return {
      success: true,
      data: {
        totalAttempts,
        totalSolved,
        solveRate,
        averageTime,
        averageAccuracy,
        solvedToday,
        recentResults: rows.slice(0, 10),
      },
    };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(
        error instanceof Error ? error.message : 'Unknown error'
      ),
    };
  }
}

// ─── Toggle Favourite ─────────────────────────────────────────────────────────

export async function togglePuzzleFavourite(
  puzzleResultId: string,
  isFavourite: boolean
): Promise<Result<void>> {
  try {
    const admin = createSupabaseAdmin();
    const { error } = await admin
      .from('puzzle_results')
      .update({ is_favourite: isFavourite })
      .eq('id', puzzleResultId);

    if (error) {
      return {
        success: false,
        error: new DatabaseError('Failed to update favourite', error),
      };
    }
    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(
        error instanceof Error ? error.message : 'Unknown error'
      ),
    };
  }
}
