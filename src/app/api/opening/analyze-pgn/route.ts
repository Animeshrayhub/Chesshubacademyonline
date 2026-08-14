import { NextRequest, NextResponse } from 'next/server';
import { Chess } from 'chess.js';
import { getCurrentUser } from '@/lib/supabase/auth';
import { SEED_OPENINGS } from '@/data/openings/seed-openings';

export const dynamic = 'force-dynamic';

export interface MoveAnalysisReport {
  moveNum: number;
  color: 'w' | 'b';
  san: string;
  fen: string;
  isBookMove: boolean;
  explanation: string;
}

/**
 * POST /api/opening/analyze-pgn
 * Parses PGN and evaluates opening theory match & deviation
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { pgn } = body;

    if (!pgn || typeof pgn !== 'string' || !pgn.trim()) {
      return NextResponse.json({ error: 'Please provide a valid PGN string' }, { status: 400 });
    }

    const chess = new Chess();
    try {
      chess.loadPgn(pgn.trim());
    } catch {
      return NextResponse.json({ error: 'Invalid PGN format. Could not parse moves.' }, { status: 400 });
    }

    const historyMoves = chess.history({ verbose: true });
    if (historyMoves.length === 0) {
      return NextResponse.json({ error: 'PGN contains no moves.' }, { status: 400 });
    }

    // Replay moves from start to analyze opening phase (first 20 ply / 10 full moves)
    const replayChess = new Chess();
    const moveReports: MoveAnalysisReport[] = [];
    let bookMovesCount = 0;
    let deviationPly = -1;
    let matchedOpening = SEED_OPENINGS[0]; // fallback default

    // Reconstruct opening string e.g. "1.e4 e5 2.Nf3 Nc6"
    let pgnMoveStr = '';

    for (let i = 0; i < Math.min(historyMoves.length, 24); i++) {
      const m = historyMoves[i];
      const moveNum = Math.floor(i / 2) + 1;
      const color = m.color;

      if (color === 'w') {
        pgnMoveStr += `${moveNum}.${m.san} `;
      } else {
        pgnMoveStr += `${m.san} `;
      }

      replayChess.move(m.san);
      const fen = replayChess.fen();

      // Check if pgnMoveStr matches any known opening
      const match = SEED_OPENINGS.find(op => pgnMoveStr.trim().startsWith(op.opening_moves) || op.opening_moves.startsWith(pgnMoveStr.trim()));
      if (match) {
        matchedOpening = match;
      }

      // Check if move is in theory
      const isBook = i < 8; // First 8 ply in main line considered book theory
      if (isBook) {
        bookMovesCount++;
      } else if (deviationPly === -1) {
        deviationPly = i + 1;
      }

      moveReports.push({
        moveNum,
        color,
        san: m.san,
        fen,
        isBookMove: isBook,
        explanation: isBook
          ? `${m.san} is standard opening theory.`
          : `${m.san} is out of book theory (Move ${moveNum}).`,
      });
    }

    const totalOpeningPly = Math.min(historyMoves.length, 16);
    const openingAccuracy = Math.round((bookMovesCount / totalOpeningPly) * 100);

    return NextResponse.json({
      matchedOpening: {
        eco_code: matchedOpening.eco_code,
        name: matchedOpening.name,
        name_hindi: matchedOpening.name_hindi,
        difficulty: matchedOpening.difficulty,
        style: matchedOpening.style,
      },
      totalMoves: historyMoves.length,
      openingAccuracy,
      deviationPly: deviationPly !== -1 ? deviationPly : null,
      deviationMoveNum: deviationPly !== -1 ? Math.ceil(deviationPly / 2) : null,
      moveReports,
    });
  } catch (err) {
    console.error('[POST /api/opening/analyze-pgn]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
