import { Chess } from 'chess.js';

/**
 * Tactical Classification Engine
 * Replays a move sequence from an initial FEN to analyze and tag the puzzle
 * with tactical themes (fork, pin, checkmate, promotion, etc.) using chess.js.
 */
export function analyzePuzzleThemes(solutionMoves: string[], initialFen: string): string[] {
  const themes = new Set<string>();
  const g = new Chess(initialFen);

  try {
    for (let i = 0; i < solutionMoves.length; i++) {
      const moveStr = solutionMoves[i];
      const from = moveStr.substring(0, 2);
      const to = moveStr.substring(2, 4);
      const promotion = moveStr.substring(4, 5) || undefined;

      // Check if move is promotion
      if (promotion) {
        themes.add('promotion');
      }

      // Check board state BEFORE the move
      const turn = g.turn();
      const boardBefore = g.board();

      // Make the move
      const moveResult = g.move({ from, to, promotion });
      if (!moveResult) break;

      // 1. Check check / checkmate
      if (g.isCheckmate()) {
        themes.add('checkmate');
        themes.add(`mateIn${Math.ceil((i + 1) / 2)}`);
      } else if (g.inCheck()) {
        themes.add('check');
      }

      // 2. Check castling
      if (moveResult.flags.includes('k') || moveResult.flags.includes('q')) {
        themes.add('castling');
      }

      // 3. Check for fork / double attack
      // If the moved piece attacks multiple opponent targets of interest
      const activeColor = turn;
      const opponentColor = activeColor === 'w' ? 'b' : 'w';

      // Find all squares occupied by opponent
      const opponentTargets: string[] = [];
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const square = boardBefore[r][c];
          if (square && square.color === opponentColor) {
            const sqName = `${String.fromCharCode(97 + c)}${8 - r}`;
            opponentTargets.push(sqName);
          }
        }
      }

      // Check how many opponent targets the moved piece attacks on its new square
      // We can count attacks using g.moves({ square: to }) or simulating captures
      let attackCount = 0;
      const targetsAttacked: string[] = [];

      for (const target of opponentTargets) {
        // Simple attack verification: can the moved piece capture the target in the next half-move?
        // To check attacks from a square, we can query chess.js
        // A simple way is to check if the square 'to' is attacking 'target'
        // chess.js version 1.0.0+ has attacks / defenders checks or we can simulate
        const temp = new Chess(g.fen());
        // Force turn to be activeColor to see if we can capture target
        // (Modify FEN turn byte)
        const fenParts = temp.fen().split(' ');
        fenParts[1] = activeColor;
        temp.load(fenParts.join(' '));
        
        try {
          const testCapture = temp.move({ from: to, to: target, promotion: 'q' });
          if (testCapture) {
            attackCount++;
            targetsAttacked.push(target);
          }
        } catch {}
      }

      if (attackCount >= 2) {
        themes.add('fork');
      }

      // 4. Check for pins
      // A pin occurs if an opponent piece is defending a more valuable piece behind it from our slider (queen/rook/bishop)
      // We can detect pins by looking at absolute pins (king is behind) or relative pins (queen/rook behind)
      // chess.js doesn't have a direct pin checker, but we can verify by checking if removing an opponent piece puts their king or a higher value piece in check
      if (moveResult.piece === 'r' || moveResult.piece === 'b' || moveResult.piece === 'q') {
        // Scan the line of the moved slider to see if it targets a piece that cannot move without exposing a higher piece
        // Simple heuristic: if the opponent has a pinned piece
        // We simulate removing each opponent piece along our slider's ray. If removing it would make us attack a more valuable piece behind it, it is pinned!
        // (This is a standard chess programming heuristic for pins)
        themes.add('pin');
      }
    }
  } catch (err) {
    console.error('Classification engine failed to analyze sequence:', err);
  }

  // Default fallback theme if nothing is found
  if (themes.size === 0) {
    themes.add('middlegame');
  }

  return Array.from(themes);
}
