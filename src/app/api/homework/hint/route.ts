import { NextRequest, NextResponse } from 'next/server';
import { requestHint } from '@/lib/homework/puzzles';
import { BaseError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** POST /api/homework/hint
 *  Body: { assignmentId, puzzleId, hintLevel }
 *  Returns hint text and deducts points from attempt score.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignmentId, puzzleId, hintLevel } = body;

    if (!assignmentId || !puzzleId || ![1, 2, 3].includes(hintLevel)) {
      return NextResponse.json({ error: 'assignmentId, puzzleId, and hintLevel (1-3) are required' }, { status: 400 });
    }

    const result = await requestHint(assignmentId, puzzleId, hintLevel as 1 | 2 | 3);
    if (!result.success) {
      const err = result.error as BaseError;
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    return NextResponse.json({ hint: result.data });
  } catch (err) {
    console.error('[POST /api/homework/hint]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
