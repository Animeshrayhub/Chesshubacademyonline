import { NextRequest, NextResponse } from 'next/server';
import { Chess } from 'chess.js';
import { getCurrentUser } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/opening/validate
 * Validates a chess move against:
 * 1. Chess.js (legal move check)
 * 2. Opening database (is this move in theory?)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { fen, move, opening_id, chapter_num, expected_moves, wrong_moves } = body;

    if (!fen || !move) {
      return NextResponse.json({ error: 'Missing fen or move' }, { status: 400 });
    }

    // ── Step 1: Chess.js legality check ─────────────────────────────────────
    let chess: Chess;
    try {
      chess = new Chess(fen);
    } catch {
      return NextResponse.json({ error: 'Invalid FEN position' }, { status: 400 });
    }

    let madeMove: ReturnType<typeof chess.move> | null = null;
    let isLegal = false;
    let newFen = fen;

    try {
      madeMove = chess.move(move);
      isLegal = true;
      newFen = chess.fen();
    } catch {
      isLegal = false;
    }

    if (!isLegal) {
      return NextResponse.json({
        isLegal: false,
        isCorrect: false,
        isInOpeningDb: false,
        newFen: fen,
        move,
        explanation: "That move isn't legal in this position. Check the piece movement rules and try again.",
        explanation_hindi: "यह चाल इस स्थिति में कानूनी नहीं है। पीस मूवमेंट नियम जांचें।",
        mistakeType: 'illegal_move',
      });
    }

    // ── Step 2: Opening database check ──────────────────────────────────────
    // expected_moves: array of correct moves (SAN or UCI)
    // wrong_moves: array of known incorrect moves

    const moveSan = madeMove?.san ?? move;
    const moveUci = madeMove ? `${madeMove.from}${madeMove.to}${madeMove.promotion ?? ''}` : move;

    const isCorrect = Array.isArray(expected_moves) && expected_moves.length > 0
      ? expected_moves.some(
          (em: string) => em === moveSan || em === moveUci || em.toLowerCase() === move.toLowerCase()
        )
      : true; // If no expected moves defined, any legal move is "correct"

    const isKnownWrong = Array.isArray(wrong_moves) && wrong_moves.some(
      (wm: string) => wm === moveSan || wm === moveUci
    );

    // Determine if position is in "opening theory" (simplified: is in expected moves)
    const isInOpeningDb = isCorrect;

    // ── Step 3: Build response ───────────────────────────────────────────────
    let explanation = '';
    let explanation_hindi = '';
    let mistakeType: string | null = null;

    if (isCorrect) {
      explanation = `Well done! ${moveSan} is the correct move in this position. This is part of the ${chapter_num ? `Chapter ${chapter_num}` : 'opening'} theory.`;
      explanation_hindi = `शाबाश! ${moveSan} इस स्थिति में सही चाल है।`;
    } else if (isKnownWrong) {
      explanation = `${moveSan} creates a problem. Think about what your opponent's best response would be. Can you spot the issue?`;
      explanation_hindi = `${moveSan} एक समस्या पैदा करता है। सोचें कि प्रतिद्वंद्वी का सबसे अच्छा जवाब क्या होगा।`;
      mistakeType = 'wrong_move';
    } else {
      // Legal but not in theory — not necessarily wrong, just off-book
      explanation = `${moveSan} is a legal move, but this isn't the main opening theory line. The recommended move(s) here are ${expected_moves?.join(', ') || 'different'}. Off-book play can be risky — let's see what would happen.`;
      explanation_hindi = `${moveSan} एक कानूनी चाल है, लेकिन यह मुख्य ओपनिंग थ्योरी लाइन नहीं है।`;
      mistakeType = 'wrong_plan';
    }

    // Check game state after move
    const isCheck = chess.isCheck();
    const isCheckmate = chess.isCheckmate();
    const isDraw = chess.isDraw();

    return NextResponse.json({
      isLegal: true,
      isCorrect,
      isInOpeningDb,
      newFen,
      move: moveSan,
      moveUci,
      isCheck,
      isCheckmate,
      isDraw,
      explanation,
      explanation_hindi,
      mistakeType: !isCorrect ? mistakeType : null,
    });
  } catch (err) {
    console.error('[POST /api/opening/validate]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
