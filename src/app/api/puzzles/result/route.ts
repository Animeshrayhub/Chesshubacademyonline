import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/utils/supabaseServer';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { savePuzzleResult } from '@/lib/puzzles/results';
import type { PuzzleResult } from '@/lib/puzzles/types';
import { parseStudentStats, serializeStudentStats } from '@/lib/students/stats';

/**
 * POST /api/puzzles/result
 *
 * Saves a puzzle solve result for the currently authenticated student.
 * Body: PuzzleResult JSON
 */
async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 300): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      attempt++;
      if (attempt >= retries) throw err;
      await new Promise((resolve) => setTimeout(resolve, delay * attempt));
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient();
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve student profile using admin client (since RLS might restrict student profiles access depending on config)
    const admin = createSupabaseAdmin();
    const { data: profile } = await admin
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (!profile) {
      return NextResponse.json(
        { error: 'Student profile not found' },
        { status: 404 }
      );
    }

    const body: PuzzleResult = await req.json();

    // Basic validation
    if (
      !body.puzzleId ||
      !body.puzzleSource ||
      typeof body.solved !== 'boolean' ||
      typeof body.attempts !== 'number'
    ) {
      return NextResponse.json(
        { error: 'Invalid puzzle result payload' },
        { status: 400 }
      );
    }

    const result = await withRetry(async () => {
      const res = await savePuzzleResult(profile.id, body);
      if (!res.success) {
        throw new Error(res.error.message);
      }
      return res;
    });

    if (body.solved) {
      try {
        const prof = await withRetry(async () => {
          const { data, error } = await admin
            .from('student_profiles')
            .select('notes')
            .eq('id', profile.id)
            .single();
          if (error) throw error;
          return data;
        });
        
        if (prof) {
          const stats = parseStudentStats(prof.notes);
          stats.xp += 10;
          const updatedNotes = serializeStudentStats(prof.notes, stats);
          await withRetry(async () => {
            const { error } = await admin
              .from('student_profiles')
              .update({ notes: updatedNotes })
              .eq('id', profile.id);
            if (error) throw error;
          });
        }
      } catch (err) {
        console.error('Failed to reward XP:', err);
      }
    }

    return NextResponse.json({ id: result.data.id }, { status: 201 });
  } catch (error) {
    console.error('[/api/puzzles/result] Error saving puzzle result:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
