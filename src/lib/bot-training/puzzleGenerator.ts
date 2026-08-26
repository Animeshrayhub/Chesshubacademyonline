import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { AnalyzedMistake, PersonalizedPuzzle, StudentWeakness, WeaknessStatus } from './types';

/**
 * Processes analyzed mistakes from a completed game:
 * 1. Saves each genuine mistake to student_bot_mistakes.
 * 2. Upserts the weakness theme counter in student_weaknesses.
 * 3. When a theme reaches 3 occurrences, generates a personalized puzzle.
 *
 * Rules:
 * - 1st occurrence: NEEDS_PRACTICE, no puzzle
 * - 2nd occurrence: NEEDS_PRACTICE, no puzzle
 * - 3rd+ occurrence: NEEDS_PRACTICE + puzzle generated
 * - Status upgrade to IMPROVING/STRONG/MASTERED only happens via puzzle solving
 */
export async function processGameMistakesAndPuzzles(
  studentUserId: string,
  gameId: string,
  mistakes: AnalyzedMistake[]
): Promise<{ newWeaknesses: StudentWeakness[]; generatedPuzzles: PersonalizedPuzzle[] }> {
  const admin = createSupabaseAdmin();
  const generatedPuzzles: PersonalizedPuzzle[] = [];
  const updatedWeaknesses: StudentWeakness[] = [];

  // Deduplicate: only process the first occurrence of each theme per game.
  // This prevents a single game with 5 "fork" mistakes from counting as 5 occurrences.
  const seenThemesThisGame = new Set<string>();

  for (const m of mistakes) {
    const theme = m.theme;
    if (!theme || !studentUserId || !gameId) continue;

    // Skip duplicate themes within the same game — each game counts as 1 occurrence per theme.
    if (seenThemesThisGame.has(theme)) continue;
    seenThemesThisGame.add(theme);

    // ── Step A: Save the individual mistake log ─────────────────────────────
    let savedMistakeId: string | null = null;
    try {
      const { data: savedMistake, error: mistakeErr } = await admin
        .from('student_bot_mistakes')
        .insert({
          student_id: studentUserId,
          game_id: gameId,
          move_number: m.move_number || 1,
          fen_before: m.fen_before || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          fen_after: m.fen_after || m.fen_before || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
          played_move: m.played_move || '?',
          best_move: m.best_move || '',
          evaluation_before: m.evaluation_before || '0.0',
          evaluation_after: m.evaluation_after || '0.0',
          evaluation_drop: m.evaluation_drop || 1.0,
          mistake_type: m.mistake_type || 'inaccuracy',
          severity: m.severity || 'medium',
          theme,
          explanation: m.explanation || 'Mistake detected.',
          better_idea: m.better_idea || null,
        })
        .select('id')
        .single();

      if (mistakeErr) {
        console.error('[puzzleGenerator] mistake insert error:', mistakeErr.message, mistakeErr.code);
      } else if (savedMistake) {
        savedMistakeId = savedMistake.id; // Real DB UUID
      }
    } catch (e) {
      console.error('[puzzleGenerator] exception saving mistake:', e);
    }

    // ── Step B: Upsert weakness counter ────────────────────────────────────
    let existingWeakness: StudentWeakness | null = null;
    try {
      const { data } = await admin
        .from('student_weaknesses')
        .select('*')
        .eq('student_id', studentUserId)
        .eq('weakness_type', theme)
        .maybeSingle();
      existingWeakness = data;
    } catch (e) {}

    const now = new Date().toISOString();
    const newOccurrences = existingWeakness ? existingWeakness.occurrences + 1 : 1;
    const newRecent = existingWeakness ? existingWeakness.recent_occurrences + 1 : 1;

    // Status only progresses through puzzle solving — keep NEEDS_PRACTICE here.
    // Exception: if the student was previously IMPROVING/STRONG and is regressing
    // (many new occurrences), keep their current status rather than downgrading.
    const currentStatus: WeaknessStatus = existingWeakness?.status || 'NEEDS_PRACTICE';
    const newStatus: WeaknessStatus = currentStatus === 'MASTERED' || currentStatus === 'STRONG'
      ? currentStatus  // Don't downgrade from hard-earned status by a new mistake
      : 'NEEDS_PRACTICE';

    const weaknessPayload = {
      student_id: studentUserId,
      weakness_type: theme,
      occurrences: newOccurrences,
      recent_occurrences: newRecent,
      severity: m.severity || 'medium',
      last_seen: now,
      status: newStatus,
      updated_at: now,
    };

    let savedWeakness: StudentWeakness | null = null;
    try {
      const { data, error: weakErr } = await admin
        .from('student_weaknesses')
        .upsert(weaknessPayload, { onConflict: 'student_id,weakness_type' })
        .select()
        .single();

      if (weakErr) {
        console.error('[puzzleGenerator] weakness upsert error:', weakErr.message, weakErr.code);
      } else if (data) {
        savedWeakness = data;
        updatedWeaknesses.push(data);
      }
    } catch (e) {
      console.error('[puzzleGenerator] exception upserting weakness:', e);
    }

    // ── Step C: Generate personalized puzzle at 3rd occurrence ──────────────
    // Rule: same theme must occur in 3 SEPARATE GAMES before a puzzle is generated.
    // We already deduplicate within a game above.
    if (newOccurrences >= 3 && m.fen_before && savedMistakeId) {
      // Check if a puzzle for this theme was recently generated (avoid duplicating puzzles)
      let existingPuzzleCount = 0;
      try {
        const { count } = await admin
          .from('personalized_puzzles')
          .select('id', { count: 'exact', head: true })
          .eq('student_id', studentUserId)
          .eq('weakness_type', theme)
          .eq('status', 'active');
        existingPuzzleCount = count ?? 0;
      } catch (e) {}

      // Only generate a new puzzle if there are fewer than 3 active puzzles for this theme
      if (existingPuzzleCount < 3) {
        const sideToMove: 'white' | 'black' = m.fen_before.split(' ')[1] === 'w' ? 'white' : 'black';
        const themeTitle = formatThemeTitle(theme);
        const puzzleTitle = `Practice: ${themeTitle}`;

        const puzzlePayload: Partial<PersonalizedPuzzle> = {
          student_id: studentUserId,
          source_game_id: gameId,
          source_mistake_id: savedMistakeId,  // ✅ Real DB UUID — not the fake analysisEngine ID
          weakness_type: theme,
          fen: m.fen_before,
          side_to_move: sideToMove,
          solution: '',  // No fake solution — set to empty; student studies the position
          explanation: m.explanation || `This position requires careful piece safety awareness. Find the best move for ${sideToMove}.`,
          title: puzzleTitle,
          difficulty: 800 + Math.min(800, (newOccurrences - 3) * 200),
          status: 'active',
          attempts: 0,
          correct_attempts: 0,
        };

        try {
          const { data: createdPuzzle, error: puzzleErr } = await admin
            .from('personalized_puzzles')
            .insert(puzzlePayload)
            .select()
            .single();

          if (puzzleErr) {
            console.error('[puzzleGenerator] puzzle insert error:', puzzleErr.message, puzzleErr.code);
          } else if (createdPuzzle) {
            generatedPuzzles.push(createdPuzzle);

            // Mark that a puzzle was generated for this weakness
            if (savedWeakness) {
              try {
                await admin
                  .from('student_weaknesses')
                  .update({ puzzles_generated: (savedWeakness.puzzles_generated || 0) + 1 })
                  .eq('id', savedWeakness.id);
              } catch (e) {}
            }
          }
        } catch (e) {
          console.error('[puzzleGenerator] exception creating puzzle:', e);
        }
      }
    }
  }

  return { newWeaknesses: updatedWeaknesses, generatedPuzzles };
}

/**
 * Updates puzzle attempt stats and upgrades weakness status when student solves puzzles.
 * Status progression: NEEDS_PRACTICE → IMPROVING → STRONG → MASTERED
 */
export async function updateWeaknessOnPuzzleAttempt(
  studentUserId: string,
  puzzleId: string,
  isCorrect: boolean
): Promise<{ success: boolean; newStatus?: WeaknessStatus }> {
  const admin = createSupabaseAdmin();
  try {
    const { data: puzzle, error: fetchErr } = await admin
      .from('personalized_puzzles')
      .select('*')
      .eq('id', puzzleId)
      .single();

    if (fetchErr || !puzzle) {
      console.error('[puzzleGenerator] puzzle fetch for attempt:', fetchErr?.message);
      return { success: false };
    }

    const now = new Date().toISOString();
    const attempts = (puzzle.attempts || 0) + 1;
    const correctAttempts = (puzzle.correct_attempts || 0) + (isCorrect ? 1 : 0);
    const newPuzzleStatus = isCorrect ? 'solved' : 'active';

    const { error: updateErr } = await admin
      .from('personalized_puzzles')
      .update({
        attempts,
        correct_attempts: correctAttempts,
        status: newPuzzleStatus,
        last_attempted: now,
      })
      .eq('id', puzzleId);

    if (updateErr) {
      console.error('[puzzleGenerator] puzzle update error:', updateErr.message);
    }

    // ── Update Student Weakness progress ────────────────────────────────────
    const { data: weakness } = await admin
      .from('student_weaknesses')
      .select('*')
      .eq('student_id', studentUserId)
      .eq('weakness_type', puzzle.weakness_type)
      .maybeSingle();

    if (weakness) {
      const pCompleted = (weakness.puzzles_completed || 0) + 1;
      const pCorrect = (weakness.puzzles_correct || 0) + (isCorrect ? 1 : 0);
      const ratio = pCorrect / pCompleted;

      // Status ladder: NEEDS_PRACTICE → IMPROVING → STRONG → MASTERED
      let status: WeaknessStatus = weakness.status;
      if (pCompleted >= 5 && ratio >= 0.8) {
        status = 'MASTERED';
      } else if (pCompleted >= 3 && ratio >= 0.7) {
        status = 'STRONG';
      } else if (pCompleted >= 1 && isCorrect) {
        status = 'IMPROVING';
      }

      await admin
        .from('student_weaknesses')
        .update({
          puzzles_completed: pCompleted,
          puzzles_correct: pCorrect,
          last_practiced: now,
          status,
          updated_at: now,
        })
        .eq('id', weakness.id);

      return { success: true, newStatus: status };
    }

    return { success: true };
  } catch (err) {
    console.error('[puzzleGenerator] exception in updateWeaknessOnPuzzleAttempt:', err);
    return { success: false };
  }
}

export function formatThemeTitle(theme: string): string {
  return theme
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}
