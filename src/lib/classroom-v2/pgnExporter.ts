import { type MoveData, type ClassroomBookmark } from './types';
import { DEFAULT_INITIAL_FEN } from './constants';

export interface LessonPgnOptions {
  className?: string;
  coachName?: string;
  moves: MoveData[];
  initialFen?: string;
  bookmarks?: ClassroomBookmark[];
  date?: string;
  result?: string;
}

/**
 * Builds a valid standard PGN string embedding all moves and coach bookmarks/notes as comments.
 */
export function generateLessonPgn({
  className = 'ChessHub Academy Live Class',
  coachName = 'Academy Coach',
  moves = [],
  initialFen,
  bookmarks = [],
  date,
  result = '*',
}: LessonPgnOptions): string {
  const currentDate = date || new Date().toISOString().split('T')[0].replace(/-/g, '.');

  const headers: string[] = [
    `[Event "${className}"]`,
    `[Site "ChessHub Academy (chesshubacademy.online)"]`,
    `[Date "${currentDate}"]`,
    `[Round "1"]`,
    `[White "${coachName}"]`,
    `[Black "Classroom Students"]`,
    `[Result "${result}"]`,
  ];

  if (initialFen && initialFen.trim() && initialFen.trim() !== DEFAULT_INITIAL_FEN) {
    headers.push(`[SetUp "1"]`);
    headers.push(`[FEN "${initialFen.trim()}"]`);
  }

  // Group bookmarks by moveIndex
  const bookmarkMap = new Map<number, string[]>();
  for (const bm of bookmarks) {
    const list = bookmarkMap.get(bm.moveIndex) || [];
    list.push(bm.note);
    bookmarkMap.set(bm.moveIndex, list);
  }

  // Format move pairs with inline comments
  const moveTokens: string[] = [];
  for (let i = 0; i < moves.length; i++) {
    const move = moves[i];
    if (i % 2 === 0) {
      const moveNumber = Math.floor(i / 2) + 1;
      moveTokens.push(`${moveNumber}.`);
    }
    moveTokens.push(move.san || move.uci || '??');

    // Attach any bookmarked coach notes on this move
    const notes = bookmarkMap.get(i);
    if (notes && notes.length > 0) {
      for (const note of notes) {
        // Clean comment string
        const cleanNote = note.replace(/[{}]/g, '').trim();
        moveTokens.push(`{ [Coach Note] ${cleanNote} }`);
      }
    }
  }

  // Check if there are setup bookmarks before any moves
  const setupNotes = bookmarkMap.get(-1);
  let preamble = '';
  if (setupNotes && setupNotes.length > 0) {
    preamble = `{ [Initial Setup Notes] ${setupNotes.join('; ')} }\n\n`;
  }

  const movesBody = moveTokens.length > 0 ? moveTokens.join(' ') + ` ${result}` : result;
  return `${headers.join('\n')}\n\n${preamble}${movesBody}`.trim();
}

/**
 * Triggers a browser file download of the generated PGN file.
 */
export function downloadPgnFile(filename: string, pgnContent: string): void {
  if (typeof window === 'undefined') return;

  const cleanFilename = (filename || 'ChessHub_Lesson')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const blob = new Blob([pgnContent], { type: 'application/x-chess-pgn;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cleanFilename}.pgn`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Copies PGN text to the user's system clipboard.
 */
export async function copyPgnToClipboard(pgnContent: string): Promise<boolean> {
  if (typeof navigator === 'undefined' || !navigator.clipboard) return false;
  try {
    await navigator.clipboard.writeText(pgnContent);
    return true;
  } catch {
    return false;
  }
}
