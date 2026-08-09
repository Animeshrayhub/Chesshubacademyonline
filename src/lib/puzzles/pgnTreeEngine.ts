/**
 * ChessHub Academy — PGN Variation Tree Engine
 * Parses raw PGN study text containing main lines, sub-variations in parentheses,
 * comments, NAGs, and custom starting FENs into a dynamic move tree.
 */

import { Chess } from 'chess.js';
import { sanitizeFen, extractFenFromText } from '@/utils/chessSanitizer';

export interface PgnMoveNode {
  id: string;
  ply: number;
  moveNumber: number;
  turn: 'w' | 'b';
  san: string;
  fen: string;
  comment?: string;
  nag?: string;
  parentId?: string | null;
  children: PgnMoveNode[]; // children[0] is mainline move, children[1..n] are variation branches
  isMainline: boolean;
}

export interface PgnStudyTree {
  id: string;
  title: string;
  event: string;
  date: string;
  startingFen: string;
  orientation: 'white' | 'black';
  rootNodes: PgnMoveNode[]; // Starting move choices (mainline move + starting variations)
  rawPgn: string;
  result?: string;
}

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

function generateNodeId(): string {
  return `node_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Strip move numbers, comments, NAGs, result tokens from a raw move string fragment.
 */
function cleanMoveToken(rawToken: string): string {
  return rawToken
    .replace(/\{[^}]*\}/g, '')
    .replace(/\$\d+/g, '')
    .replace(/\d+\.+\s*/g, '')
    .replace(/(1-0|0-1|1\/2-1\/2|\*)/g, '')
    .trim();
}

/**
 * Extract headers from PGN string block.
 */
export function parsePgnHeaders(pgnText: string): Record<string, string> {
  const headers: Record<string, string> = {};
  const headerRegex = /\[(\w+)\s+"([^"]*)"\]/g;
  let match: RegExpExecArray | null;
  while ((match = headerRegex.exec(pgnText)) !== null) {
    headers[match[1]] = match[2];
  }
  return headers;
}

/**
 * Recursive PGN movetext tokenizer and variation parser.
 */
export function parseMovetextToTree(movetext: string, startingFen = DEFAULT_FEN): PgnMoveNode[] {
  if (!movetext || !movetext.trim()) return [];

  // Helper recursive parser that processes tokens with bracket depth tracking
  function parseBranch(
    tokens: string[],
    parentFen: string,
    currentPly: number,
    isMainPath: boolean,
    parentId: string | null = null
  ): PgnMoveNode[] {
    const nodes: PgnMoveNode[] = [];
    const safeParentFen = sanitizeFen(parentFen);
    let tempChess: Chess;
    try {
      tempChess = new Chess(safeParentFen);
    } catch {
      tempChess = new Chess(DEFAULT_FEN);
    }

    let idx = 0;
    let lastNode: PgnMoveNode | null = null;

    while (idx < tokens.length) {
      const token = tokens[idx];

      if (token === '(') {
        // Sub-variation starts! Collect all tokens inside matching parentheses
        let depth = 1;
        const varTokens: string[] = [];
        idx++;
        while (idx < tokens.length && depth > 0) {
          if (tokens[idx] === '(') depth++;
          else if (tokens[idx] === ')') depth--;

          if (depth > 0) {
            varTokens.push(tokens[idx]);
          }
          idx++;
        }

        // Parse variation branch starting from the parent FEN of the previous move
        if (varTokens.length > 0) {
          const varParentFen = lastNode ? parentFen : parentFen;
          const varNodes = parseBranch(varTokens, varParentFen, currentPly, false, parentId);
          if (varNodes.length > 0 && lastNode) {
            lastNode.children.push(varNodes[0]);
          } else if (varNodes.length > 0) {
            nodes.push(varNodes[0]);
          }
        }
        continue;
      }

      if (token === ')') {
        idx++;
        continue;
      }

      // Check if token is a comment `{ comment }`
      if (token.startsWith('{')) {
        const commentText = token.replace(/[{}]/g, '').trim();
        if (lastNode) lastNode.comment = commentText;
        idx++;
        continue;
      }

      // Clean single move token
      const sanMove = cleanMoveToken(token);
      if (!sanMove) {
        idx++;
        continue;
      }

      try {
        const moveResult = tempChess.move(sanMove);
        if (moveResult) {
          const fenAfter = tempChess.fen();
          const turn = moveResult.color;
          const moveNum = Math.floor((currentPly + nodes.length) / 2) + 1;

          const node: PgnMoveNode = {
            id: generateNodeId(),
            ply: currentPly + nodes.length + 1,
            moveNumber: moveNum,
            turn,
            san: moveResult.san,
            fen: fenAfter,
            children: [],
            parentId,
            isMainline: isMainPath && nodes.length === 0,
          };

          if (lastNode) {
            lastNode.children.push(node);
            node.parentId = lastNode.id;
          } else {
            nodes.push(node);
          }

          lastNode = node;
        }
      } catch {
        // Skip invalid SAN tokens silently
      }

      idx++;
    }

    return nodes;
  }

  // Tokenize movetext respecting comments `{...}` and variation parens `(...)`
  const rawTokens: string[] = [];
  let inComment = false;
  let commentBuffer = '';

  for (let i = 0; i < movetext.length; i++) {
    const ch = movetext[i];
    if (ch === '{') {
      inComment = true;
      commentBuffer = '{';
    } else if (ch === '}') {
      inComment = false;
      commentBuffer += '}';
      rawTokens.push(commentBuffer);
      commentBuffer = '';
    } else if (inComment) {
      commentBuffer += ch;
    } else if (ch === '(' || ch === ')') {
      rawTokens.push(ch);
    } else {
      if (/\s/.test(ch)) continue;
      // Read word token until space or paren or brace
      let token = '';
      while (i < movetext.length && !/\s/.test(movetext[i]) && movetext[i] !== '(' && movetext[i] !== ')' && movetext[i] !== '{' && movetext[i] !== '}') {
        token += movetext[i];
        i++;
      }
      i--; // Adjust back for outer loop
      if (token) rawTokens.push(token);
    }
  }

  return parseBranch(rawTokens, startingFen, 0, true);
}

/**
 * Main parser: converts raw PGN text into PgnStudyTree.
 */
export function parsePgnToStudyTree(pgnText: string): PgnStudyTree {
  const headers = parsePgnHeaders(pgnText);
  const rawStartingFen = extractFenFromText(pgnText);
  const startingFen = sanitizeFen(rawStartingFen);
  const title = headers['Event'] || headers['White'] || 'PGN Tactical Study';
  const result = headers['Result'] || '*';
  const orientation = startingFen.split(' ')[1] === 'b' ? 'black' : 'white';

  // Extract movetext after headers
  const lines = pgnText.split('\n');
  const movetextLines = lines.filter((l) => !l.trim().startsWith('[') && l.trim().length > 0);
  const movetext = movetextLines.join(' ');

  const rootNodes = parseMovetextToTree(movetext, startingFen);

  return {
    id: `study_${Date.now()}`,
    title: title !== '?' ? title : 'Chess PGN Study',
    event: headers['Event'] || 'Tactics',
    date: headers['Date'] || new Date().toISOString().slice(0, 10),
    startingFen,
    orientation,
    rootNodes,
    rawPgn: pgnText,
    result,
  };
}

/**
 * Validates whether a move played by the student matches ANY branch (mainline or variation)
 * at the current node position in the PGN tree.
 */
export function findMatchingMoveInTree(
  candidateNodes: PgnMoveNode[],
  studentMoveSanOrUci: string,
  currentFen: string
): PgnMoveNode | null {
  if (!candidateNodes || candidateNodes.length === 0) return null;

  // Try loading move with chess.js to get standard SAN representation
  let sanToMatch = studentMoveSanOrUci;
  try {
    const c = new Chess(currentFen);
    const m = c.move(studentMoveSanOrUci);
    if (m) sanToMatch = m.san;
  } catch {}

  for (const node of candidateNodes) {
    if (node.san === sanToMatch || node.san.toLowerCase() === studentMoveSanOrUci.toLowerCase()) {
      return node;
    }
  }

  return null;
}

/**
 * Get opponent's automatic response move from a move node (if available).
 */
export function getOpponentAutoReply(node: PgnMoveNode): PgnMoveNode | null {
  if (node.children && node.children.length > 0) {
    return node.children[0]; // Mainline continuation after student move
  }
  return null;
}

/**
 * Flatten mainline moves into array of SAN strings.
 */
export function getMainlineMoves(rootNodes: PgnMoveNode[]): string[] {
  const moves: string[] = [];
  let curr: PgnMoveNode | undefined = rootNodes[0];
  while (curr) {
    moves.push(curr.san);
    curr = curr.children[0];
  }
  return moves;
}
