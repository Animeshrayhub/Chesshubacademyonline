import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { assertAdminOrCoach } from '@/lib/permissions';
import { Chess } from 'chess.js';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    await assertAdminOrCoach();
    const body = await req.json();
    const {
      ecoCode,
      name,
      color = 'white',
      difficulty = 'Beginner',
      style = 'Tactical',
      description = '',
      mainLinePgn = '',
      startingFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
      trapTitle,
      trapPgn,
      trapDescription,
      modelGameTitle,
      modelGamePgn,
      modelGameDescription,
    } = body;

    if (!name || !mainLinePgn) {
      return NextResponse.json({ error: 'Opening name and Main Line moves are required.' }, { status: 400 });
    }

    const admin = createSupabaseAdmin();

    // 1. Insert Opening into Repertoire Catalog
    const { data: opening, error: opErr } = await admin
      .from('openings')
      .insert({
        eco_code: ecoCode || 'A00',
        name,
        color,
        difficulty,
        style,
        description: description || `Master Opening Repertoire: ${name} (${ecoCode || 'A00'})`,
        starting_fen: startingFen,
        opening_moves: mainLinePgn,
        is_published: true,
        tags: [
          (ecoCode || 'A').substring(0, 1).toLowerCase(),
          'academy-master',
          difficulty.toLowerCase(),
          color,
        ],
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (opErr || !opening) {
      console.error('[CreateOpening API] DB error:', opErr);
      return NextResponse.json({ error: opErr?.message || 'Failed to create opening.' }, { status: 500 });
    }

    // 2. Insert Chapter 1: Core Master Line
    await admin.from('opening_chapters').insert({
      opening_id: opening.id,
      chapter_num: 1,
      chapter_type: 'main_line',
      title: `Chapter 1: Core Master Line`,
      is_unlocked: true,
      beginner_content: `Master the fundamental theoretical moves and strategic ideas of the ${name}.`,
      content_json: {
        pgn: mainLinePgn,
        type: 'main_line',
        summary: description || `Core theory for ${name}`,
      },
      updated_at: new Date().toISOString(),
    });

    // 3. Insert Chapter 2: Common Traps & Tactical Tricks
    if (trapPgn || trapTitle) {
      await admin.from('opening_chapters').insert({
        opening_id: opening.id,
        chapter_num: 2,
        chapter_type: 'tactics',
        title: `Chapter 2: ${trapTitle || 'Opening Traps & Tactical Pitfalls'}`,
        is_unlocked: true,
        beginner_content: trapDescription || 'Crucial traps and tactical pitfalls to remember.',
        content_json: {
          pgn: trapPgn || mainLinePgn,
          type: 'tactics',
          summary: trapDescription || 'Common tactical motifs and traps in this opening.',
        },
        updated_at: new Date().toISOString(),
      });
    }

    // 4. Insert Chapter 3: Grandmaster Model Game
    if (modelGamePgn || modelGameTitle) {
      await admin.from('opening_chapters').insert({
        opening_id: opening.id,
        chapter_num: 3,
        chapter_type: 'practice',
        title: `Chapter 3: ${modelGameTitle || 'Grandmaster Model Game'}`,
        is_unlocked: true,
        beginner_content: modelGameDescription || 'Exemplary master game demonstrating ideal middlegame execution.',
        content_json: {
          pgn: modelGamePgn || mainLinePgn,
          type: 'practice',
          summary: modelGameDescription || 'Instructive Grandmaster model game.',
        },
        updated_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      data: { openingId: opening.id, name: opening.name, ecoCode: opening.eco_code },
    });
  } catch (err: any) {
    console.error('[POST /api/admin/openings/create]', err);
    return NextResponse.json({ error: err?.message || 'Internal server error.' }, { status: 500 });
  }
}
