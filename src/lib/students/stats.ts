export interface StudentStats {
  xp: number;
  shields: number;
  equippedPet?: string;
  equippedGear?: string;
  unlockedGear?: string[];
  lastLoginDate?: string;
  loginDates?: string[];
  loginStreak?: number;
  milestonesClaimed?: number[];
  tacticalRating?: number;
  puzzlesSolved?: number;
  puzzlesAttempted?: number;
  puzzleStreak?: number;
  reviewMistakes?: string[];
}

export function parseStudentStats(notes: string | null): StudentStats {
  const defaultStats: StudentStats = {
    xp: 0,
    shields: 0,
    equippedPet: 'dragon',
    equippedGear: 'none',
    unlockedGear: ['none'],
    lastLoginDate: undefined,
    loginDates: [],
    loginStreak: 0,
    milestonesClaimed: [],
    tacticalRating: 1200,
    puzzlesSolved: 0,
    puzzlesAttempted: 0,
    puzzleStreak: 0,
    reviewMistakes: [],
  };
  if (!notes) return defaultStats;

  const parts = notes.split('=== CHESSHUB_STATS ===');
  if (parts.length < 2) return defaultStats;

  try {
    const parsed = JSON.parse(parts[1].trim());
    return {
      xp: typeof parsed.xp === 'number' ? parsed.xp : 0,
      shields: typeof parsed.shields === 'number' ? parsed.shields : 0,
      equippedPet: typeof parsed.equippedPet === 'string' ? parsed.equippedPet : 'dragon',
      equippedGear: typeof parsed.equippedGear === 'string' ? parsed.equippedGear : 'none',
      unlockedGear: Array.isArray(parsed.unlockedGear) ? parsed.unlockedGear : ['none'],
      lastLoginDate: typeof parsed.lastLoginDate === 'string' ? parsed.lastLoginDate : undefined,
      loginDates: Array.isArray(parsed.loginDates) ? parsed.loginDates : [],
      loginStreak: typeof parsed.loginStreak === 'number' ? parsed.loginStreak : 0,
      milestonesClaimed: Array.isArray(parsed.milestonesClaimed) ? parsed.milestonesClaimed : [],
      tacticalRating: typeof parsed.tacticalRating === 'number' ? parsed.tacticalRating : 1200,
      puzzlesSolved: typeof parsed.puzzlesSolved === 'number' ? parsed.puzzlesSolved : 0,
      puzzlesAttempted: typeof parsed.puzzlesAttempted === 'number' ? parsed.puzzlesAttempted : 0,
      puzzleStreak: typeof parsed.puzzleStreak === 'number' ? parsed.puzzleStreak : 0,
      reviewMistakes: Array.isArray(parsed.reviewMistakes) ? parsed.reviewMistakes : [],
    };
  } catch {
    return defaultStats;
  }
}

export function serializeStudentStats(notes: string | null, stats: StudentStats): string {
  const baseNotes = notes ? notes.split('=== CHESSHUB_STATS ===')[0].trim() : '';
  const jsonStr = JSON.stringify(stats);
  return baseNotes ? `${baseNotes}\n\n=== CHESSHUB_STATS ===\n${jsonStr}` : `=== CHESSHUB_STATS ===\n${jsonStr}`;
}

