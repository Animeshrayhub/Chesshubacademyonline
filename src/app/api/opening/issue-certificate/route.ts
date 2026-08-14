import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getOpeningById, getStudentOpeningScores } from '@/lib/openings';

export const dynamic = 'force-dynamic';

/**
 * POST /api/opening/issue-certificate
 * Auto-issues an Opening Mastery Certificate upon achieving 90%+ score
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { opening_id } = body;

    if (!opening_id) {
      return NextResponse.json({ error: 'Missing opening_id' }, { status: 400 });
    }

    const [openingRes, scoresRes] = await Promise.all([
      getOpeningById(opening_id),
      getStudentOpeningScores(user.id, opening_id),
    ]);

    if (!openingRes.success || !openingRes.data) {
      return NextResponse.json({ error: 'Opening not found' }, { status: 404 });
    }

    const opening = openingRes.data;
    const scores = scoresRes.data;
    const overallScore = scores?.overall_score ?? 0;

    if (overallScore < 100) {
      return NextResponse.json({
        error: 'Mastery requirement not met. Must achieve 100% overall score.',
        currentScore: overallScore,
      }, { status: 400 });
    }

    const adminSupabase = createSupabaseAdmin();
    const certTitle = `${opening.name} Master Certificate`;

    // Check if certificate already issued
    const { data: existing } = await adminSupabase
      .from('certificates')
      .select('id')
      .eq('student_id', user.id)
      .eq('title', certTitle)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, certificate_id: existing.id, isNew: false });
    }

    // Insert new certificate
    const { data: newCert, error: certError } = await adminSupabase
      .from('certificates')
      .insert({
        student_id: user.id,
        title: certTitle,
        issued_date: new Date().toISOString().split('T')[0],
        track_type: opening.name,
      })
      .select()
      .single();

    if (certError) {
      return NextResponse.json({ error: certError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      certificate_id: newCert.id,
      isNew: true,
    });
  } catch (err) {
    console.error('[POST /api/opening/issue-certificate]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
