import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { upsertChapterProgress, upsertOpeningProgress, recordMistake, updateOpeningScores } from '@/lib/openings';
import type { MistakeType } from '@/types/opening-teacher';

export const dynamic = 'force-dynamic';

/**
 * POST /api/opening/progress
 * Save student progress: chapter completion, scores, mistakes
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { type, ...data } = body;

    if (!type) {
      return NextResponse.json({ error: 'Missing type' }, { status: 400 });
    }

    switch (type) {
      case 'chapter_progress': {
        const { chapter_id, opening_id, status, score, positions_attempted, positions_correct, hints_used, time_spent_seconds } = data;
        if (!chapter_id || !opening_id) {
          return NextResponse.json({ error: 'Missing chapter_id or opening_id' }, { status: 400 });
        }

        const result = await upsertChapterProgress(user.id, chapter_id, opening_id, {
          status,
          score: score ?? 0,
          positions_attempted: positions_attempted ?? 0,
          positions_correct: positions_correct ?? 0,
          hints_used: hints_used ?? 0,
          time_spent_seconds: time_spent_seconds ?? 0,
          ...(status === 'completed' ? { completed_at: new Date().toISOString() } : {}),
        });

        return NextResponse.json(result.success ? { success: true } : { error: result.error }, {
          status: result.success ? 200 : 500,
        });
      }

      case 'mistake': {
        const {
          opening_id,
          chapter_id,
          position_id,
          position_fen,
          student_move,
          expected_move,
          mistake_type,
          eval_diff,
        } = data;

        if (!opening_id || !position_fen || !student_move || !expected_move || !mistake_type) {
          return NextResponse.json({ error: 'Missing required fields for mistake' }, { status: 400 });
        }

        const result = await recordMistake(
          user.id,
          opening_id,
          chapter_id ?? null,
          position_id ?? null,
          position_fen,
          student_move,
          expected_move,
          mistake_type as MistakeType,
          eval_diff
        );

        return NextResponse.json(result.success ? { success: true } : { error: result.error }, {
          status: result.success ? 200 : 500,
        });
      }

      case 'scores': {
        const { opening_id, ...scores } = data;
        if (!opening_id) {
          return NextResponse.json({ error: 'Missing opening_id' }, { status: 400 });
        }

        const result = await updateOpeningScores(user.id, opening_id, scores);
        return NextResponse.json(result.success ? { success: true } : { error: result.error }, {
          status: result.success ? 200 : 500,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown progress type: ${type}` }, { status: 400 });
    }
  } catch (err) {
    console.error('[POST /api/opening/progress]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
