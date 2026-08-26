import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/coach/openings — List students, coaches, and opening progress
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = createSupabaseAdmin();

    // 1. Fetch all students in academy
    const { data: allStudents, error: studentError } = await adminSupabase
      .from('students')
      .select('id, current_track, fid_rating, lichess_rating, assigned_coach_id');

    if (studentError) {
      return NextResponse.json({ error: studentError.message }, { status: 500 });
    }

    const studentList = (allStudents as any[]) ?? [];

    // Filter students for coach (or keep all for admin)
    const assignedStudents = user.role === 'COACH'
      ? studentList.filter((s: any) => s.assigned_coach_id === user.id)
      : studentList;

    const studentIds = studentList.map((s: any) => s.id);

    // 2. Fetch user profile names for all students
    const { data: userProfiles } = studentIds.length > 0
      ? await adminSupabase.from('users').select('id, username, first_name, last_name, email, role').in('id', studentIds)
      : { data: [] };

    // 3. Fetch all coaches in academy for Admin filter dropdown
    const { data: coaches } = await adminSupabase
      .from('users')
      .select('id, username, first_name, last_name, email')
      .eq('role', 'COACH');

    // 4. Fetch progress, scores, and chapter progress
    const [progressRes, scoresRes, chapterProgressRes] = studentIds.length > 0
      ? await Promise.all([
          adminSupabase.from('student_opening_progress').select('*').in('student_id', studentIds),
          adminSupabase.from('student_opening_scores').select('*').in('student_id', studentIds),
          adminSupabase.from('student_chapter_progress').select('*').in('student_id', studentIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];

    return NextResponse.json({
      data: {
        students: assignedStudents,
        allStudents: studentList,
        coaches: coaches ?? [],
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
 * POST /api/coach/openings — Apply coach & admin overrides and assignments
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { action, student_id, student_ids, opening_id, chapter_id, difficulty_override, is_unlocked, current_track, coach_id } = body;

    const adminSupabase = createSupabaseAdmin();

    switch (action) {
      case 'assign_student': {
        if (!student_id) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
        const targetCoach = coach_id || user.id;
        const { error } = await adminSupabase
          .from('students')
          .update({ assigned_coach_id: targetCoach })
          .eq('id', student_id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case 'assign_unassigned_students': {
        const targetStudentIds = student_ids || (student_id ? [student_id] : []);
        if (targetStudentIds.length === 0) return NextResponse.json({ error: 'No student IDs provided' }, { status: 400 });
        const targetCoach = coach_id || user.id;

        const { error } = await adminSupabase
          .from('students')
          .update({ assigned_coach_id: targetCoach })
          .in('id', targetStudentIds);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case 'unassign_student': {
        if (!student_id) return NextResponse.json({ error: 'Missing student_id' }, { status: 400 });
        const { error } = await adminSupabase
          .from('students')
          .update({ assigned_coach_id: null })
          .eq('id', student_id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case 'change_student_track': {
        if (!student_id || !current_track) {
          return NextResponse.json({ error: 'Missing student_id or current_track' }, { status: 400 });
        }
        const { error } = await adminSupabase
          .from('students')
          .update({ current_track })
          .eq('id', student_id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case 'assign_opening': {
        if (!student_id || !opening_id) {
          return NextResponse.json({ error: 'Missing student_id or opening_id' }, { status: 400 });
        }
        const { error } = await adminSupabase
          .from('student_opening_progress')
          .upsert(
            {
              student_id,
              opening_id,
              status: 'assigned',
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'student_id,opening_id' }
          );

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });
        return NextResponse.json({ success: true });
      }

      case 'difficulty_override': {
        if (!student_id || !opening_id) {
          return NextResponse.json({ error: 'Missing student_id or opening_id' }, { status: 400 });
        }
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
        if (!student_id || !opening_id || !chapter_id) {
          return NextResponse.json({ error: 'Missing student_id, opening_id, or chapter_id' }, { status: 400 });
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
        if (!student_id || !opening_id) {
          return NextResponse.json({ error: 'Missing student_id or opening_id' }, { status: 400 });
        }

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
