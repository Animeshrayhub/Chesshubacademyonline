import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabaseServer';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { saveSavedGame, getStudentSavedGames } from '@/lib/games';

/**
 * GET /api/games
 * Returns list of saved games for the authenticated student.
 */
export async function GET() {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const result = await getStudentSavedGames(profile.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('[/api/games] GET Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/games
 * Saves a new PGN or Lichess URL game for the student.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: 'Student profile not found' }, { status: 404 });
    }

    const body = await req.json();
    const { title, pgn, lichessUrl } = body;

    if (!title) {
      return NextResponse.json({ error: 'Game title is required' }, { status: 400 });
    }

    const result = await saveSavedGame(profile.id, title, pgn, lichessUrl);
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json(result.data, { status: 201 });
  } catch (error) {
    console.error('[/api/games] POST Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
