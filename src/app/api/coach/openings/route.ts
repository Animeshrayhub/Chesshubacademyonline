import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseServer } from '@/lib/supabase/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coach/openings — List coach's assigned students and their opening progress
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = createSupabaseAdmin();

    // 1. Fetch coach's assigned students
    let studentQuery = adminSupabase
      .from('students')
      .select('id, current_track, fid_rating, lichess_rating');

    if (user.role === 'COACH') {
      studentQuery = studentQuery.eq('assigned_coach_id', user.id);
    }

    const { data: students, error: studentError } = await studentQuery;
    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }

    const studentIds = ((students as any[]) ?? []).map((s: any) => s.id);
    if (studentIds.length === 0) {
      return NextResponse.json({ data: { students: [], progress: [], scores: [], userProfiles: [] } });
    }

    // 2. Fetch user profile names
    const { data: userProfiles } = await adminSupabase
      .from('users')
      .select('id, username, first_name, last_name, email')
      .in('id', studentIds);

    // 3. Fetch progress & scores for these students
    const [progressRes, scoresRes, chapterProgressRes] = await Promise.all([
      adminSupabase.from('student_opening_progress').select('*').in('student_id', studentIds),
      adminSupabase.from('student_opening_scores').select('*').in('student_id', studentIds),
      adminSupabase.from('student_chapter_progress').select('*').in('student_id', studentIds),
    ]);

    return NextResponse.json({
      data: {
        students: students ?? [],
        userProfiles: userProfiles ?? [],
        progress: progressRes.data ?? [],
        scores: scoresRes.data ?? [],
        chapterProgress: chapterProgressRes.data ?? [],
      },
    });
  } catch (err) {
    console.error('[GET /api/coach/openings]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/coach/openings — Apply coach overrides
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, student_id, opening_id, chapter_id, difficulty_override, is_unlocked } = body;

    if (!student_id || !opening_id) {
      return NextResponse.json({ error: 'Missing student_id or opening_id' }, { status: 400 });
    }

    const adminSupabase = createSupabaseAdmin();

    switch (action) {
      case 'difficulty_override': {
        const { error } = await adminSupabase
          .from('student_opening_progress')
          .upsert(
            {
              student_id,
              opening_id,
              difficulty_override,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'student_id,opening_id' }
          );

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case 'chapter_lock_toggle': {
        if (!chapter_id) {
          return NextResponse.json({ error: 'Missing chapter_id' }, { status: 400 });
        }

        const { error } = await adminSupabase
          .from('student_chapter_progress')
          .upsert(
            {
              student_id,
              opening_id,
              chapter_id,
              is_unlocked,
              status: is_unlocked ? 'unlocked' : 'locked',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'student_id,chapter_id' }
          );

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case 'reset_progress': {
        // Delete opening progress and chapter progress for this student
        await adminSupabase
          .from('student_opening_progress')
          .delete()
          .eq('student_id', student_id)
          .eq('opening_id', opening_id);

        await adminSupabase
          .from('student_chapter_progress')
          .delete()
          .eq('student_id', student_id)
          .eq('opening_id', opening_id);

        return NextResponse.json({ success: true });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('[POST /api/coach/openings]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
