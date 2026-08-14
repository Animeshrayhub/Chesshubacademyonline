import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getOpeningDetail, initializeOpeningForStudent } from '@/lib/openings';

export const dynamic = 'force-dynamic';

/** GET /api/opening/[id] — get opening detail with chapters + student progress */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const result = await getOpeningDetail(params.id, user.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 404 });
    }

    return NextResponse.json({ data: result.data });
  } catch (err) {
    console.error('[GET /api/opening/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** POST /api/opening/[id] — initialize opening (unlock chapter 1) */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const result = await initializeOpeningForStudent(user.id, params.id);
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[POST /api/opening/[id]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
