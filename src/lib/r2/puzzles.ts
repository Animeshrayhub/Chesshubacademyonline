import { GetObjectCommand } from '@aws-sdk/client-s3';
import { gunzipSync } from 'zlib';
import { Chess } from 'chess.js';
import { getR2Client, getR2BucketName, isR2Configured } from './client';
export { isR2Configured, getR2Client, getR2BucketName };
import type { PuzzleData } from '../puzzles/types';
import { getDifficultyLabel } from '../puzzles/types';

export interface CompactPuzzle {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
  popularity?: number;
  nbPlays?: number;
}

export interface RatingBandInfo {
  label: string;
  name: string;
  min: number;
  max: number;
  count: number;
  shards: number;
  shardPrefix: string;
}

export interface PuzzleManifest {
  version: string;
  generatedAt: string;
  totalPuzzles: number;
  totalShards: number;
  totalThemes: number;
  themes: string[];
  ratingBands: Record<string, RatingBandInfo>;
  themeCounts: Record<string, number>;
}

export interface ThemeIndexEntry {
  b: string; // Rating band key (e.g. "band_1200_1399")
  s: number; // Shard index
  i: number; // Item index in shard
}

export interface ThemeIndexFile {
  theme: string;
  total: number;
  entries: ThemeIndexEntry[];
}

export interface IdPrefixIndexFile {
  prefix: string;
  puzzles: Record<string, [string, number, number]>; // id -> [band, shardIndex, itemIndex]
}

// In-memory bounded cache for warm serverless invocations
const CACHE_MAX_ENTRIES = 60;
const memoryCache = new Map<string, { data: any; cachedAt: number }>();

function getFromCache<T>(key: string): T | null {
  const item = memoryCache.get(key);
  if (!item) return null;
  // Cache TTL: 10 minutes
  if (Date.now() - item.cachedAt > 10 * 60 * 1000) {
    memoryCache.delete(key);
    return null;
  }
  return item.data as T;
}

function setToCache<T>(key: string, data: T): void {
  if (memoryCache.size >= CACHE_MAX_ENTRIES) {
    // Evict oldest entry
    const oldestKey = memoryCache.keys().next().value;
    if (oldestKey) memoryCache.delete(oldestKey);
  }
  memoryCache.set(key, { data, cachedAt: Date.now() });
}

/**
 * Reads a JSON file from Cloudflare R2, automatically decompressing if gzipped.
 */
export async function fetchR2Json<T>(s3Key: string): Promise<T | null> {
  const cached = getFromCache<T>(s3Key);
  if (cached) return cached;

  if (!isR2Configured()) {
    return null;
  }

  try {
    const client = getR2Client();
    const bucket = getR2BucketName();

    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: s3Key,
    });

    const response = await client.send(command);
    if (!response.Body) return null;

    const streamToBuffer = async (stream: any): Promise<Buffer> => {
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
      }
      return Buffer.concat(chunks);
    };

    const rawBuffer = await streamToBuffer(response.Body);
    let jsonString: string;

    if (s3Key.endsWith('.gz') || rawBuffer[0] === 0x1f && rawBuffer[1] === 0x8b) {
      const decompressed = gunzipSync(rawBuffer);
      jsonString = decompressed.toString('utf-8');
    } else {
      jsonString = rawBuffer.toString('utf-8');
    }

    const parsed = JSON.parse(jsonString) as T;
    setToCache(s3Key, parsed);
    return parsed;
  } catch (error: any) {
    // 404 / NoSuchKey is an expected miss, don't spam errors
    if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.error(`[R2 Puzzle Service] Failed to fetch "${s3Key}":`, error);
    return null;
  }
}

/**
 * Retrieves the root manifest describing all available puzzle shards and themes.
 */
export async function getR2Manifest(): Promise<PuzzleManifest | null> {
  return fetchR2Json<PuzzleManifest>('manifest.json');
}

/**
 * Normalizes a raw compact puzzle into the standard application PuzzleData shape.
 * Replays the opponent's first setup move to construct the initial puzzle board state.
 */
export function normalizeR2Puzzle(raw: CompactPuzzle): PuzzleData | null {
  try {
    const moveList = raw.moves ? raw.moves.split(' ') : [];
    if (moveList.length < 2) return null;

    const oppMoveUci = moveList[0];
    const solution = moveList.slice(1);

    // Replay initial move to establish the board state the student must solve from
    const chess = new Chess(raw.fen);
    const fromSquare = oppMoveUci.substring(0, 2);
    const toSquare = oppMoveUci.substring(2, 4);
    const promotion = oppMoveUci.length > 4 ? oppMoveUci.substring(4, 5) : undefined;

    const moveRes = chess.move({ from: fromSquare, to: toSquare, promotion });
    if (!moveRes) {
      // Fallback if move cannot be applied strictly
      return {
        id: raw.id,
        source: 'chesshub',
        initialFen: raw.fen,
        preMoveFen: raw.fen,
        solution,
        playerToMove: chess.turn() === 'w' ? 'white' : 'black',
        rating: raw.rating,
        difficulty: getDifficultyLabel(raw.rating),
        themes: raw.themes || [],
        numberOfMoves: Math.ceil(solution.length / 2),
        externalUrl: `https://lichess.org/training/${raw.id}`,
      };
    }

    const initialFen = chess.fen();
    const playerToMove = chess.turn() === 'w' ? 'white' : 'black';

    return {
      id: raw.id,
      source: 'chesshub',
      initialFen,
      preMoveFen: raw.fen,
      solution,
      playerToMove,
      rating: raw.rating,
      difficulty: getDifficultyLabel(raw.rating),
      themes: raw.themes || [],
      numberOfMoves: Math.ceil(solution.length / 2),
      opponentMoveUci: oppMoveUci,
      opponentMoveSan: moveRes.san,
      externalUrl: `https://lichess.org/training/${raw.id}`,
    };
  } catch (err) {
    console.error(`[R2 Puzzle Service] Failed to normalize puzzle ${raw.id}:`, err);
    return null;
  }
}

/**
 * Maps a numeric rating to its canonical band key.
 */
export function getRatingBandKey(rating: number): string {
  if (rating < 800) return 'band_0400_0799';
  if (rating < 1000) return 'band_0800_0999';
  if (rating < 1200) return 'band_1000_1199';
  if (rating < 1400) return 'band_1200_1399';
  if (rating < 1600) return 'band_1400_1599';
  if (rating < 1800) return 'band_1600_1799';
  if (rating < 2000) return 'band_1800_1999';
  if (rating < 2200) return 'band_2000_2199';
  if (rating < 2400) return 'band_2200_2399';
  return 'band_2400_plus';
}

/**
 * Maps a difficulty string or label to its canonical band key.
 */
export function mapDifficultyToBandKey(diff: string): string {
  const d = diff.toLowerCase().trim();
  switch (d) {
    case 'beginner':
    case '800':
      return 'band_0800_0999';
    case 'easy':
    case '1000':
      return 'band_1000_1199';
    case 'intermediate':
    case '1200':
      return 'band_1200_1399';
    case 'medium':
    case '1400':
      return 'band_1400_1599';
    case 'hard':
    case '1600':
      return 'band_1600_1799';
    case 'advanced':
    case '1800':
    case '1900':
      return 'band_1800_1999';
    case 'expert':
    case '2000':
    case '2200':
      return 'band_2000_2199';
    case 'master':
    case '2400':
      return 'band_2400_plus';
    default:
      return 'band_1200_1399';
  }
}

/**
 * Fetches puzzles by rating band from canonical R2 shards.
 */
export async function getPuzzlesByRatingBand(
  bandKey: string,
  options?: {
    count?: number;
    shardIndex?: number;
    excludeIds?: string[];
  }
): Promise<PuzzleData[]> {
  const manifest = await getR2Manifest();
  if (!manifest) return [];

  const bandInfo = manifest.ratingBands[bandKey];
  if (!bandInfo || bandInfo.shards === 0) return [];

  const count = Math.min(50, Math.max(1, options?.count || 5));
  const targetShard = options?.shardIndex !== undefined
    ? Math.min(bandInfo.shards - 1, Math.max(0, options.shardIndex))
    : Math.floor(Math.random() * bandInfo.shards);

  const shardNumStr = String(targetShard).padStart(4, '0');
  const shardKey = `canonical/rating/${bandKey}/shard_${shardNumStr}.json.gz`;

  const shardData = await fetchR2Json<CompactPuzzle[]>(shardKey);
  if (!shardData || shardData.length === 0) return [];

  const excludeSet = new Set(options?.excludeIds || []);
  let pool = shardData.filter((p) => !excludeSet.has(p.id));
  if (pool.length === 0) pool = shardData;

  // Shuffle pool
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  const selected = pool.slice(0, count);
  const normalized: PuzzleData[] = [];
  for (const item of selected) {
    const p = normalizeR2Puzzle(item);
    if (p) normalized.push(p);
  }

  return normalized;
}

/**
 * Fetches puzzles for a specific theme using the theme index.
 */
export async function getPuzzlesByTheme(
  theme: string,
  options?: {
    ratingBand?: string;
    targetRating?: number;
    count?: number;
    excludeIds?: string[];
  }
): Promise<PuzzleData[]> {
  const themeClean = theme.trim();
  const themeIndexKey = `indexes/theme/${themeClean}.json.gz`;
  const themeIndex = await fetchR2Json<ThemeIndexFile>(themeIndexKey);

  if (!themeIndex || !themeIndex.entries || themeIndex.entries.length === 0) {
    return [];
  }

  let filteredEntries = themeIndex.entries;

  // Filter by rating band if specified
  const targetBand = options?.ratingBand || (options?.targetRating ? getRatingBandKey(options.targetRating) : undefined);
  if (targetBand) {
    const inBand = themeIndex.entries.filter((e) => e.b === targetBand);
    if (inBand.length > 0) {
      filteredEntries = inBand;
    }
  }

  const count = Math.min(50, Math.max(1, options?.count || 5));
  const excludeSet = new Set(options?.excludeIds || []);

  // Pick random entries
  const shuffledEntries = [...filteredEntries];
  for (let i = shuffledEntries.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffledEntries[i], shuffledEntries[j]] = [shuffledEntries[j], shuffledEntries[i]];
  }

  const results: PuzzleData[] = [];
  const fetchedShards = new Map<string, CompactPuzzle[]>();

  for (const entry of shuffledEntries) {
    if (results.length >= count) break;

    const shardNumStr = String(entry.s).padStart(4, '0');
    const shardKey = `canonical/rating/${entry.b}/shard_${shardNumStr}.json.gz`;

    let shardPuzzles = fetchedShards.get(shardKey);
    if (!shardPuzzles) {
      const fetched = await fetchR2Json<CompactPuzzle[]>(shardKey);
      if (fetched) {
        shardPuzzles = fetched;
        fetchedShards.set(shardKey, fetched);
      }
    }

    if (shardPuzzles && shardPuzzles[entry.i]) {
      const raw = shardPuzzles[entry.i];
      if (!excludeSet.has(raw.id)) {
        const norm = normalizeR2Puzzle(raw);
        if (norm) {
          results.push(norm);
          excludeSet.add(raw.id);
        }
      }
    }
  }

  return results;
}

/**
 * Direct lookup by puzzle ID using the 2-character prefix index.
 */
export async function getPuzzleById(puzzleId: string): Promise<PuzzleData | null> {
  const cleanId = puzzleId.trim();
  if (cleanId.length < 2) return null;

  const prefix = cleanId.substring(0, 2).toLowerCase();
  const idIndexKey = `indexes/by-id/${prefix}.json.gz`;
  const idIndex = await fetchR2Json<IdPrefixIndexFile>(idIndexKey);

  if (!idIndex || !idIndex.puzzles || !idIndex.puzzles[cleanId]) {
    return null;
  }

  const [band, shardIdx, itemIdx] = idIndex.puzzles[cleanId];
  const shardNumStr = String(shardIdx).padStart(4, '0');
  const shardKey = `canonical/rating/${band}/shard_${shardNumStr}.json.gz`;

  const shardData = await fetchR2Json<CompactPuzzle[]>(shardKey);
  if (!shardData || !shardData[itemIdx]) return null;

  return normalizeR2Puzzle(shardData[itemIdx]);
}
