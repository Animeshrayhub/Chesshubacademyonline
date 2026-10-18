import { NextRequest, NextResponse } from 'next/server';
import { importLichessTournamentFromUrl } from '@/services/lichessEvents';
import { checkDuplicateEvent } from '@/lib/events';
import { getCurrentUser } from '@/lib/supabase/auth';

/**
 * POST /api/events/import-lichess
 *
 * Admin-only endpoint.
 * Accepts a Lichess tournament URL, fetches the Lichess API server-side,
 * returns a preview for admin review. Does NOT write to database.
 *
 * Body: { url: string }
 * Response: { preview: LichessImportPreview } | { error: string }
 */
export async function POST(req: NextRequest) {
  try {
    // Auth check
    const user = await getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const url: string = body?.url ?? '';

    if (!url.trim()) {
      return NextResponse.json(
        { error: 'Please provide a Lichess tournament URL.' },
        { status: 400 }
      );
    }

    const result = await importLichessTournamentFromUrl(url.trim());

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 422 });
    }

    // Check if this tournament ID is already imported
    const dup = await checkDuplicateEvent('LICHESS', result.preview.tournamentId);
    if (dup.exists) {
      return NextResponse.json(
        {
          error: `This Lichess tournament is already connected to: "${dup.existingTitle || 'Existing Event'}"`,
          existingTitle: dup.existingTitle,
        },
        { status: 409 } // Conflict
      );
    }

    return NextResponse.json({ preview: result.preview }, { status: 200 });
  } catch (err) {
    console.error('[/api/events/import-lichess] error:', err);
    return NextResponse.json(
      { error: 'An unexpected error occurred. Please try again.' },
      { status: 500 }
    );
  }
}
