import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getStudentMistakes } from '@/lib/openings';

export const dynamic = 'force-dynamic';

/**
 * GET /api/opening/revision — List unresolved student mistakes for practice
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { searchParams } = new URL(request.url);
    const openingId = searchParams.get('opening_id') ?? undefined;

    const result = await getStudentMistakes(user.id, openingId, false);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ data: result.data });
  } catch (err) {
    console.error('[GET /api/opening/revision]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/opening/revision — Record revision attempt & update recovery count
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { mistake_id, is_success } = body;

    if (!mistake_id) {
      return NextResponse.json({ error: 'Missing mistake_id' }, { status: 400 });
    }

    const supabase = createSupabaseServer();

    // Fetch existing mistake
    const { data: mistake } = await supabase
      .from('student_opening_mistakes')
      .select('id, successful_recovery_count')
      .eq('id', mistake_id)
      .eq('student_id', user.id)
      .single();

    if (!mistake) {
      return NextResponse.json({ error: 'Mistake not found' }, { status: 404 });
    }

    const newRecoveryCount = is_success
      ? (mistake.successful_recovery_count ?? 0) + 1
      : mistake.successful_recovery_count;

    // Resolve if successfully recovered 3+ times
    const isResolved = newRecoveryCount >= 3;

    const { error } = await supabase
      .from('student_opening_mistakes')
      .update({
        successful_recovery_count: newRecoveryCount,
        is_resolved: isResolved,
        last_attempted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', mistake.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      newRecoveryCount,
      isResolved,
    });
  } catch (err) {
    console.error('[POST /api/opening/revision]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
