import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type {
  BotLevelConfig,
  StudentBotProfile,
  BotGameRecord,
  GameResult,
  GameTermination,
  TimeControlOption,
  StudentColor,
} from './types';

export const BOT_LEVELS: BotLevelConfig[] = [
  { level: 1, rating: 400, name: 'Level 1 — Pawn', description: 'Beginner (400)', depth: 1, skillLevel: 0, avatarIcon: '♟️' },
  { level: 2, rating: 600, name: 'Level 2 — Knight', description: 'Casual (600)', depth: 2, skillLevel: 2, avatarIcon: '♞' },
  { level: 3, rating: 800, name: 'Level 3 — Bishop', description: 'Intermediate (800)', depth: 4, skillLevel: 5, avatarIcon: '♝' },
  { level: 4, rating: 1000, name: 'Level 4 — Rook', description: 'Club Player (1000)', depth: 6, skillLevel: 8, avatarIcon: '♜' },
  { level: 5, rating: 1200, name: 'Level 5 — Queen', description: 'Advanced (1200)', depth: 8, skillLevel: 11, avatarIcon: '♛' },
  { level: 6, rating: 1400, name: 'Level 6 — Candidate Master', description: 'Expert CM (1400)', depth: 10, skillLevel: 14, avatarIcon: '🏅' },
  { level: 7, rating: 1600, name: 'Level 7 — Master', description: 'FIDE Master (1600)', depth: 12, skillLevel: 16, avatarIcon: '🎖️' },
  { level: 8, rating: 1800, name: 'Level 8 — International Master', description: 'Master IM (1800)', depth: 14, skillLevel: 18, avatarIcon: '🥇' },
  { level: 9, rating: 2000, name: 'Level 9 — Grandmaster', description: 'FIDE GM (2000)', depth: 16, skillLevel: 19, avatarIcon: '👑' },
  { level: 10, rating: 2200, name: 'Level 10 — Super Engine', description: 'Champion Bot (2200)', depth: 18, skillLevel: 20, avatarIcon: '⚡' },
];

export function getBotLevelConfig(levelNumber: number): BotLevelConfig {
  const found = BOT_LEVELS.find((b) => b.level === levelNumber);
  return found || BOT_LEVELS[0];
}

export function calculateRatingDelta(result: GameResult): number {
  if (result === 'win') return 20;
  if (result === 'draw') return 5;
  if (result === 'loss') return -15;
  return 0;
}

export function getUnlockedLevels(rating: number, coachUnlocked: number[] = []): number[] {
  const unlocked = new Set<number>([1]);
  BOT_LEVELS.forEach((b) => {
    if (rating >= b.rating) {
      unlocked.add(b.level);
    }
  });
  coachUnlocked.forEach((lvl) => {
    if (lvl >= 1 && lvl <= 10) unlocked.add(lvl);
  });
  return Array.from(unlocked).sort((a, b) => a - b);
}

export function getCurrentLevelFromRating(rating: number): number {
  let highest = 1;
  BOT_LEVELS.forEach((b) => {
    if (rating >= b.rating) highest = Math.max(highest, b.level);
  });
  return highest;
}

export async function getOrCreateStudentBotProfile(studentUserId: string): Promise<StudentBotProfile> {
  const admin = createSupabaseAdmin();
  try {
    const { data: existing, error } = await admin
      .from('student_bot_profiles')
      .select('*')
      .eq('student_id', studentUserId)
      .maybeSingle();

    if (!error && existing) {
      const unlocked = getUnlockedLevels(existing.rating, existing.coach_unlocked_levels || []);
      return {
        ...existing,
        unlocked_levels: unlocked,
        current_level: getCurrentLevelFromRating(existing.rating),
      };
    }
  } catch (err) {}

  // Create initial profile if missing
  const initialProfile: Partial<StudentBotProfile> = {
    student_id: studentUserId,
    rating: 400,
    highest_rating: 400,
    current_level: 1,
    unlocked_levels: [1],
    coach_unlocked_levels: [],
    games_played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    win_streak: 0,
    highest_win_streak: 0,
    puzzles_solved: 0,
  };

  try {
    const { data: inserted, error: insertErr } = await admin
      .from('student_bot_profiles')
      .insert(initialProfile)
      .select()
      .single();

    if (!insertErr && inserted) {
      return inserted;
    }
  } catch (err) {}

  // Fallback return
  return {
    id: `fallback-${studentUserId}`,
    student_id: studentUserId,
    rating: 400,
    highest_rating: 400,
    current_level: 1,
    unlocked_levels: [1],
    coach_unlocked_levels: [],
    games_played: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    win_streak: 0,
    highest_win_streak: 0,
    puzzles_solved: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
