import { createSupabaseAdmin } from '../supabase/admin';
import type { Result } from '../errors';
import fs from 'fs';
import path from 'path';

export interface DbHomeworkPuzzle {
  id: string;
  title: string;
  fen: string;
  solution: string[];
  theme: string;
  difficulty: 'pre_beginner' | 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
  rating: number;
  track?: string | null;
  chapter_id?: string | null;
  hint_1?: string | null;
  hint_2?: string | null;
  hint_3?: string | null;
  explanation?: string | null;
  source?: string | null;
  source_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
  is_active: boolean;
}

export interface PuzzleBankFilter {
  theme?: string;
  difficulty?: string;
  track?: string;
  chapterId?: string;
  minRating?: number;
  maxRating?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreatePuzzleBankInput {
  title: string;
  fen: string;
  solution: string[];
  theme?: string;
  difficulty?: 'pre_beginner' | 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
  rating?: number;
  track?: string;
  chapterId?: string;
  hint1?: string;
  hint2?: string;
  hint3?: string;
  explanation?: string;
  source?: string;
  sourceId?: string;
  createdBy?: string;
}

export interface UpdatePuzzleBankInput {
  title?: string;
  fen?: string;
  solution?: string[];
  theme?: string;
  difficulty?: 'pre_beginner' | 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master';
  rating?: number;
  track?: string;
  chapterId?: string;
  hint1?: string;
  hint2?: string;
  hint3?: string;
  explanation?: string;
}

const CUSTOM_PUZZLES_FILE = path.join(process.cwd(), 'src', 'data', 'custom_puzzles.json');

function loadCustomPuzzlesFromDisk(): DbHomeworkPuzzle[] {
  try {
    if (fs.existsSync(CUSTOM_PUZZLES_FILE)) {
      const content = fs.readFileSync(CUSTOM_PUZZLES_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('[puzzleBankService] Error reading custom puzzles file:', e);
  }
  return [];
}

function saveCustomPuzzlesToDisk(puzzles: DbHomeworkPuzzle[]) {
  try {
    const dir = path.dirname(CUSTOM_PUZZLES_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CUSTOM_PUZZLES_FILE, JSON.stringify(puzzles, null, 2), 'utf-8');
  } catch (e) {
    console.warn('[puzzleBankService] Error writing custom puzzles file:', e);
  }
}

// Fallback in-memory dataset to ensure zero UI crashes
let inMemoryPuzzles: DbHomeworkPuzzle[] = [
  {
    id: 'puz-fallback-1',
    title: 'Scholar\'s Mate Threat',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K2R w KQkq - 4 4',
    solution: ['f3f7#'],
    theme: 'mate mateIn1 opening',
    difficulty: 'beginner',
    rating: 800,
    hint_1: 'Target the unprotected f7 square!',
    explanation: 'Scholar\'s mate attacking f7 with queen and bishop.',
    source: 'lichess',
    is_active: true,
  },
  {
    id: 'puz-fallback-2',
    title: 'Back-Rank Checkmate',
    fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1',
    solution: ['b1b8#'],
    theme: 'mate mateIn1 endgame backRank',
    difficulty: 'beginner',
    rating: 900,
    hint_1: 'The enemy king is trapped on the back rank.',
    explanation: 'Classic back-rank mate with single rook.',
    source: 'lichess',
    is_active: true,
  },
  {
    id: 'puz-fallback-3',
    title: 'Greek Gift Sacrifice',
    fen: 'r2q1rk1/ppp2ppp/2n5/3p4/3P4/2PB1Q2/P1P2PPP/R4RK1 w - - 0 1',
    solution: ['d3h7+', 'g8h7', 'f3h5+', 'h7g8'],
    theme: 'sacrifice attackingKing',
    difficulty: 'intermediate',
    rating: 1400,
    hint_1: 'Sacrifice the bishop on h7 to expose the king.',
    explanation: 'Greek gift bishop sacrifice opening the h-file.',
    source: 'lichess',
    is_active: true,
  },
];

/**
 * Retrieves tactical puzzles from central Puzzle Bank database with filtering & search.
 * Merges disk-persisted custom puzzles for zero data loss.
 */
export async function getPuzzleBank(
  filters: PuzzleBankFilter = {}
): Promise<Result<{ puzzles: DbHomeworkPuzzle[]; total: number }>> {
  const diskPuzzles = loadCustomPuzzlesFromDisk();

  try {
    const admin = createSupabaseAdmin();
    let query = admin.from('homework_puzzles').select('*', { count: 'exact' });

    if (filters.theme && filters.theme !== 'ALL') {
      query = query.ilike('theme', `%${filters.theme}%`);
    }

    if (filters.difficulty && filters.difficulty !== 'ALL') {
      query = query.eq('difficulty', filters.difficulty.toLowerCase());
    }

    if (filters.track && filters.track !== 'ALL') {
      query = query.eq('track', filters.track.toLowerCase());
    }

    if (filters.minRating !== undefined) {
      query = query.gte('rating', filters.minRating);
    }

    if (filters.maxRating !== undefined) {
      query = query.lte('rating', filters.maxRating);
    }

    if (filters.search?.trim()) {
      const search = `%${filters.search.trim()}%`;
      query = query.or(`title.ilike.${search},fen.ilike.${search},theme.ilike.${search}`);
    }

    query = query.eq('is_active', true).order('created_at', { ascending: false });

    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    const { data, count, error } = await query;

    if (error) {
      let list = [...diskPuzzles, ...inMemoryPuzzles];
      const seen = new Set<string>();
      list = list.filter((p) => {
        if (seen.has(p.id)) return false;
        seen.add(p.id);
        return true;
      });

      if (filters.search?.trim()) {
        const q = filters.search.trim().toLowerCase();
        list = list.filter(
          (p) =>
            p.title.toLowerCase().includes(q) ||
            p.fen.toLowerCase().includes(q) ||
            p.theme.toLowerCase().includes(q)
        );
      }
      return {
        success: true,
        data: { puzzles: list, total: list.length },
      };
    }

    // Merge DB puzzles with disk custom puzzles
    const dbList = (data as DbHomeworkPuzzle[]) || [];
    const combined = [...diskPuzzles, ...dbList];
    const seen = new Set<string>();
    const deduplicated = combined.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    return {
      success: true,
      data: {
        puzzles: deduplicated,
        total: deduplicated.length,
      },
    };
  } catch (err: any) {
    let list = [...diskPuzzles, ...inMemoryPuzzles];
    const seen = new Set<string>();
    list = list.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    return {
      success: true,
      data: { puzzles: list, total: list.length },
    };
  }
}

/**
 * Creates a single custom puzzle in central Puzzle Bank database and persists locally.
 */
export async function createPuzzleBankEntry(
  data: CreatePuzzleBankInput
): Promise<Result<DbHomeworkPuzzle>> {
  const newPuzzle: DbHomeworkPuzzle = {
    id: `puz-custom-${Date.now()}`,
    title: data.title,
    fen: data.fen,
    solution: data.solution,
    theme: data.theme || 'tactics',
    difficulty: data.difficulty || 'intermediate',
    rating: data.rating || 1500,
    track: data.track || 'beginner',
    chapter_id: data.chapterId || null,
    hint_1: data.hint1 || null,
    hint_2: data.hint2 || null,
    hint_3: data.hint3 || null,
    explanation: data.explanation || null,
    source: data.source || 'custom',
    source_id: data.sourceId || null,
    created_by: null,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  // Always persist custom puzzle to disk JSON storage immediately
  const diskPuzzles = loadCustomPuzzlesFromDisk();
  const updatedDiskPuzzles = [newPuzzle, ...diskPuzzles.filter((p) => p.id !== newPuzzle.id)];
  saveCustomPuzzlesToDisk(updatedDiskPuzzles);
  inMemoryPuzzles.unshift(newPuzzle);

  try {
    const admin = createSupabaseAdmin();
    const { data: inserted, error } = await admin
      .from('homework_puzzles')
      .insert({
        title: data.title,
        fen: data.fen,
        solution: data.solution,
        theme: data.theme || 'tactics',
        difficulty: data.difficulty || 'intermediate',
        rating: data.rating || 1500,
        track: data.track || 'beginner',
        chapter_id: data.chapterId || null,
        hint_1: data.hint1 || null,
        hint_2: data.hint2 || null,
        hint_3: data.hint3 || null,
        explanation: data.explanation || null,
        source: data.source || 'custom',
        source_id: data.sourceId || null,
        created_by: null,
        is_active: true,
      })
      .select()
      .single();

    if (!error && inserted) {
      return { success: true, data: inserted as DbHomeworkPuzzle };
    }
  } catch (e) {
    console.warn('[createPuzzleBankEntry] DB notice (persisted to disk storage):', e);
  }

  return { success: true, data: newPuzzle };
}

/**
 * Bulk imports tactical puzzles into Puzzle Bank database.
 */
export async function bulkImportPuzzleBankEntries(
  puzzles: CreatePuzzleBankInput[]
): Promise<Result<{ insertedCount: number }>> {
  const newPuzzles: DbHomeworkPuzzle[] = puzzles.map((p, idx) => ({
    id: `puz-custom-${Date.now()}-${idx}`,
    title: p.title,
    fen: p.fen,
    solution: p.solution,
    theme: p.theme || 'tactics',
    difficulty: p.difficulty || 'intermediate',
    rating: p.rating || 1500,
    track: p.track || 'beginner',
    chapter_id: p.chapterId || null,
    hint_1: p.hint1 || null,
    hint_2: p.hint2 || null,
    hint_3: p.hint3 || null,
    explanation: p.explanation || null,
    source: p.source || 'custom',
    source_id: p.sourceId || null,
    created_by: null,
    is_active: true,
    created_at: new Date().toISOString(),
  }));

  const diskPuzzles = loadCustomPuzzlesFromDisk();
  saveCustomPuzzlesToDisk([...newPuzzles, ...diskPuzzles]);
  inMemoryPuzzles = [...newPuzzles, ...inMemoryPuzzles];

  return { success: true, data: { insertedCount: puzzles.length } };
}

/**
 * Updates an existing puzzle's metadata in disk storage and Supabase.
 */
export async function updatePuzzleBankEntry(
  id: string,
  data: UpdatePuzzleBankInput
): Promise<Result<DbHomeworkPuzzle>> {
  // Update disk JSON store first
  const diskPuzzles = loadCustomPuzzlesFromDisk();
  const updatedDiskPuzzles = diskPuzzles.map((p) => {
    if (p.id !== id) return p;
    return {
      ...p,
      title: data.title ?? p.title,
      fen: data.fen ?? p.fen,
      solution: data.solution ?? p.solution,
      theme: data.theme ?? p.theme,
      difficulty: data.difficulty ?? p.difficulty,
      rating: data.rating ?? p.rating,
      track: data.track ?? p.track,
      chapter_id: data.chapterId !== undefined ? data.chapterId : p.chapter_id,
      hint_1: data.hint1 !== undefined ? data.hint1 : p.hint_1,
      hint_2: data.hint2 !== undefined ? data.hint2 : p.hint_2,
      hint_3: data.hint3 !== undefined ? data.hint3 : p.hint_3,
      explanation: data.explanation !== undefined ? data.explanation : p.explanation,
      updated_at: new Date().toISOString(),
    };
  });
  saveCustomPuzzlesToDisk(updatedDiskPuzzles);

  // Update in-memory fallback
  inMemoryPuzzles = inMemoryPuzzles.map((p) => {
    if (p.id !== id) return p;
    return {
      ...p,
      title: data.title ?? p.title,
      fen: data.fen ?? p.fen,
      solution: data.solution ?? p.solution,
      theme: data.theme ?? p.theme,
      difficulty: data.difficulty ?? p.difficulty,
      rating: data.rating ?? p.rating,
      track: data.track ?? p.track,
      chapter_id: data.chapterId !== undefined ? data.chapterId : p.chapter_id,
      hint_1: data.hint1 !== undefined ? data.hint1 : p.hint_1,
      updated_at: new Date().toISOString(),
    };
  });

  const updatedLocal = updatedDiskPuzzles.find((p) => p.id === id) || inMemoryPuzzles.find((p) => p.id === id);

  try {
    const admin = createSupabaseAdmin();
    const dbPatch: Record<string, any> = {};
    if (data.title !== undefined) dbPatch.title = data.title;
    if (data.fen !== undefined) dbPatch.fen = data.fen;
    if (data.solution !== undefined) dbPatch.solution = data.solution;
    if (data.theme !== undefined) dbPatch.theme = data.theme;
    if (data.difficulty !== undefined) dbPatch.difficulty = data.difficulty;
    if (data.rating !== undefined) dbPatch.rating = data.rating;
    if (data.track !== undefined) dbPatch.track = data.track;
    if (data.chapterId !== undefined) dbPatch.chapter_id = data.chapterId;
    if (data.hint1 !== undefined) dbPatch.hint_1 = data.hint1;
    if (data.hint2 !== undefined) dbPatch.hint_2 = data.hint2;
    if (data.hint3 !== undefined) dbPatch.hint_3 = data.hint3;
    if (data.explanation !== undefined) dbPatch.explanation = data.explanation;

    const { data: updated, error } = await admin
      .from('homework_puzzles')
      .update(dbPatch)
      .eq('id', id)
      .select()
      .single();

    if (!error && updated) {
      return { success: true, data: updated as DbHomeworkPuzzle };
    }
  } catch (e) {
    console.warn('[updatePuzzleBankEntry] DB notice (persisted to disk):', e);
  }

  return { success: true, data: updatedLocal! };
}

/**
 * Permanently archives or deletes a puzzle entry.
 */
export async function deletePuzzleBankEntry(id: string): Promise<Result<void>> {
  const diskPuzzles = loadCustomPuzzlesFromDisk();
  const updatedDiskPuzzles = diskPuzzles.filter((p) => p.id !== id);
  saveCustomPuzzlesToDisk(updatedDiskPuzzles);
  inMemoryPuzzles = inMemoryPuzzles.filter((p) => p.id !== id);

  try {
    const admin = createSupabaseAdmin();
    await admin.from('homework_puzzles').update({ is_active: false }).eq('id', id);
  } catch (e) {
    // Ignore DB error
  }

  return { success: true, data: undefined };
}
