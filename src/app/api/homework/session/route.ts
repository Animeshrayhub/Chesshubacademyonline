import { NextRequest, NextResponse } from 'next/server';
import { getChapterPuzzlesForStudent } from '@/lib/homework/puzzles';
import { BaseError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** GET /api/homework/session?assignmentId=xxx
 *  Returns sanitized puzzle list for a student's assignment.
 *  Never exposes solution unless solution_unlocked = true in DB.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const assignmentId = searchParams.get('assignmentId');
    if (!assignmentId) {
      return NextResponse.json({ error: 'assignmentId is required' }, { status: 400 });
    }
    const result = await getChapterPuzzlesForStudent(assignmentId);
    if (!result.success) {
      const err = result.error as BaseError;
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ puzzles: result.data });
  } catch (err) {
    console.error('[GET /api/homework/session]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
