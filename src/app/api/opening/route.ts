import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getOpeningsWithProgress } from '@/lib/openings';

export const dynamic = 'force-dynamic';

/** GET /api/opening — list all openings with student progress */
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'STUDENT') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const difficulty = searchParams.get('difficulty') as 'Beginner' | 'Intermediate' | 'Advanced' | null;

    const result = await getOpeningsWithProgress(user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    // Filter by difficulty if requested
    const filtered = difficulty
      ? result.data.filter(o => o.difficulty === difficulty)
      : result.data;

    return NextResponse.json({ data: filtered });
  } catch (err) {
    console.error('[GET /api/opening]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
