import { readFileSync, existsSync } from 'fs';
import path from 'path';
import { Chess } from 'chess.js';
import type { PuzzleData, PuzzleSource } from './types';
import { getDifficultyLabel } from './types';

export interface LocalPuzzleRaw {
  id: string;
  fen: string;
  moves: string; // "e8d7 a2e6 d7d8 f7f8"
  rating: number;
  themes: string[];
  difficulty?: string;
  gameUrl?: string;
}

const PUZZLES_DIR = path.join(process.cwd(), 'public', 'puzzles');

/**
 * Normalizes a raw local Lichess puzzle entry into standard PuzzleData.
 */
export function normalizeLocalPuzzle(raw: LocalPuzzleRaw): PuzzleData | null {
  try {
    const moveList = raw.moves ? raw.moves.split(' ') : [];
    if (moveList.length < 2) return null;

    const oppMoveUci = moveList[0];
    const solution = moveList.slice(1);

    // Replay initial move to get board state after opponent's setup move
    const chess = new Chess(raw.fen);
    const fromSquare = oppMoveUci.substring(0, 2);
    const toSquare = oppMoveUci.substring(2, 4);
    const promotion = oppMoveUci.length > 4 ? oppMoveUci.substring(4, 5) : undefined;

    const moveRes = chess.move({ from: fromSquare, to: toSquare, promotion });
    if (!moveRes) {
      // If move illegal against fen, return fen directly
      return {
        id: raw.id,
        source: 'lichess',
        initialFen: raw.fen,
        solution,
        playerToMove: chess.turn() === 'w' ? 'white' : 'black',
        rating: raw.rating,
        difficulty: getDifficultyLabel(raw.rating),
        themes: raw.themes || [],
        numberOfMoves: Math.ceil(solution.length / 2),
        externalUrl: raw.gameUrl || `https://lichess.org/training/${raw.id}`,
      };
    }

    const initialFen = chess.fen();
    const playerToMove = chess.turn() === 'w' ? 'white' : 'black';

    return {
      id: raw.id,
      source: 'lichess',
      initialFen,
      solution,
      playerToMove,
      rating: raw.rating,
      difficulty: getDifficultyLabel(raw.rating),
      themes: raw.themes || [],
      numberOfMoves: Math.ceil(solution.length / 2),
      opponentMoveUci: oppMoveUci,
      opponentMoveSan: moveRes.san,
      externalUrl: raw.gameUrl || `https://lichess.org/training/${raw.id}`,
    };
  } catch (err) {
    console.error(`Failed to normalize puzzle ${raw.id}:`, err);
    return null;
  }
}

/**
 * Fetches a random local puzzle from the filesystem database.
 */
export async function fetchLocalPuzzle(options?: {
  ratingBand?: string;
  theme?: string;
  excludeIds?: string[];
}): Promise<PuzzleData | null> {
  try {
    let filePath = path.join(PUZZLES_DIR, 'all.json');

    if (options?.theme) {
      const themeFile = path.join(PUZZLES_DIR, 'by-theme', `${options.theme}.json`);
      if (existsSync(themeFile)) filePath = themeFile;
    } else if (options?.ratingBand) {
      const ratingFile = path.join(PUZZLES_DIR, 'by-rating', `${options.ratingBand}.json`);
      if (existsSync(ratingFile)) filePath = ratingFile;
    }

    if (!existsSync(filePath)) {
      filePath = path.join(PUZZLES_DIR, 'all.json');
    }

    if (!existsSync(filePath)) return null;

    const data = JSON.parse(readFileSync(filePath, 'utf-8')) as LocalPuzzleRaw[];
    if (!data || data.length === 0) return null;

    const excludeSet = new Set(options?.excludeIds || []);
    const available = data.filter((p) => !excludeSet.has(p.id));
    const pool = available.length > 0 ? available : data;

    const randomIndex = Math.floor(Math.random() * pool.length);
    const chosen = pool[randomIndex];

    return normalizeLocalPuzzle(chosen);
  } catch (err) {
    console.error('Error fetching local puzzle:', err);
    return null;
  }
}

export const localPuzzleAdapter: PuzzleSource = {
  async fetchDailyPuzzle(): Promise<PuzzleData> {
    const puzzle = await fetchLocalPuzzle();
    if (puzzle) return puzzle;
    throw new Error('No local puzzles available');
  },
};
