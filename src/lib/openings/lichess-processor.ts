// ─────────────────────────────────────────────────────────────────────────────
// ChessHub AI Opening Teacher — Lichess Openings Processor Pipeline
// ─────────────────────────────────────────────────────────────────────────────

import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { OpeningDifficulty } from '@/types/opening-teacher';

export interface LichessRawOpening {
  eco: string;
  name: string;
  pgn: string;
  uci: string;
  epd: string;
}

export interface IngestionResult {
  volume: string;
  openingsProcessed: number;
  chaptersCreated: number;
  positionsCreated: number;
  errors: string[];
}

const LICHESS_BASE_URL = 'https://raw.githubusercontent.com/lichess-org/chess-openings/master';

/**
 * Downloads and parses a Lichess TSV volume file (e.g. 'a.tsv', 'b.tsv', 'c.tsv', 'd.tsv', 'e.tsv')
 */
export async function fetchLichessVolumeTsv(volumeLetter: string): Promise<LichessRawOpening[]> {
  const url = `${LICHESS_BASE_URL}/${volumeLetter.toLowerCase()}.tsv`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Failed to fetch Lichess volume ${volumeLetter}.tsv: ${res.statusText}`);
  }

  const text = await res.text();
  const lines = text.split('\n');
  const openings: LichessRawOpening[] = [];

  // Line 0 is header: eco \t name \t pgn \t uci \t epd
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const parts = line.split('\t');
    if (parts.length >= 5) {
      openings.push({
        eco: parts[0].trim(),
        name: parts[1].trim(),
        pgn: parts[2].trim(),
        uci: parts[3].trim(),
        epd: parts[4].trim(),
      });
    }
  }

  return openings;
}

/**
 * Classifies difficulty level based on move length and ECO complexity
 */
export function classifyLichessDifficulty(eco: string, pgn: string): OpeningDifficulty {
  const movesCount = pgn.split(' ').filter(m => !m.includes('.')).length;

  // Classic beginner friendly ECO codes
  const beginnerEcos = ['C20', 'C23', 'C50', 'D02', 'A00', 'B01', 'C44', 'C42', 'C41'];
  if (beginnerEcos.includes(eco) || movesCount <= 4) {
    return 'Beginner';
  }

  if (movesCount <= 8) {
    return 'Intermediate';
  }

  return 'Advanced';
}

/**
 * Derives FEN from EPD string (EPD is FEN without move counters)
 */
export function epdToFen(epd: string): string {
  if (!epd) return 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  // EPD usually has "w KQkq -" or similar
  const parts = epd.split(' ');
  if (parts.length >= 4) {
    return `${parts[0]} ${parts[1]} ${parts[2]} ${parts[3]} 0 1`;
  }
  return `${epd} 0 1`;
}

/**
 * Processes and ingests a batch of Lichess openings into Supabase
 */
export async function processLichessOpeningsBatch(
  volumeLetter: string,
  rawOpenings: LichessRawOpening[],
  limit = 50
): Promise<IngestionResult> {
  const adminSupabase = createSupabaseAdmin();
  const errors: string[] = [];
  let openingsProcessed = 0;
  let chaptersCreated = 0;
  let positionsCreated = 0;

  const targetOpenings = rawOpenings.slice(0, limit);

  for (let idx = 0; idx < targetOpenings.length; idx++) {
    const raw = targetOpenings[idx];
    try {
      const difficulty = classifyLichessDifficulty(raw.eco, raw.pgn);
      const startingFen = epdToFen(raw.epd);
      const isWhiteColor = raw.pgn.split(' ').filter(m => !m.includes('.')).length % 2 === 1;

      // 1. Check if Opening exists by eco_code and name
      const { data: existingOp } = await adminSupabase
        .from('openings')
        .select('id')
        .eq('eco_code', raw.eco)
        .eq('name', raw.name)
        .maybeSingle();

      let opening: any = null;
      const opPayload = {
        eco_code: raw.eco,
        name: raw.name,
        starting_fen: startingFen,
        opening_moves: raw.pgn,
        difficulty,
        style: 'Tactical',
        color: isWhiteColor ? 'white' : 'black',
        description: `Official Lichess DB Theory Opening (${raw.eco}) — ${raw.name}. PGN: ${raw.pgn}`,
        tags: [raw.eco.substring(0, 1).toLowerCase(), 'lichess-db', difficulty.toLowerCase()],
        order_num: idx + 1,
        is_published: true,
        updated_at: new Date().toISOString(),
      };

      if (existingOp) {
        const { data: updated, error: uErr } = await adminSupabase
          .from('openings')
          .update(opPayload)
          .eq('id', existingOp.id)
          .select()
          .single();
        if (!uErr && updated) opening = updated;
      } else {
        const { data: inserted, error: iErr } = await adminSupabase
          .from('openings')
          .insert(opPayload)
          .select()
          .single();
        if (!iErr && inserted) opening = inserted;
        else if (iErr) errors.push(`Insert op error: ${iErr.message}`);
      }

      if (!opening) {
        continue;
      }
      openingsProcessed++;

      // 2. Auto-generate 8 Chapters per Opening
      const chapterTypes = [
        'basic_idea',
        'development',
        'main_line',
        'responses',
        'tactics',
        'common_mistakes',
        'practice',
        'final_test',
      ] as const;

      for (let chIdx = 0; chIdx < chapterTypes.length; chIdx++) {
        const type = chapterTypes[chIdx];
        const chapterNum = chIdx + 1;

        const { data: existingCh } = await adminSupabase
          .from('opening_chapters')
          .select('id')
          .eq('opening_id', opening.id)
          .eq('chapter_num', chapterNum)
          .maybeSingle();

        let chapter: any = null;
        const chPayload = {
          opening_id: opening.id,
          chapter_num: chapterNum,
          chapter_type: type,
          title: `Chapter ${chapterNum}: ${type.replace('_', ' ').toUpperCase()}`,
          is_unlocked: chapterNum === 1,
          updated_at: new Date().toISOString(),
        };

        if (existingCh) {
          const { data: updatedCh } = await adminSupabase
            .from('opening_chapters')
            .update(chPayload)
            .eq('id', existingCh.id)
            .select()
            .single();
          if (updatedCh) chapter = updatedCh;
        } else {
          const { data: insertedCh } = await adminSupabase
            .from('opening_chapters')
            .insert(chPayload)
            .select()
            .single();
          if (insertedCh) chapter = insertedCh;
        }

        if (!chapter) {
          continue;
        }
        chaptersCreated++;

        // 3. Generate Interactive Position for Chapter
        const firstMove = raw.pgn.split(' ').filter(m => !m.includes('.'))[0] || 'e4';

        const { data: existingPos } = await adminSupabase
          .from('opening_positions')
          .select('id')
          .eq('chapter_id', chapter.id)
          .eq('order_num', 1)
          .maybeSingle();

        const posPayload = {
          chapter_id: chapter.id,
          opening_id: opening.id,
          title: `${raw.name} - ${type.replace('_', ' ')}`,
          fen: startingFen,
          board_orientation: isWhiteColor ? 'white' : 'black',
          explanation: `In the ${raw.name} (${raw.eco}), theory plays ${raw.pgn}.`,
          recommended_moves: [firstMove],
          alternative_moves: [],
          wrong_moves: [],
          question: `Play the recommended move for ${raw.name}!`,
          hints: [`The main line begins with ${firstMove}`],
          order_num: 1,
          difficulty,
          is_interactive: true,
          updated_at: new Date().toISOString(),
        };

        if (existingPos) {
          const { error: uPosErr } = await adminSupabase
            .from('opening_positions')
            .update(posPayload)
            .eq('id', existingPos.id);
          if (!uPosErr) positionsCreated++;
        } else {
          const { error: iPosErr } = await adminSupabase
            .from('opening_positions')
            .insert(posPayload);
          if (!iPosErr) positionsCreated++;
        }
      }
    } catch (err: any) {
      errors.push(`Error processing ${raw.name}: ${err?.message || err}`);
    }
  }

  return {
    volume: volumeLetter.toUpperCase(),
    openingsProcessed,
    chaptersCreated,
    positionsCreated,
    errors,
  };
}
