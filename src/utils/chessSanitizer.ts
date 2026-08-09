import { Chess } from 'chess.js';

export const DEFAULT_START_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

/**
 * Extracts FEN placement or full FEN string from any PGN text block, headers, or raw input.
 */
export function extractFenFromText(text: string): string {
  if (!text || !text.trim()) return DEFAULT_START_FEN;
  const trimmed = text.trim();

  // 1. Check for [FEN "xxx"] or [SetUpFen "xxx"] header with any quote style
  const fenHeaderMatch = trimmed.match(/\[(?:FEN|SetUpFen)\s+["']([^"']+)["']\]/i);
  if (fenHeaderMatch && fenHeaderMatch[1]) {
    return fenHeaderMatch[1].trim();
  }

  // 2. Scan lines for rank slashes (7 slashes = 8 ranks)
  const lines = trimmed.split('\n');
  for (const line of lines) {
    const l = line.trim();
    if (l.startsWith('[') && !l.toLowerCase().includes('fen')) continue;
    if (l.startsWith('*') || l.startsWith('1-0') || l.startsWith('0-1')) continue;

    if ((l.match(/\//g) || []).length >= 7) {
      const cleanLine = l.replace(/^\[(?:FEN|SetUpFen)\s+["']/i, '').replace(/["']\]$/, '').trim();
      return cleanLine;
    }
  }

  // 3. Fallback regex for FEN placement anywhere in string
  const fenRegex = /(?:[rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+(?:\s+[wb]\s+[KQkq-]+\s+[a-h36-]+\s+\d+\s+\d+)?/;
  const match = trimmed.match(fenRegex);
  if (match && match[0]) {
    return match[0].trim();
  }

  return DEFAULT_START_FEN;
}

/**
 * Universal FEN Sanitizer that guarantees valid, crash-free FEN string.
 * Auto-corrects missing ranks, missing halfmove fields, and auto-inserts
 * White (K) and Black (k) Kings if missing in custom piece setups.
 */
export function sanitizeFen(rawFen: string): string {
  if (!rawFen || !rawFen.trim()) return DEFAULT_START_FEN;
  let cleaned = rawFen.trim();

  // 1. Strip PGN header tags e.g. [Event "..."], [FEN "..."], or quotes
  if (cleaned.includes('[') || cleaned.includes(']')) {
    const fenMatch = cleaned.match(/\[FEN\s+"([^"]+)"\]/i);
    if (fenMatch && fenMatch[1]) {
      cleaned = fenMatch[1].trim();
    } else {
      cleaned = cleaned.replace(/\[[^\]]*\]/g, '').replace(/"/g, '').trim();
    }
  }

  // Remove non-FEN prefix if present before rank slashes (e.g. Event8/8/...)
  const slashIdx = cleaned.indexOf('/');
  if (slashIdx > 0) {
    const firstSpaceBeforeSlash = cleaned.lastIndexOf(' ', slashIdx);
    if (firstSpaceBeforeSlash !== -1) {
      cleaned = cleaned.slice(firstSpaceBeforeSlash + 1);
    } else {
      // Find where rank structure starts
      const match = cleaned.match(/[rnbqkpRNBQKP1-8\/]+/);
      if (match && match[0].includes('/')) {
        const remaining = cleaned.slice(cleaned.indexOf(match[0]) + match[0].length);
        cleaned = `${match[0]}${remaining}`;
      }
    }
  }

  const parts = cleaned.split(/\s+/);
  let placement = parts[0] || '';

  // 2. Ensure exactly 8 ranks separated by slashes
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

  // 3. Ensure presence of Black King (k) and White King (K) for chess.js compatibility
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

  // 4. Ensure valid turn, castling, en passant, halfmove, fullmove (prevent NaN)
  const turn = parts[1] === 'b' ? 'b' : 'w';
  const castling = parts[2] && parts[2] !== '' && /^[KQkq-]+$/.test(parts[2]) ? parts[2] : '-';
  const enPassant = parts[3] && /^[a-h][36]$/.test(parts[3]) ? parts[3] : '-';

  const parsedHalf = parseInt(parts[4] || '0', 10);
  const halfMove = isNaN(parsedHalf) ? '0' : parsedHalf.toString();

  const parsedFull = parseInt(parts[5] || '1', 10);
  const fullMove = isNaN(parsedFull) ? '1' : parsedFull.toString();

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
 * Separates main line moves from variations and returns sanitized FEN, UCI moves, and clean PGN.
 */
export function parsePgnWithVariations(pgnText: string): ParsedPgnResult & { uciMoves: string[] } {
  if (!pgnText || !pgnText.trim()) {
    return {
      success: false,
      fen: DEFAULT_START_FEN,
      mainMoves: [],
      uciMoves: [],
      variations: [],
      cleanPgn: '',
      error: 'Empty PGN text provided',
    };
  }

  const trimmed = pgnText.trim();

  // Check if input is a PGN containing move numbers or PGN headers
  const isPgnWithMoves =
    trimmed.includes('[Event') ||
    trimmed.includes('[FEN') ||
    /\b1\.\s*/.test(trimmed) ||
    /\b1\.\.\.\s*/.test(trimmed);

  // If NOT a PGN with explicit move markers, treat purely as a FEN position (0 moves)
  if (!isPgnWithMoves) {
    const sanitizedFen = sanitizeFen(trimmed);
    return {
      success: true,
      fen: sanitizedFen,
      mainMoves: [],
      uciMoves: [],
      variations: [],
      cleanPgn: `[Event "ChessHub Game"]\n[FEN "${sanitizedFen}"]\n\n`,
    };
  }

  let rawFen = DEFAULT_START_FEN;

  // Extract FEN tag if present in header [FEN "..."]
  const fenMatch = trimmed.match(/\[FEN\s+"([^"]+)"\]/i);
  if (fenMatch && fenMatch[1]) {
    rawFen = fenMatch[1];
  } else {
    // Check if first line is a FEN tag or FEN string before moves
    const firstLine = trimmed.split('\n')[0].trim();
    if (firstLine.includes('/') && firstLine.split(/\s+/).length >= 2) {
      rawFen = firstLine;
    }
  }

  const sanitizedFen = sanitizeFen(rawFen);

  // Extract variations in parentheses e.g. (1. Ra4) or (Ra4)
  const variations: string[] = [];
  const variationRegex = /\(([^)]+)\)/g;
  let varMatch;

  while ((varMatch = variationRegex.exec(trimmed)) !== null) {
    const varText = varMatch[1].trim();
    if (varText) {
      variations.push(varText);
    }
  }

  // Strip variations, PGN headers, outcome markers (*, 1-0, 0-1, 1/2-1/2), and raw FEN line from moveBody
  let moveBody = trimmed
    .replace(/\[[^\]]+\]/g, '') // remove header tags
    .replace(/\([^)]+\)/g, '')  // remove variations
    .replace(/\{[^}]+\}/g, '')  // remove comments
    .replace(/\$\d+/g, '')       // remove NAGs
    .replace(/1-0|0-1|1\/2-1\/2|\*/g, ''); // remove result markers

  // If first line was a FEN string, strip it from moveBody so FEN parts aren't parsed as moves
  if (rawFen !== DEFAULT_START_FEN && moveBody.includes(rawFen.trim())) {
    moveBody = moveBody.replace(rawFen.trim(), '');
  }

  moveBody = moveBody.trim();

  // Extract candidate move tokens
  const candidateTokens = moveBody
    .replace(/\d+\.+/g, ' ') // remove move numbers like 1. or 1...
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const mainMoves: string[] = [];
  const uciMoves: string[] = [];

  // Try playing candidate moves using Chess.js from sanitizedFen
  try {
    const chess = new Chess(sanitizedFen);
    for (const token of candidateTokens) {
      // Ignore non-move tokens or FEN parts if present
      if (token === 'w' || token === 'b' || token === '-' || token === '0' || token === '1') continue;
      try {
        const mv = chess.move(token);
        if (mv) {
          mainMoves.push(mv.san); // SAN notation e.g. e4, Nf3, Qh4#
          uciMoves.push(`${mv.from}${mv.to}${mv.promotion || ''}`);
        }
      } catch {
        // Skip invalid move token
      }
    }
  } catch {
    // FEN playback fallback
  }

  // Build clean playable PGN
  const cleanPgn = `[Event "ChessHub Game"]\n[FEN "${sanitizedFen}"]\n\n${mainMoves.join(' ')}`;

  return {
    success: true,
    fen: sanitizedFen,
    mainMoves,
    uciMoves,
    variations,
    cleanPgn,
  };
}
