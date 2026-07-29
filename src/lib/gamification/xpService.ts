export interface StudentRankInfo {
  level: number;
  rankTitle: 'Pawn' | 'Knight' | 'Bishop' | 'Rook' | 'Queen' | 'King';
  badgeIcon: string;
  currentXp: number;
  xpForCurrentLevel: number;
  xpForNextLevel: number;
  progressPercent: number;
}

export const RANKS = [
  { minLevel: 1, maxLevel: 4, title: 'Pawn' as const, icon: '♟️', minXp: 0, maxXp: 500 },
  { minLevel: 5, maxLevel: 9, title: 'Knight' as const, icon: '♞', minXp: 500, maxXp: 1500 },
  { minLevel: 10, maxLevel: 14, title: 'Bishop' as const, icon: '♝', minXp: 1500, maxXp: 3000 },
  { minLevel: 15, maxLevel: 19, title: 'Rook' as const, icon: '♜', minXp: 3000, maxXp: 5000 },
  { minLevel: 20, maxLevel: 24, title: 'Queen' as const, icon: '♛', minXp: 5000, maxXp: 8000 },
  { minLevel: 25, maxLevel: 99, title: 'King' as const, icon: '♚', minXp: 8000, maxXp: 15000 },
];

/**
 * Calculates rank title, level, and XP progression metrics from raw XP points.
 */
export function calculateStudentRank(totalXp: number = 0): StudentRankInfo {
  const xp = Math.max(0, totalXp);

  let rankConfig = RANKS[0];
  for (const r of RANKS) {
    if (xp >= r.minXp) {
      rankConfig = r;
    }
  }

  const range = rankConfig.maxXp - rankConfig.minXp;
  const inRankXp = xp - rankConfig.minXp;
  const rawProgress = Math.min(100, Math.max(0, Math.floor((inRankXp / range) * 100)));

  // Level calculation within rank
  const levelSpan = rankConfig.maxLevel - rankConfig.minLevel + 1;
  const levelOffset = Math.floor((inRankXp / range) * levelSpan);
  const level = Math.min(rankConfig.maxLevel, rankConfig.minLevel + levelOffset);

  return {
    level,
    rankTitle: rankConfig.title,
    badgeIcon: rankConfig.icon,
    currentXp: xp,
    xpForCurrentLevel: rankConfig.minXp,
    xpForNextLevel: rankConfig.maxXp,
    progressPercent: rawProgress,
  };
}

/**
 * Returns XP points gained for specific student actions.
 */
export function getXpReward(action: 'puzzle_solved' | 'homework_completed' | 'class_attended' | 'streak_bonus'): number {
  switch (action) {
    case 'puzzle_solved': return 50;
    case 'homework_completed': return 150;
    case 'class_attended': return 200;
    case 'streak_bonus': return 100;
    default: return 25;
  }
}
