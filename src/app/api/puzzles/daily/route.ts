import { NextResponse } from 'next/server';
import { fetchLichessDailyPuzzle } from '@/lib/puzzles/lichess';

/**
 * GET /api/puzzles/daily
 *
 * Returns the normalized daily puzzle from the active source (Lichess Phase 1).
 * Server caches the Lichess response for 30 minutes via Next.js fetch cache,
 * so this endpoint is safe to call on every page load.
 */
export async function GET() {
  try {
    const puzzle = await fetchLichessDailyPuzzle();
    return NextResponse.json(puzzle, {
      headers: {
        'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
      },
    });
  } catch (error) {
    console.error('[/api/puzzles/daily] Error fetching daily puzzle:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch daily puzzle. Please try again later.',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 502 }
    );
  }
}
