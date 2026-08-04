/**
 * ChessHub Academy — PGN Parser Utility
 * Converts raw PGN text (single or multi-game) into TeachingPosition[] objects
 * usable directly by the live classroom board.
 *
 * Supports:
 *  - Multi-game PGN files (split by [Event ...] tags)
 *  - FEN headers [FEN "..."] (fallback: starting position)
 *  - Mainline + sub-variations: 1. Rd4 (1. Ra4 ...)
 *  - Annotations { comment }, NAGs $1, clock tags [%clk ...]
 *  - Result tokens: *, 1-0, 0-1, 1/2-1/2
 */

import type { TeachingPosition } from '@/types/curriculum.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ParsedVariation {
  label: string;        // e.g. "1. Ra4" — first move of the variation
  moves: string[];      // SAN move list for this branch
  fen: string;          // Starting FEN for this variation
}

export interface ParsedPuzzle {
  id: string;
  title: string;
  event: string;
  date: string;
  fen: string;
  mainLine: string[];           // Mainline SAN moves
  variations: ParsedVariation[]; // Alt-line branches
  result: string;
  rawPgn: string;
  toTeachingPosition: (index?: number) => TeachingPosition;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STARTING_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateId(): string {
  return `pgn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Strip PGN annotations, clock comments, NAGs, and result tokens from a move string,
 * returning a clean list of SAN moves.
 */
function extractMovesFromMovetext(movetext: string): string[] {
  // Remove comments { ... }
  let clean = movetext.replace(/\{[^}]*\}/g, ' ');
  // Remove NAGs ($1, $2, etc.)
  clean = clean.replace(/\$\d+/g, ' ');
  // Remove move numbers (e.g. "1." "1..." "12.")
  clean = clean.replace(/\d+\.+\s*/g, ' ');
  // Remove result tokens
  clean = clean.replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/g, '');
  // Collapse whitespace
  const tokens = clean.split(/\s+/).filter(Boolean);
  // Filter valid SAN-looking tokens (letters/numbers/+#=×xO-)
  return tokens.filter((t) => /^[a-hRNBQKO][a-h1-8RNBQKx+#=\-O]*[+#!?]?$/.test(t));
}

/**
 * Parse sub-variations from movetext, returning the text WITHOUT the variation brackets.
 * Each variation is returned as a raw string.
 */
function extractVariations(movetext: string): { clean: string; vars: string[] } {
  const vars: string[] = [];
  let depth = 0;
  let start = -1;
  let result = '';

  for (let i = 0; i < movetext.length; i++) {
    const ch = movetext[i];
    if (ch === '(') {
      if (depth === 0) start = i + 1;
      depth++;
    } else if (ch === ')') {
      depth--;
      if (depth === 0 && start !== -1) {
        vars.push(movetext.slice(start, i).trim());
        start = -1;
      }
    } else if (depth === 0) {
      result += ch;
    }
  }

  return { clean: result.trim(), vars };
}

/**
 * Parse PGN headers from a single game block.
 * Returns a map of key → value.
 */
function parseHeaders(block: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  let m: RegExpExecArray | null;
  while ((m = headerRegex.exec(block)) !== null) {
    headers[m[1]] = m[2];
  }
  return headers;
}

/**
 * Extract the movetext section from a PGN game block (everything after the headers).
 */
function extractMovetext(block: string): string {
  // Find the first line that doesn't start with '[' and isn't empty
  const lines = block.split('\n');
  const movetextLines: string[] = [];
  let pastHeaders = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!pastHeaders) {
      if (!trimmed.startsWith('[') && trimmed.length > 0) {
        pastHeaders = true;
        movetextLines.push(trimmed);
      }
    } else {
      movetextLines.push(trimmed);
    }
  }

  return movetextLines.join(' ');
}

/**
 * Determine board orientation from FEN (whose turn it is).
 */
function orientationFromFen(fen: string): 'white' | 'black' {
  const parts = fen.trim().split(' ');
  return parts[1] === 'b' ? 'black' : 'white';
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

/**
 * Split a raw PGN string into individual game blocks.
 * Games are separated by blank lines between the movetext of one game
 * and the headers of the next.
 */
function splitIntoGames(rawPgn: string): string[] {
  // Normalize line endings
  const normalized = rawPgn.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  const games: string[] = [];
  const blocks = normalized.split(/\n(?=\[Event\s)/);

  for (const block of blocks) {
    const trimmed = block.trim();
    if (trimmed.length > 0) {
      games.push(trimmed);
    }
  }

  return games.length > 0 ? games : [normalized.trim()];
}

/**
 * Parse a single PGN game block into a ParsedPuzzle.
 */
function parseSingleGame(block: string, index: number): ParsedPuzzle | null {
  const headers = parseHeaders(block);
  const movetext = extractMovetext(block);

  if (!movetext.trim()) return null;

  const fen = headers['FEN'] || STARTING_FEN;
  const event = headers['Event'] || `Puzzle ${index + 1}`;
  const date = headers['Date'] || new Date().toISOString().slice(0, 10);
  const result = headers['Result'] || '*';

  const { clean: mainMovetext, vars: rawVars } = extractVariations(movetext);
  const mainLine = extractMovesFromMovetext(mainMovetext);

  const variations: ParsedVariation[] = rawVars.map((varText) => {
    const varMoves = extractMovesFromMovetext(varText);
    const label = varMoves.slice(0, 2).join(' ') || varText.trim().slice(0, 20);
    return { label, moves: varMoves, fen };
  });

  const title = event === '*' || event === '-' ? `Puzzle ${index + 1}` : event;
  const id = generateId();

  const puzzle: ParsedPuzzle = {
    id,
    title,
    event,
    date,
    fen,
    mainLine,
    variations,
    result,
    rawPgn: block,
    toTeachingPosition: (posIndex?: number): TeachingPosition => ({
      id,
      lessonId: 'pgn-import',
      title,
      fen,
      solution: mainLine.join(' '),
      hint: variations.length > 0
        ? `${variations.length} variation(s): ${variations.map((v) => v.label).join(', ')}`
        : undefined,
      explanation: block.match(/\{([^}]*)\}/)?.[1]?.trim() || undefined,
      difficulty: 'Intermediate',
      tags: [],
      orderNumber: posIndex ?? index,
      boardOrientation: orientationFromFen(fen),
      defaultBoardLock: false,
      notes: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }),
  };

  return puzzle;
}

/**
 * Parse a raw PGN string (single or multi-game) into an array of ParsedPuzzles.
 *
 * @param rawPgn - The raw PGN text to parse
 * @returns Array of parsed puzzles (empty array if parsing fails)
 */
export function parsePgn(rawPgn: string): ParsedPuzzle[] {
  if (!rawPgn.trim()) return [];

  try {
    const blocks = splitIntoGames(rawPgn);
    const puzzles: ParsedPuzzle[] = [];

    for (let i = 0; i < blocks.length; i++) {
      const puzzle = parseSingleGame(blocks[i], i);
      if (puzzle) puzzles.push(puzzle);
    }

    return puzzles;
  } catch (err) {
    console.error('[pgnParser] Unexpected error:', err);
    return [];
  }
}

/**
 * Convert a raw PGN string directly to TeachingPosition[].
 * Convenience wrapper for direct use in the classroom drawer.
 */
export function pgnToTeachingPositions(rawPgn: string): TeachingPosition[] {
  return parsePgn(rawPgn).map((p, i) => p.toTeachingPosition(i));
}

/**
 * Quick-validate a FEN string (basic structural check).
 */
export function isValidFen(fen: string): boolean {
  if (!fen || typeof fen !== 'string') return false;
  const parts = fen.trim().split(' ');
  if (parts.length < 4) return false;
  const rows = parts[0].split('/');
  return rows.length === 8;
}
