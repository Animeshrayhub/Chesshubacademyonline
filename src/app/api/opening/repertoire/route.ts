import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseServer } from '@/lib/supabase/server';
import { SEED_OPENINGS } from '@/data/openings/seed-openings';

export const dynamic = 'force-dynamic';

/**
 * GET /api/opening/repertoire — Fetch student repertoire and coverage score
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const supabase = createSupabaseServer();
    const { data: progressList } = await supabase
      .from('student_opening_progress')
      .select('*')
      .eq('student_id', user.id);

    // Repertoire openings: openings where student has in_progress or completed status
    const activeOpeningIds = new Set(((progressList as any[]) ?? []).map((p: any) => p.opening_id));

    const whiteRepertoire = SEED_OPENINGS.filter(o => activeOpeningIds.has((o as any).id || o.eco_code) && (o.color === 'white' || o.color === 'both'));
    const blackRepertoire = SEED_OPENINGS.filter(o => activeOpeningIds.has((o as any).id || o.eco_code) && (o.color === 'black' || o.color === 'both'));

    // Repertoire coverage calculation against major 1st moves
    // 1.e4 (White), 1.d4 (White), 1.e4 (Black response), 1.d4 (Black response)
    const hasWhiteE4 = whiteRepertoire.some(o => o.opening_moves.startsWith('1.e4'));
    const hasWhiteD4 = whiteRepertoire.some(o => o.opening_moves.startsWith('1.d4'));
    const hasBlackVsE4 = blackRepertoire.some(o => o.tags.includes('e4') || o.opening_moves.includes('e4'));
    const hasBlackVsD4 = blackRepertoire.some(o => o.tags.includes('d4') || o.opening_moves.includes('d4'));

    const coveredCount = [hasWhiteE4, hasWhiteD4, hasBlackVsE4, hasBlackVsD4].filter(Boolean).length;
    const coverageScore = Math.round((coveredCount / 4) * 100);

    return NextResponse.json({
      whiteRepertoire,
      blackRepertoire,
      coverageScore,
      coverageDetails: {
        hasWhiteE4,
        hasWhiteD4,
        hasBlackVsE4,
        hasBlackVsD4,
      },
    });
  } catch (err) {
    console.error('[GET /api/opening/repertoire]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/opening/repertoire — Add/remove opening from student repertoire
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { opening_id, action } = body;

    if (!opening_id) {
      return NextResponse.json({ error: 'Missing opening_id' }, { status: 400 });
    }

    const supabase = createSupabaseServer();

    if (action === 'add') {
      await supabase.from('student_opening_progress').upsert(
        {
          student_id: user.id,
          opening_id,
          status: 'in_progress',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'student_id,opening_id' }
      );
    } else if (action === 'remove') {
      await supabase
        .from('student_opening_progress')
        .delete()
        .eq('student_id', user.id)
        .eq('opening_id', opening_id);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/opening/repertoire]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
