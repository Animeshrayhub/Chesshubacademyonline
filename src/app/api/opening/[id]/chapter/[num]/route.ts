import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import {
  getOpeningChapter,
  getChapterPositions,
  getStudentChapterProgress,
  upsertChapterProgress,
} from '@/lib/openings';

export const dynamic = 'force-dynamic';

/** GET /api/opening/[id]/chapter/[num] — chapter content + positions + student progress */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; num: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const chapterNum = parseInt(params.num, 10);
    if (isNaN(chapterNum) || chapterNum < 1 || chapterNum > 8) {
      return NextResponse.json({ error: 'Invalid chapter number' }, { status: 400 });
    }

    const [chapterRes, progressRes] = await Promise.all([
      getOpeningChapter(params.id, chapterNum),
      // We'll get chapter progress after we have the chapter ID
      Promise.resolve(null),
    ]);

    if (!chapterRes.success || !chapterRes.data) {
      return NextResponse.json({ error: 'Chapter not found' }, { status: 404 });
    }

    const chapter = chapterRes.data;

    const [positionsRes, chapterProgressRes] = await Promise.all([
      getChapterPositions(chapter.id),
      getStudentChapterProgress(user.id, chapter.id),
    ]);

    // If chapter is not unlocked and not chapter 1, block access
    const progress = chapterProgressRes.data;
    if (chapterNum > 1 && (!progress || !progress.is_unlocked)) {
      return NextResponse.json({ error: 'Chapter not unlocked yet' }, { status: 403 });
    }

    // Mark chapter as in_progress if not already
    if (!progress || progress.status === 'unlocked') {
      await upsertChapterProgress(user.id, chapter.id, params.id, {
        status: 'in_progress',
        started_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      data: {
        chapter,
        positions: positionsRes.data,
        progress: chapterProgressRes.data,
      },
    });
  } catch (err) {
    console.error('[GET /api/opening/[id]/chapter/[num]]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
