import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getAcademyLeaderboard } from '@/lib/students/leaderboard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    const result = await getAcademyLeaderboard(user?.id);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error ? (result.error as any).message : 'Failed to retrieve leaderboard' },
        { status: 500 }
      );
    }

    return NextResponse.json(result.data, {
      status: 200,
      headers: {
        'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60',
      },
    });
  } catch (error: any) {
    console.error('[API /api/leaderboard] Error:', error);
    return NextResponse.json(
      { error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
