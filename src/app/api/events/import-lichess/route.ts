import { NextRequest, NextResponse } from 'next/server';
import { importLichessTournamentFromUrl } from '@/services/lichessEvents';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
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
    const admin = createSupabaseAdmin();
    const { data: existing } = await admin
      .from('events')
      .select('id, title, status')
      .eq('external_provider', 'LICHESS')
      .eq('external_id', result.preview.tournamentId)
      .is('archived_at', null)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        {
          error: 'This Lichess tournament is already connected to a ChessHub event.',
          existingEventId: existing.id,
          existingTitle: existing.title,
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
