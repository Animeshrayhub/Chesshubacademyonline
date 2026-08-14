import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import {
  fetchLichessVolumeTsv,
  processLichessOpeningsBatch,
} from '@/lib/openings/lichess-processor';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/openings/ingest
 * Admin API route to run Lichess Opening Processor pipeline
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Forbidden. Admin access required.' }, { status: 403 });

    const body = await request.json();
    const { volume = 'C', limit = 20 } = body;

    const volumeLetter = volume.toLowerCase();
    if (!['a', 'b', 'c', 'd', 'e'].includes(volumeLetter)) {
      return NextResponse.json({ error: 'Invalid volume. Must be A, B, C, D, or E.' }, { status: 400 });
    }

    // 1. Download volume TSV from Lichess repo
    const rawOpenings = await fetchLichessVolumeTsv(volumeLetter);

    // 2. Process and insert batch
    const result = await processLichessOpeningsBatch(volumeLetter, rawOpenings, limit);

    return NextResponse.json({
      success: true,
      data: result,
      totalVolumeOpeningsAvailable: rawOpenings.length,
    });
  } catch (err: any) {
    console.error('[POST /api/admin/openings/ingest]', err);
    return NextResponse.json({ error: err?.message || 'Internal server error' }, { status: 500 });
  }
}
