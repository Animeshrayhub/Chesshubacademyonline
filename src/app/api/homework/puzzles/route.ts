import { NextRequest, NextResponse } from 'next/server';
import { listPuzzles, createPuzzle } from '@/lib/homework/puzzles';
import { BaseError } from '@/lib/errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const theme      = searchParams.get('theme')      || undefined;
    const difficulty = searchParams.get('difficulty') || undefined;
    const isActive   = searchParams.get('active') === 'false' ? false : true;

    const result = await listPuzzles({ theme, difficulty, isActive });
    if (!result.success) {
      const err = result.error as BaseError;
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ puzzles: result.data });
  } catch (err) {
    console.error('[GET /api/homework/puzzles]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = await createPuzzle(body);
    if (!result.success) {
      const err = result.error as BaseError;
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json({ puzzle: result.data }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/homework/puzzles]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
