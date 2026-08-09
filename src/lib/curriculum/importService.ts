import { Chess } from 'chess.js';
import type { TeachingPosition, DifficultyLevel, BoardOrientation } from '@/types/curriculum.types';
import { pgnToTeachingPositions } from '@/utils/pgnParser';

export interface ImportedPositionData {
  title: string;
  fen: string;
  solution?: string;
  alternativeSolution?: string;
  hint?: string;
  explanation?: string;
  difficulty: DifficultyLevel;
  theme?: string;
  tags: string[];
  boardOrientation: BoardOrientation;
  defaultBoardLock: boolean;
  stockfishEval?: string;
  coachNotes?: string;
}

/**
 * Cleanly parses PGN string into array of Teaching Positions.
 * Supports multi-game / multi-study PGN format.
 */
export function parsePgnImport(pgnText: string): ImportedPositionData[] {
  if (!pgnText || !pgnText.trim()) return [];

  const teachingPositions = pgnToTeachingPositions(pgnText);
  if (teachingPositions.length === 0) return [];

  return teachingPositions.map((pos, idx) => ({
    title: pos.title || `Imported Position #${idx + 1}`,
    fen: pos.fen,
    solution: pos.solution || undefined,
    alternativeSolution: pos.alternativeSolution || undefined,
    hint: pos.hint || undefined,
    explanation: pos.explanation || undefined,
    difficulty: pos.difficulty || 'Intermediate',
    theme: pos.theme || 'PGN Import',
    tags: pos.tags && pos.tags.length > 0 ? pos.tags : ['PGN Import', 'Tactics'],
    boardOrientation: pos.boardOrientation || 'white',
    defaultBoardLock: true,
    coachNotes: pos.notes || undefined,
  }));
}

/**
 * Cleanly parses FEN batch input (single FEN or multi-line FEN string).
 */
export function parseFenImport(fenText: string): ImportedPositionData[] {
  if (!fenText || !fenText.trim()) return [];

  const lines = fenText.split('\n').map((l) => l.trim()).filter(Boolean);
  const results: ImportedPositionData[] = [];

  lines.forEach((line, idx) => {
    // Support FEN with optional space-separated title or move
    const parts = line.split('\t');
    let fen = parts[0] || line;
    let title = parts[1] || `FEN Position #${idx + 1}`;

    // Normalize FEN string
    let validFen = fen;
    try {
      const c = new Chess(fen);
      validFen = c.fen();
    } catch {
      // Keep string if partially valid FEN
    }

    const orientation: BoardOrientation = validFen.includes(' b ') ? 'black' : 'white';

    results.push({
      title,
      fen: validFen,
      difficulty: 'Beginner',
      tags: ['FEN Import'],
      boardOrientation: orientation,
      defaultBoardLock: true,
    });
  });

  return results;
}

/**
 * Parses CSV spreadsheet string into Teaching Positions.
 * Supported headers (case-insensitive):
 * Title, FEN, Solution, AlternativeSolution, Hint, Explanation, Difficulty, Theme, Tags, Orientation, Notes
 */
export function parseCsvImport(csvText: string): ImportedPositionData[] {
  if (!csvText || !csvText.trim()) return [];

  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return [];

  // Helper to parse CSV row considering quotes
  const parseRow = (text: string): string[] => {
    const arr: string[] = [];
    let quote = false;
    let col = '';
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        quote = !quote;
      } else if (c === ',' && !quote) {
        arr.push(col.trim());
        col = '';
      } else {
        col += c;
      }
    }
    arr.push(col.trim());
    return arr;
  };

  const headerRow = parseRow(lines[0]).map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  const getIdx = (name: string) => headerRow.findIndex((h) => h.includes(name));

  const titleIdx = getIdx('title');
  const fenIdx = getIdx('fen');
  const solIdx = getIdx('solution');
  const altSolIdx = getIdx('alt') >= 0 ? getIdx('alt') : getIdx('alternativesolution');
  const hintIdx = getIdx('hint');
  const expIdx = getIdx('exp');
  const diffIdx = getIdx('diff');
  const themeIdx = getIdx('theme');
  const tagsIdx = getIdx('tag');
  const orientIdx = getIdx('orient');
  const notesIdx = getIdx('note');

  const results: ImportedPositionData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = parseRow(lines[i]);
    if (row.length < 2) continue;

    const fen = (fenIdx >= 0 ? row[fenIdx] : row[1]) || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const title = (titleIdx >= 0 ? row[titleIdx] : row[0]) || `CSV Position #${i}`;
    const difficultyRaw = (diffIdx >= 0 ? row[diffIdx] : 'Beginner') as DifficultyLevel;
    const difficulty: DifficultyLevel = ['Beginner', 'Intermediate', 'Advanced', 'Master'].includes(difficultyRaw)
      ? difficultyRaw
      : 'Beginner';

    const tagsRaw = tagsIdx >= 0 ? row[tagsIdx] : '';
    const tags = tagsRaw.split(';').map((t) => t.trim()).filter(Boolean);
    if (tags.length === 0) tags.push('CSV Import');

    const orientRaw = (orientIdx >= 0 ? row[orientIdx] : 'white').toLowerCase();
    const boardOrientation: BoardOrientation = orientRaw.includes('black') ? 'black' : 'white';

    results.push({
      title,
      fen,
      solution: solIdx >= 0 ? row[solIdx] : undefined,
      alternativeSolution: altSolIdx >= 0 ? row[altSolIdx] : undefined,
      hint: hintIdx >= 0 ? row[hintIdx] : undefined,
      explanation: expIdx >= 0 ? row[expIdx] : undefined,
      difficulty,
      theme: themeIdx >= 0 ? row[themeIdx] : 'Tactics',
      tags,
      boardOrientation,
      defaultBoardLock: true,
      coachNotes: notesIdx >= 0 ? row[notesIdx] : undefined,
    });
  }

  return results;
}
