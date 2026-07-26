import { NextRequest, NextResponse } from 'next/server';
import { unlockSolution, coachUnlockNextChapter } from '@/lib/homework/puzzles';
import { BaseError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** POST /api/homework/unlock
 *  Body (student unlock solution): { type: 'solution', assignmentId, puzzleId }
 *  Body (coach unlock chapter):    { type: 'chapter',  assignmentId }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, assignmentId, puzzleId } = body;

    if (!type || !assignmentId) {
      return NextResponse.json({ error: 'type and assignmentId are required' }, { status: 400 });
    }

    if (type === 'solution') {
      if (!puzzleId) return NextResponse.json({ error: 'puzzleId is required for solution unlock' }, { status: 400 });
      const result = await unlockSolution(assignmentId, puzzleId);
      if (!result.success) {
        const err = result.error as BaseError;
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ unlock: result.data });
    }

    if (type === 'chapter') {
      const result = await coachUnlockNextChapter(assignmentId);
      if (!result.success) {
        const err = result.error as BaseError;
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      return NextResponse.json({ unlock: result.data });
    }

    return NextResponse.json({ error: 'Invalid unlock type. Use "solution" or "chapter".' }, { status: 400 });
  } catch (err) {
    console.error('[POST /api/homework/unlock]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
