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
  {
    level: 1,
    rating: 400,
    name: 'Level 1 — Pawn',
    description: 'Beginner (400)',
    depth: 1,
    skillLevel: 0,
    avatarIcon: '♟️',
    openingStyle: 'Gentle Basics',
    speciality: 'Piece Movement & Easy Development',
    personality: 'Friendly Coach — makes gentle moves so kids learn and gain confidence!',
  },
  {
    level: 2,
    rating: 600,
    name: 'Level 2 — Knight',
    description: 'Casual (600)',
    depth: 2,
    skillLevel: 2,
    avatarIcon: '♞',
    openingStyle: 'Classical Opening Fundamentals',
    speciality: 'Center Control, Minor Piece Activity & Castling',
    personality: 'Knight Scout — plays solid fundamentals and avoids 1-move blunders!',
  },
  {
    level: 3,
    rating: 800,
    name: 'Level 3 — Bishop',
    description: 'Intermediate (800)',
    depth: 4,
    skillLevel: 5,
    avatarIcon: '♝',
    openingStyle: 'Italian Game & Fried Liver Attack',
    speciality: 'Fried Liver (6. Nxf7!), Scholar Defense & Tactical Traps',
    personality: 'Bishop Tactician — tests your opening knowledge with aggressive sacrifices!',
  },
  {
    level: 4,
    rating: 1000,
    name: 'Level 4 — Rook',
    description: 'Club Player (1000)',
    depth: 6,
    skillLevel: 8,
    avatarIcon: '♜',
    openingStyle: 'Ruy Lopez & Queen\'s Gambit',
    speciality: 'Positional Development & Solid Defense',
    personality: 'Rook Guardian — plays reliable club-level opening theory.',
  },
  {
    level: 5,
    rating: 1200,
    name: 'Level 5 — Queen',
    description: 'Advanced (1200)',
    depth: 8,
    skillLevel: 11,
    avatarIcon: '♛',
    openingStyle: 'Sicilian & French Defenses',
    speciality: 'Sharp Tactical Counter-Attacks',
    personality: 'Queen Striker — searches for tactical skewers and discovered checks.',
  },
  {
    level: 6,
    rating: 1400,
    name: 'Level 6 — Candidate Master',
    description: 'Expert CM (1400)',
    depth: 10,
    skillLevel: 14,
    avatarIcon: '🏅',
    openingStyle: 'Modern Tournament Repertoires',
    speciality: 'Pawn Structure & Imbalances',
    personality: 'Candidate Master — accurate opening execution and positional pressure.',
  },
  {
    level: 7,
    rating: 1600,
    name: 'Level 7 — Master',
    description: 'FIDE Master (1600)',
    depth: 12,
    skillLevel: 16,
    avatarIcon: '🎖️',
    openingStyle: 'FIDE Master Systems',
    speciality: 'Deep Opening Prep & Endgame Conversion',
    personality: 'FIDE Master — punishes tactical inaccuracies with precision.',
  },
  {
    level: 8,
    rating: 1800,
    name: 'Level 8 — International Master',
    description: 'Master IM (1800)',
    depth: 14,
    skillLevel: 18,
    avatarIcon: '🥇',
    openingStyle: 'Grandmaster Opening Theory',
    speciality: 'Complex Dynamic Imbalances',
    personality: 'International Master — high-level calculation and endgame mastery.',
  },
  {
    level: 9,
    rating: 2000,
    name: 'Level 9 — Grandmaster',
    description: 'FIDE GM (2000)',
    depth: 16,
    skillLevel: 19,
    avatarIcon: '👑',
    openingStyle: 'Super GM Opening Lines',
    speciality: 'Virtuoso Pro Tactics & Prophylaxis',
    personality: 'Grandmaster — relentless opening pressure and iron defense.',
  },
  {
    level: 10,
    rating: 2200,
    name: 'Level 10 — Super Engine',
    description: 'Champion Bot (2200)',
    depth: 18,
    skillLevel: 20,
    avatarIcon: '⚡',
    openingStyle: 'Deep Engine Theory',
    speciality: 'Flawless Calculation & Inevitable Mate',
    personality: 'Super Engine — maximum calculation speed and tactical depth.',
  },
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

export const BOT_LEVEL_UNLOCK_REQUIREMENTS: Record<number, { minRating: number; minXp: number }> = {
  1: { minRating: 400, minXp: 0 },
  2: { minRating: 400, minXp: 0 },
  3: { minRating: 500, minXp: 200 },
  4: { minRating: 650, minXp: 450 },
  5: { minRating: 800, minXp: 750 },
  6: { minRating: 950, minXp: 1100 },
  7: { minRating: 1100, minXp: 1500 },
  8: { minRating: 1250, minXp: 2000 },
  9: { minRating: 1400, minXp: 2600 },
  10: { minRating: 1600, minXp: 3300 },
};

export function getUnlockedLevels(
  rating: number,
  coachUnlocked: number[] = [],
  beatenLevel: number = 0,
  previousUnlocked: number[] = []
): number[] {
  // Levels 1 and 2 are unlocked by default for foundational beginner practice
  const unlocked = new Set<number>(previousUnlocked && previousUnlocked.length > 0 ? previousUnlocked : [1, 2]);
  unlocked.add(1);
  unlocked.add(2);

  // Progressive Points / Rating unlocks
  Object.entries(BOT_LEVEL_UNLOCK_REQUIREMENTS).forEach(([lvlStr, req]) => {
    const lvl = Number(lvlStr);
    if (rating >= req.minRating) {
      unlocked.add(lvl);
    }
  });

  // Knockout progression: beating level L unlocks up to L + 1
  if (beatenLevel > 0) {
    for (let lvl = 1; lvl <= Math.min(10, beatenLevel + 1); lvl++) {
      unlocked.add(lvl);
    }
  }

  // Coach Master Key override
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
