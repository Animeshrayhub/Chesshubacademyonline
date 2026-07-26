import { NextRequest, NextResponse } from 'next/server';
import { getHomeworkProgress, getAssignmentAttempts } from '@/lib/homework/puzzles';
import { BaseError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** GET /api/homework/progress?assignmentId=xxx
 *  Returns aggregate progress and per-puzzle attempt state.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');
    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
    }

    const [progressRes, attemptsRes] = await Promise.all([
      getHomeworkProgress(assignmentId),
      getAssignmentAttempts(assignmentId),
    ]);

    if (!progressRes.success) {
      const err = progressRes.error as BaseError;
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    return NextResponse.json({
      progress: progressRes.data,
      attempts: attemptsRes.success ? attemptsRes.data : [],
    });
  } catch (err) {
    console.error('[GET /api/homework/progress]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
