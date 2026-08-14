import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getOpeningById, getOpeningChapters, getChapterPositions } from '@/lib/openings';

export const dynamic = 'force-dynamic';

/**
 * GET /api/opening/[id]/export-pgn
 * Generates and downloads a complete .pgn study file with move comments
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT' && user.role !== 'COACH' && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [openingRes, chaptersRes] = await Promise.all([
      getOpeningById(params.id),
      getOpeningChapters(params.id),
    ]);

    if (!openingRes.success || !openingRes.data) {
      return NextResponse.json({ error: 'Opening not found' }, { status: 404 });
    }

    const opening = openingRes.data;
    const chapters = chaptersRes.data;

    // Build PGN Study Content
    let pgnContent = `[Event "ChessHub Academy Opening Study"]\n`;
    pgnContent += `[Site "ChessHub Academy"]\n`;
    pgnContent += `[Date "${new Date().toISOString().split('T')[0]}"]\n`;
    pgnContent += `[ECO "${opening.eco_code}"]\n`;
    pgnContent += `[Opening "${opening.name}"]\n`;
    pgnContent += `[Annotator "ChessHub AI Coach"]\n`;
    pgnContent += `[Result "*"]\n\n`;

    // Add main moves with comments
    if (opening.description) {
      pgnContent += `{ ${opening.description.replace(/[{}]/g, '')} }\n`;
    }

    pgnContent += `${opening.opening_moves} `;

    // Add chapter notes as PGN comments
    chapters.forEach(ch => {
      if (ch.beginner_content) {
        const cleanContent = ch.beginner_content.replace(/[{}]/g, '').replace(/\n+/g, ' ');
        pgnContent += `{ [Chapter ${ch.chapter_num}: ${ch.title}] ${cleanContent} }\n`;
      }
    });

    pgnContent += ` *\n`;

    const fileName = `${opening.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_study.pgn`;

    return new NextResponse(pgnContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/x-chess-pgn',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error('[GET /api/opening/[id]/export-pgn]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
