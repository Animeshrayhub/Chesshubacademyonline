import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabaseServer';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { savePuzzleResult } from '@/lib/puzzles/results';
import type { PuzzleResult } from '@/lib/puzzles/types';
import { parseStudentStats, serializeStudentStats } from '@/lib/students/stats';

/**
 * POST /api/puzzles/result
 *
 * Saves a puzzle solve result for the currently authenticated student.
 * Body: PuzzleResult JSON
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 300): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve student profile using admin client (since RLS might restrict student profiles access depending on config)
    const admin = createSupabaseAdmin();
    let { data: profile } = await admin
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      const { data: newProfile } = await admin
        .from('student_profiles')
        .insert({ user_id: user.id, level: 'Beginner' })
        .select('id')
        .single();
      profile = newProfile;
    }

    if (!profile) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    const body: PuzzleResult = await req.json();

    // Basic validation
    if (
      !body.puzzleId ||
      !body.puzzleSource ||
      typeof body.solved !== 'boolean' ||
      typeof body.attempts !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid puzzle result payload' },
        { status: 400 }
      );
    }

    // Normalize puzzleSource to 'lichess' | 'chesshub'
    const rawSource = String(body.puzzleSource || '').toLowerCase();
    const normalizedSource: 'lichess' | 'chesshub' = rawSource === 'academy' || rawSource === 'chesshub' ? 'chesshub' : 'lichess';
    body.puzzleSource = normalizedSource;

    const studentProfileId = profile.id;

    const result = await withRetry(async () => {
      const res = await savePuzzleResult(studentProfileId, body);
      if (!res.success) {
        throw new Error(res.error.message);
      }
      return res;
    });

    let serverTacticalRating = 1200;
    let ratingDelta = 0;
    let xpGain = 0;
    let newStreak = 0;
    let totalSolved = 0;
    let totalAttempted = 0;
    let reviewMistakes: string[] = [];

    try {
      const prof = await withRetry(async () => {
        const { data, error } = await admin
          .from('student_profiles')
          .select('notes')
          .eq('id', studentProfileId)
          .single();
        if (error) throw error;
        return data;
      });

      if (prof) {
        const stats = parseStudentStats(prof.notes);
        const currentRating = typeof stats.tacticalRating === 'number' && stats.tacticalRating >= 400 ? stats.tacticalRating : 1200;
        const puzzleRating = typeof body.puzzleRating === 'number' && body.puzzleRating > 0 ? body.puzzleRating : currentRating;

        // Server-Side Elo Calculation (Anti-Cheat Single Source of Truth)
        const kFactor = 32;
        const expectedScore = 1 / (1 + Math.pow(10, (puzzleRating - currentRating) / 400));
        const actualScore = body.solved ? 1 : 0;
        ratingDelta = Math.round(kFactor * (actualScore - expectedScore));

        const hintsUsed = typeof (body as any).hintsUsed === 'number' ? (body as any).hintsUsed : 0;

        if (body.solved) {
          if (hintsUsed > 0) {
            ratingDelta = Math.max(2, Math.round(ratingDelta * 0.5));
            xpGain = 5;
          } else {
            if (ratingDelta < 5) ratingDelta = 5;
            xpGain = 10;
          }
          stats.xp += xpGain;
          stats.puzzlesSolved = (stats.puzzlesSolved || 0) + 1;
          stats.puzzleStreak = (stats.puzzleStreak || 0) + 1;
          stats.reviewMistakes = (stats.reviewMistakes || []).filter((id) => id !== body.puzzleId);
        } else {
          // Failed or forfeited
          if (ratingDelta > -5) ratingDelta = -5;
          if (ratingDelta < -20) ratingDelta = -20;
          stats.puzzleStreak = 0;
          if (!stats.reviewMistakes) stats.reviewMistakes = [];
          if (body.puzzleId && !stats.reviewMistakes.includes(body.puzzleId)) {
            stats.reviewMistakes.push(body.puzzleId);
          }
        }

        stats.puzzlesAttempted = (stats.puzzlesAttempted || 0) + 1;
        serverTacticalRating = Math.max(400, currentRating + ratingDelta);
        stats.tacticalRating = serverTacticalRating;

        newStreak = stats.puzzleStreak || 0;
        totalSolved = stats.puzzlesSolved || 0;
        totalAttempted = stats.puzzlesAttempted || 0;
        reviewMistakes = stats.reviewMistakes || [];

        const updatedNotes = serializeStudentStats(prof.notes, stats);
        await withRetry(async () => {
          const { error } = await admin
            .from('student_profiles')
            .update({ notes: updatedNotes })
            .eq('id', studentProfileId);
          if (error) throw error;
        });
      }
    } catch (err) {
      console.error('Failed to sync student tactical stats server-side:', err);
    }

    return NextResponse.json({
      id: result.data.id,
      tacticalRating: serverTacticalRating,
      ratingDelta,
      xpGain,
      streak: newStreak,
      puzzlesSolved: totalSolved,
      puzzlesAttempted: totalAttempted,
      reviewMistakes,
    }, { status: 201 });
  } catch (error) {
    console.error('[/api/puzzles/result] Error saving puzzle result:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from('student_profiles')
      .select('notes')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ success: true, stats: null });
    }

    const stats = parseStudentStats(profile.notes);
    return NextResponse.json({
      success: true,
      stats: {
        tacticalRating: stats.tacticalRating || 1200,
        totalSolved: stats.puzzlesSolved || 0,
        totalAttempted: stats.puzzlesAttempted || 0,
        currentStreak: stats.puzzleStreak || 0,
        reviewMistakes: stats.reviewMistakes || [],
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
