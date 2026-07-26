import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabaseServer';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { deleteSavedGame } from '@/lib/games';

/**
 * DELETE /api/games/[id]
 * Deletes a saved game for the authenticated student.
 */
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
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

    const result = await deleteSavedGame(params.id, profile.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[/api/games/[id]] DELETE Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
