import { Chess } from 'chess.js';

export const DEFAULT_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Universal FEN Sanitizer that guarantees valid, crash-free FEN string.
 * Auto-corrects missing ranks, missing halfmove fields, and auto-inserts
 * White (K) and Black (k) Kings if missing in custom piece setups.
 */
export function sanitizeFen(rawFen: string): string {
  if (!rawFen || !rawFen.trim()) return DEFAULT_START_FEN;
  let cleaned = rawFen.trim();

  // Strip PGN header tags or quotes if pasted [FEN "8/8/..."]
  if (cleaned.includes('[FEN') || cleaned.includes('"')) {
    const match = cleaned.match(/"([^"]+)"/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/\[FEN\s+/i, '').replace(/\]/g, '').replace(/"/g, '').trim();
    }
  }

  const parts = cleaned.split(/\s+/);
  let placement = parts[0] || '';

  // 1. Ensure exactly 8 ranks separated by slashes
  if (placement.includes('/')) {
    const ranks = placement.split('/');
    while (ranks.length < 8) {
      ranks.push('8'); // Fill missing empty ranks
    }
    if (ranks.length > 8) {
      ranks.length = 8;
    }
    placement = ranks.join('/');
  } else if (placement.length > 0) {
    placement = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';
  }

  // 2. Ensure presence of Black King (k) and White King (K) for chess.js compatibility
  const ranks = placement.split('/');

  // Insert Black King on rank 8 (index 0) if missing
  if (!placement.includes('k')) {
    const r0 = ranks[0];
    if (r0 === '8') ranks[0] = 'k7';
    else if (/\d/.test(r0)) {
      const num = parseInt(r0[0], 10);
      ranks[0] = 'k' + (num > 1 ? (num - 1).toString() : '') + r0.slice(1);
    } else {
      ranks[0] = 'k' + r0.slice(1);
    }
  }

  // Insert White King on rank 1 (index 7) if missing
  if (!placement.includes('K')) {
    const r7 = ranks[7];
    if (r7 === '8') ranks[7] = 'K7';
    else if (/\d/.test(r7)) {
      const num = parseInt(r7[0], 10);
      ranks[7] = 'K' + (num > 1 ? (num - 1).toString() : '') + r7.slice(1);
    } else {
      ranks[7] = 'K' + r7.slice(1);
    }
  }

  placement = ranks.join('/');

  // 3. Ensure valid turn, castling, en passant, halfmove, fullmove
  const turn = parts[1] === 'b' ? 'b' : 'w';
  const castling = parts[2] && parts[2] !== '' ? parts[2] : '-';
  const enPassant = parts[3] && parts[3] !== '' ? parts[3] : '-';
  const halfMove = parts[4] || '0';
  const fullMove = parts[5] || '1';

  const sanitized = `${placement} ${turn} ${castling} ${enPassant} ${halfMove} ${fullMove}`;

  // Validate with chess.js
  try {
    const c = new Chess(sanitized);
    return c.fen();
  } catch {
    // If validation fails, return safe fallback with Kings placed
    return `k7/8/8/8/8/8/8/K7 ${turn} - - 0 1`;
  }
}

/**
 * Result structure for parsed PGN data.
 */
export interface ParsedPgnResult {
  success: boolean;
  fen: string;
  mainMoves: string[];
  variations: string[];
  cleanPgn: string;
  error?: string;
}

/**
 * Parses PGN strings containing FEN tags and variation lines like `1. Rd4 (1. Ra4) *`.
 * Separates main line moves from variations and returns sanitized FEN and clean PGN.
 */
export function parsePgnWithVariations(pgnText: string): ParsedPgnResult {
  if (!pgnText || !pgnText.trim()) {
    return {
      success: false,
      fen: DEFAULT_START_FEN,
      mainMoves: [],
      variations: [],
      cleanPgn: '',
      error: 'Empty PGN text provided',
    };
  }

  let rawFen = DEFAULT_START_FEN;

  // Extract FEN tag if present in header [FEN "..."]
  const fenMatch = pgnText.match(/\[FEN\s+"([^"]+)"\]/i);
  if (fenMatch && fenMatch[1]) {
    rawFen = fenMatch[1];
  }

  const sanitizedFen = sanitizeFen(rawFen);

  // Extract variations in parentheses e.g. (1. Ra4) or (Ra4)
  const variations: string[] = [];
  const variationRegex = /\(([^)]+)\)/g;
  let varMatch;

  while ((varMatch = variationRegex.exec(pgnText)) !== null) {
    const varText = varMatch[1].trim();
    if (varText) {
      variations.push(varText);
    }
  }

  // Strip variations, PGN headers, outcome markers (*, 1-0, 0-1, 1/2-1/2) to get clean move line
  let moveBody = pgnText
    .replace(/\[[^\]]+\]/g, '') // remove header tags
    .replace(/\([^)]+\)/g, '')  // remove variations
    .replace(/\{[^}]+\}/g, '')  // remove comments
    .replace(/\$\d+/g, '')       // remove NAGs
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, '') // remove result markers
    .trim();

  // Extract moves
  const mainMoves = moveBody
    .replace(/\d+\.+/g, ' ') // remove move numbers like 1. or 1...
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  // Build clean playable PGN
  const cleanPgn = `[Event "ChessHub Game"]\n[FEN "${sanitizedFen}"]\n\n${moveBody}`;

  return {
    success: true,
    fen: sanitizedFen,
    mainMoves,
    variations,
    cleanPgn,
  };
}
