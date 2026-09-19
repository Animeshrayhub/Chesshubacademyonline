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

// Points Economy configuration
export const POINTS_CONFIG = {
  QUEST_SOLVE: 25,
  BOT_WIN: 75,
  BOT_DRAW: 25,
  BOT_LOSS_PENALTY: 15,
} as const;

// Level Unlock Thresholds (Level 1 is 0 pts free, every subsequent level requires +400 pts)
export const BOT_UNLOCK_THRESHOLDS: Record<number, number> = {
  1: 0,
  2: 400,
  3: 800,
  4: 1200,
  5: 1600,
  6: 2000,
  7: 2400,
  8: 2800,
  9: 3200,
  10: 3600,
};

export function getRequiredPointsForLevel(level: number): number {
  return BOT_UNLOCK_THRESHOLDS[level] ?? 0;
}

export function calculateTrainingPoints(
  wins: number,
  draws: number,
  losses: number,
  solvedQuizCount: number = 0
): number {
  const matchPoints = (wins * POINTS_CONFIG.BOT_WIN) + (draws * POINTS_CONFIG.BOT_DRAW) - (losses * POINTS_CONFIG.BOT_LOSS_PENALTY);
  const quizPoints = solvedQuizCount * POINTS_CONFIG.QUEST_SOLVE;
  return Math.max(0, matchPoints + quizPoints);
}

export function getUnlockedLevelsByPoints(
  points: number,
  highestLevelUnlocked: number = 1,
  coachUnlocked: number[] = []
): number[] {
  const unlocked = new Set<number>([1]); // Level 1 Novice Bot is always unlocked

  // Points-based unlock (+400 pts per tier)
  for (let lvl = 2; lvl <= 10; lvl++) {
    const threshold = BOT_UNLOCK_THRESHOLDS[lvl];
    if (points >= threshold) {
      unlocked.add(lvl);
    }
  }

  // Monotonic permanence: once a level was unlocked, it never relocks
  for (let lvl = 1; lvl <= highestLevelUnlocked; lvl++) {
    unlocked.add(lvl);
  }

  // Coach Master Key overrides
  coachUnlocked.forEach((lvl) => {
    if (lvl >= 1 && lvl <= 10) unlocked.add(lvl);
  });

  return Array.from(unlocked).sort((a, b) => a - b);
}

export function getCurrentLevelFromPoints(points: number, highestLevelUnlocked: number = 1): number {
  let current = Math.max(1, highestLevelUnlocked);
  for (let lvl = 1; lvl <= 10; lvl++) {
    if (points >= BOT_UNLOCK_THRESHOLDS[lvl]) {
      current = Math.max(current, lvl);
    }
  }
  return current;
}

export function getUnlockedLevels(rating: number, coachUnlocked: number[] = []): number[] {
  // Backwards-compatible bridge: delegates to Level 1 default with coach overrides
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
      const computedPoints = existing.training_points ?? calculateTrainingPoints(
        existing.wins || 0,
        existing.draws || 0,
        existing.losses || 0,
        Array.isArray(existing.solved_quiz_ids) ? existing.solved_quiz_ids.length : (existing.puzzles_solved || 0)
      );
      const highestUnlocked = existing.highest_unlocked_level ?? getCurrentLevelFromPoints(computedPoints, 1);
      const unlocked = getUnlockedLevelsByPoints(computedPoints, highestUnlocked, existing.coach_unlocked_levels || []);

      return {
        ...existing,
        training_points: computedPoints,
        highest_unlocked_level: highestUnlocked,
        unlocked_levels: unlocked,
        current_level: getCurrentLevelFromPoints(computedPoints, highestUnlocked),
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
    training_points: 0,
    highest_unlocked_level: 1,
    solved_quiz_ids: [],
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
    training_points: 0,
    highest_unlocked_level: 1,
    solved_quiz_ids: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}
