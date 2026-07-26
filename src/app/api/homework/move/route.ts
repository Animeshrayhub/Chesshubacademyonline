import { NextRequest, NextResponse } from 'next/server';
import { submitPuzzleMove } from '@/lib/homework/puzzles';
import { BaseError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

/** POST /api/homework/move
 *  Body: { assignmentId, puzzleId, uciMove, timeSeconds }
 *  Validates move server-side — solution NEVER exposed to client.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { assignmentId, puzzleId, uciMove, timeSeconds } = body;

    if (!assignmentId || !puzzleId || !uciMove) {
      return NextResponse.json({ error: 'assignmentId, puzzleId, uciMove are required' }, { status: 400 });
    }

    const result = await submitPuzzleMove(
      assignmentId,
      puzzleId,
      String(uciMove),
      Number(timeSeconds) || 0
    );

    if (!result.success) {
      const err = result.error as BaseError;
      return NextResponse.json({ error: err.message }, { status: err.status });
    }

    return NextResponse.json({ result: result.data });
  } catch (err) {
    console.error('[POST /api/homework/move]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
