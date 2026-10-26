import { NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import path from 'path';
import {
  isR2Configured,
  getPuzzleById,
  getPuzzlesByRatingBand,
  getPuzzlesByTheme,
  mapDifficultyToBandKey,
} from '@/lib/r2/puzzles';

export const dynamic = 'force-dynamic';

/**
 * GET /api/puzzles/local
 *
 * Serves puzzles from Cloudflare R2 storage with local fallback.
 *
 * Query params:
 *   ?puzzleId=00008    - lookup specific puzzle by ID
 *   ?rating=800        - puzzles in rating band (800,1000,1200,1400,1600,1900,2200)
 *   ?theme=fork        - puzzles by theme (any of 73 themes)
 *   ?difficulty=Easy   - puzzles by difficulty name
 *   ?count=10          - how many to return (default 5, max 50)
 *   ?exclude=id1,id2   - puzzle IDs to exclude (already seen)
 *
 * Returns: { puzzles: (PuzzleData & CompactRaw)[], total: number, source: "r2" | "local" }
 */

const PUZZLES_DIR = path.join(process.cwd(), 'public', 'puzzles');

function loadLocalJson(filePath: string): any[] {
  if (!existsSync(filePath)) return [];
  try {
    return JSON.parse(readFileSync(filePath, 'utf-8'));
  } catch {
    return [];
  }
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const puzzleIdParam = searchParams.get('puzzleId') || searchParams.get('id');
    const ratingParam = searchParams.get('rating')?.toLowerCase() || '';
    const themeParam = searchParams.get('theme') || '';
    const diffParam = searchParams.get('difficulty')?.toLowerCase() || '';
    const count = Math.min(50, Math.max(1, parseInt(searchParams.get('count') || '5', 10)));
    const excludeRaw = searchParams.get('exclude') || '';
    const excludeIds = excludeRaw ? excludeRaw.split(',') : [];

    // 1. Primary: Cloudflare R2 Private Bucket Integration
    if (isR2Configured()) {
      let r2Puzzles: any[] = [];

      if (puzzleIdParam) {
        const single = await getPuzzleById(puzzleIdParam);
        if (single) {
          r2Puzzles = [single];
        }
      } else if (themeParam) {
        const targetBand = ratingParam || diffParam ? mapDifficultyToBandKey(ratingParam || diffParam) : undefined;
        r2Puzzles = await getPuzzlesByTheme(themeParam, {
          ratingBand: targetBand,
          count,
          excludeIds,
        });
      } else {
        const bandKey = mapDifficultyToBandKey(ratingParam || diffParam || 'intermediate');
        r2Puzzles = await getPuzzlesByRatingBand(bandKey, {
          count,
          excludeIds,
        });
      }

      if (r2Puzzles && r2Puzzles.length > 0) {
        // Format for dual compatibility: provides both standard PuzzleData and legacy Compact properties
        const enhanced = r2Puzzles.map((p) => ({
          ...p,
          moves: [p.opponentMoveUci || '', ...(p.solution || [])].filter(Boolean).join(' '),
          fen: p.preMoveFen || p.initialFen,
        }));

        return NextResponse.json(
          { puzzles: enhanced, total: enhanced.length, source: 'r2' },
          {
            headers: {
              'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
            },
          }
        );
      }
    }

    // 2. Resilient Local Filesystem Fallback
    const indexPath = path.join(PUZZLES_DIR, 'index.json');
    if (!existsSync(indexPath)) {
      return NextResponse.json(
        {
          error: 'Puzzle database currently unavailable.',
          puzzles: [],
          total: 0,
          source: 'none',
        },
        { status: 503 }
      );
    }

    let puzzles: any[] = [];
    if (themeParam) {
      const themePath = path.join(PUZZLES_DIR, 'by-theme', `${themeParam}.json`);
      puzzles = loadLocalJson(themePath);
    } else {
      puzzles = loadLocalJson(path.join(PUZZLES_DIR, 'all.json'));
    }

    const excludeSet = new Set(excludeIds);
    if (excludeSet.size > 0) {
      puzzles = puzzles.filter((p: any) => !excludeSet.has(p.id));
    }

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
  } catch (err: any) {
    console.error('[/api/puzzles/local] Error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err?.message },
      { status: 500 }
    );
  }
}
