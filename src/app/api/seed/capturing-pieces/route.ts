import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { CAPTURING_PIECES_PUZZLES, getCapturingPiecesPgn } from '@/data/seedCapturingPieces';

export async function GET() {
  try {
    const admin = createSupabaseAdmin();
    const results: Record<string, any> = {};

    // 1. Seed into homework_workbooks & homework_chapters for Homework & Classroom drawer
    const workbookId = 'wb-capturing-pieces';
    const chapterId = 'chp-capturing-pieces';
    const pgnData = getCapturingPiecesPgn();

    const { error: wbErr } = await admin
      .from('homework_workbooks')
      .upsert({
        id: workbookId,
        title: 'Capturing Pieces',
        description: 'Comprehensive 60-puzzle set on capturing undefended and tactical pieces.',
        track: 'Beginner',
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (wbErr) {
      results.workbookError = wbErr.message;
    } else {
      results.workbook = 'Created / Updated wb-capturing-pieces';
    }

    const { error: chpErr } = await admin
      .from('homework_chapters')
      .upsert({
        id: chapterId,
        workbook_id: workbookId,
        chapter_number: 1,
        title: 'Capturing Pieces',
        description: '60 puzzles on capturing undefended pieces and material advantage.',
        questions_count: 60,
        pgn_data: pgnData,
        created_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (chpErr) {
      results.chapterError = chpErr.message;
    } else {
      results.chapter = 'Created / Updated chp-capturing-pieces with 60 PGN puzzles';
    }

    // 2. Seed into puzzle_bank for Classroom Drawer & Coach Puzzle Search
    const puzzleRows = CAPTURING_PIECES_PUZZLES.map((p) => ({
      id: `puz-cap-${p.id}`,
      title: p.title,
      fen: p.fen,
      solution: [p.solution],
      difficulty: 'Beginner',
      theme: 'Capturing Pieces',
      tags: ['Capturing Pieces', 'Tactics', 'Beginner'],
      hint_1: p.variation ? `Hint: ${p.variation}` : 'Look for the hanging / undefended piece!',
      explanation: `Solution: ${p.solution}`,
      created_at: new Date().toISOString(),
    }));

    const { error: puzErr } = await admin
      .from('puzzle_bank')
      .upsert(puzzleRows, { onConflict: 'id' });

    if (puzErr) {
      // If table doesn't exist yet, non-fatal
      results.puzzleBankNote = puzErr.message;
    } else {
      results.puzzleBank = `Inserted / Updated 60 puzzles into puzzle_bank`;
    }

    // 3. Seed into curriculum hierarchy (curriculum_chapters & teaching_positions)
    try {
      const { data: progs } = await admin
        .from('curriculum_programs')
        .select('id')
        .limit(1);

      let progId = progs?.[0]?.id;
      if (!progId) {
        const { data: newProg } = await admin
          .from('curriculum_programs')
          .insert({
            title: 'Grandmaster Tactical Foundations',
            description: 'Essential tactical motifs and puzzle sets.',
            target_level: 'Beginner',
            order_number: 1,
          })
          .select()
          .single();
        progId = newProg?.id;
      }

      if (progId) {
        const { data: crs } = await admin
          .from('curriculum_courses')
          .insert({
            program_id: progId,
            title: 'Capturing Pieces',
            description: '60 puzzles focusing on piece captures.',
            order_number: 1,
          })
          .select()
          .single();

        if (crs) {
          const { data: ch } = await admin
            .from('curriculum_chapters')
            .insert({
              course_id: crs.id,
              title: 'Capturing Pieces',
              description: '60 puzzles on capturing undefended pieces.',
              order_number: 1,
            })
            .select()
            .single();

          if (ch) {
            const { data: les } = await admin
              .from('curriculum_lessons')
              .insert({
                chapter_id: ch.id,
                title: 'Capturing Pieces (60 Puzzles)',
                description: 'Complete 60 puzzle set for classroom demonstration.',
                estimated_duration: 60,
                difficulty: 'Beginner',
                order_number: 1,
              })
              .select()
              .single();

            if (les) {
              const posRows = CAPTURING_PIECES_PUZZLES.map((p) => ({
                lesson_id: les.id,
                position_number: p.id,
                title: p.title,
                fen: p.fen,
                solution: p.solution,
                hint: p.variation || undefined,
                difficulty: 'Beginner',
                theme: 'Capturing Pieces',
                tags: ['Capturing Pieces'],
                order_number: p.id,
                board_orientation: p.sideToMove,
                default_board_lock: true,
              }));

              await admin.from('teaching_positions').insert(posRows);
              results.curriculumHierarchy = 'Seeded into curriculum_lessons & teaching_positions';
            }
          }
        }
      }
    } catch (curErr: any) {
      results.curriculumHierarchyNote = curErr.message;
    }

    return NextResponse.json({
      success: true,
      message: 'Successfully seeded 60 Capturing Pieces puzzles for Classroom & Homework!',
      results,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
