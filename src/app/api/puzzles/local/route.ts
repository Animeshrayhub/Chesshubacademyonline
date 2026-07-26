import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';

/**
 * GET /api/puzzles/local
 *
 * Query params:
 *   ?rating=800        - puzzles in rating band (800,1000,1200,1400,1600,1900,2200)
 *   ?theme=fork        - puzzles by theme
 *   ?difficulty=Easy   - puzzles by difficulty name
 *   ?count=10          - how many to return (default 5, max 50)
 *   ?random=true       - randomize (default true)
 *   ?exclude=id1,id2   - puzzle IDs to exclude (already seen)
 *
 * Returns: { puzzles: CompactPuzzle[], total: number, source: "local" }
 */

const PUZZLES_DIR = path.join(process.cwd(), 'public', 'puzzles');

const RATING_MAP: Record<string, string> = {
  '800': '800', '1000': '1000', '1200': '1200',
  '1400': '1400', '1600': '1600', '1900': '1900', '2200': '2200',
  'beginner': '800', 'easy': '1000', 'intermediate': '1200',
  'medium': '1400', 'hard': '1600', 'expert': '1900', 'master': '2200',
};

function loadJson(filePath: string): any[] {
  if (!existsSync(filePath)) return [];
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rating    = searchParams.get('rating')?.toLowerCase() || '';
  const theme     = searchParams.get('theme') || '';
  const count     = Math.min(50, Math.max(1, parseInt(searchParams.get('count') || '5', 10)));
  const excludeRaw = searchParams.get('exclude') || '';
  const excludeIds = new Set(excludeRaw ? excludeRaw.split(',') : []);

  // Check if puzzle files exist at all
  const indexPath = path.join(PUZZLES_DIR, 'index.json');
  if (!existsSync(indexPath)) {
    return NextResponse.json(
      {
        error: 'Local puzzle database not generated yet.',
        hint: 'Run: node scripts/extract-puzzles.mjs',
        puzzles: [],
        total: 0,
        source: 'local',
      },
      { status: 404 }
    );
  }

  let puzzles: any[] = [];

  // Load by theme first (more specific), then rating band, then all
  if (theme) {
    const themePath = path.join(PUZZLES_DIR, 'by-theme', `${theme}.json`);
    puzzles = loadJson(themePath);
  } else if (rating && RATING_MAP[rating]) {
    const ratingPath = path.join(PUZZLES_DIR, 'by-rating', `${RATING_MAP[rating]}.json`);
    puzzles = loadJson(ratingPath);
  } else {
    puzzles = loadJson(path.join(PUZZLES_DIR, 'all.json'));
  }

  // Filter out already-seen puzzles
  if (excludeIds.size > 0) {
    puzzles = puzzles.filter((p: any) => !excludeIds.has(p.id));
  }

  // Shuffle and slice
  for (let i = puzzles.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [puzzles[i], puzzles[j]] = [puzzles[j], puzzles[i]];
  }

  const results = puzzles.slice(0, count);

  return NextResponse.json(
    { puzzles: results, total: puzzles.length, source: 'local' },
    {
      headers: {
        'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
      },
    }
  );
}
