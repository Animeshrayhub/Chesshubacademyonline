export interface ThemeStat {
  correct: number;
  total: number;
}

export interface PuzzleLogEntry {
  date: string;
  puzzleId: string;
  theme: string;
  isCorrect: boolean;
  ratingDelta: number;
}

export interface StudentPuzzleStats {
  tacticalRating: number;
  totalSolved: number;
  totalAttempted: number;
  currentStreak: number;
  bestStreak: number;
  lastSolvedDate: string; // YYYY-MM-DD
  todaySolvedCount: number;
  dailyGoal: number; // default: 5
  xp: number;
  themeAccuracy: Record<string, ThemeStat>;
  historyLog: PuzzleLogEntry[];
}

const STORAGE_KEY = 'chess_student_puzzle_stats_v1';

export function getTodayDateString(): string {
  const d = new Date();
  return d.toISOString().split('T')[0];
}

export function getDefaultPuzzleStats(): StudentPuzzleStats {
  return {
    tacticalRating: 1200,
    totalSolved: 0,
    totalAttempted: 0,
    currentStreak: 0,
    bestStreak: 0,
    lastSolvedDate: '',
    todaySolvedCount: 0,
    dailyGoal: 5,
    xp: 0,
    themeAccuracy: {
      fork: { correct: 0, total: 0 },
      pin: { correct: 0, total: 0 },
      skewer: { correct: 0, total: 0 },
      mateIn1: { correct: 0, total: 0 },
      mateIn2: { correct: 0, total: 0 },
      mateIn3: { correct: 0, total: 0 },
      sacrifice: { correct: 0, total: 0 },
      discoveredAttack: { correct: 0, total: 0 },
      endgame: { correct: 0, total: 0 },
      opening: { correct: 0, total: 0 },
      middlegame: { correct: 0, total: 0 },
      crushing: { correct: 0, total: 0 },
      hangingPiece: { correct: 0, total: 0 },
      zugzwang: { correct: 0, total: 0 },
    },
    historyLog: [],
  };
}

export function getStudentPuzzleStats(): StudentPuzzleStats {
  if (typeof window === 'undefined') return getDefaultPuzzleStats();

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultPuzzleStats();

    const parsed: StudentPuzzleStats = JSON.parse(raw);
    const today = getTodayDateString();

    // Check if daily solved count needs reset for a new day
    if (parsed.lastSolvedDate && parsed.lastSolvedDate !== today) {
      const last = new Date(parsed.lastSolvedDate);
      const now = new Date(today);
      const diffTime = Math.abs(now.getTime() - last.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Reset today count
      parsed.todaySolvedCount = 0;

      // If more than 1 day skipped, reset streak
      if (diffDays > 1) {
        parsed.currentStreak = 0;
      }
    }

    return parsed;
  } catch (err) {
    console.warn('Failed to read student puzzle stats:', err);
    return getDefaultPuzzleStats();
  }
}

export function saveStudentPuzzleStats(stats: StudentPuzzleStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stats));
  } catch (err) {
    console.error('Failed to save student puzzle stats:', err);
  }
}

export function getStudentRankTitle(rating: number, xp: number): { title: string; badge: string; minRating: number } {
  if (rating >= 2000 || xp >= 5000) {
    return { title: 'Grandmaster Vision', badge: '👑', minRating: 2000 };
  }
  if (rating >= 1700 || xp >= 2500) {
    return { title: 'Rook Crusher', badge: '♜', minRating: 1700 };
  }
  if (rating >= 1400 || xp >= 1000) {
    return { title: 'Bishop Sniper', badge: '♝', minRating: 1400 };
  }
  if (rating >= 1100 || xp >= 300) {
    return { title: 'Knight Strategist', badge: '♞', minRating: 1100 };
  }
  return { title: 'Pawn Tactician', badge: '♟️', minRating: 800 };
}

export function getWeakestTheme(stats: StudentPuzzleStats): { theme: string; accuracy: number; total: number } | null {
  let worstTheme: string | null = null;
  let lowestAcc = 100;
  let worstTotal = 0;

  Object.entries(stats.themeAccuracy).forEach(([theme, data]) => {
    if (data.total >= 3) {
      const acc = Math.round((data.correct / data.total) * 100);
      if (acc < lowestAcc) {
        lowestAcc = acc;
        worstTheme = theme;
        worstTotal = data.total;
      }
    }
  });

  if (worstTheme && lowestAcc < 75) {
    return { theme: worstTheme, accuracy: lowestAcc, total: worstTotal };
  }

  return null;
}

export interface RecordResult {
  newStats: StudentPuzzleStats;
  ratingDelta: number;
  xpGain: number;
  isGoalJustCompleted: boolean;
  rank: { title: string; badge: string };
}

export function recordPuzzleAttempt(
  puzzleId: string,
  puzzleRating: number,
  isCorrect: boolean,
  themes: string[] = ['tactics']
): RecordResult {
  const stats = getStudentPuzzleStats();
  const today = getTodayDateString();

  // 1. Elo Calculation
  const kFactor = 32;
  const expectedScore = 1 / (1 + Math.pow(10, (puzzleRating - stats.tacticalRating) / 400));
  const actualScore = isCorrect ? 1 : 0;
  let ratingDelta = Math.round(kFactor * (actualScore - expectedScore));

  if (isCorrect) {
    if (ratingDelta < 5) ratingDelta = 5; // minimum reward on solve
  } else {
    if (ratingDelta > -5) ratingDelta = -5; // minimum penalty on fail
    if (ratingDelta < -20) ratingDelta = -20; // max cap on single failure loss
  }

  stats.tacticalRating = Math.max(400, stats.tacticalRating + ratingDelta);
  stats.totalAttempted += 1;

  let xpGain = 0;
  let isGoalJustCompleted = false;

  if (isCorrect) {
    stats.totalSolved += 1;
    stats.todaySolvedCount += 1;

    // XP calculation
    xpGain += 10;

    // Daily Goal Check
    if (stats.todaySolvedCount === stats.dailyGoal) {
      isGoalJustCompleted = true;
      xpGain += 50; // Bonus XP for reaching daily goal
    }

    // Streak Check
    if (stats.lastSolvedDate !== today) {
      const last = stats.lastSolvedDate ? new Date(stats.lastSolvedDate) : null;
      const now = new Date(today);

      if (last) {
        const diffDays = Math.ceil(Math.abs(now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
        if (diffDays === 1) {
          stats.currentStreak += 1;
        } else if (diffDays > 1) {
          stats.currentStreak = 1;
        }
      } else {
        stats.currentStreak = 1;
      }

      if (stats.currentStreak > stats.bestStreak) {
        stats.bestStreak = stats.currentStreak;
      }
      stats.lastSolvedDate = today;
    }
  }

  stats.xp += xpGain;

  // Update Theme Accuracy
  const primaryTheme = themes[0] || 'tactics';
  themes.forEach((t) => {
    const key = t.toLowerCase();
    if (!stats.themeAccuracy[key]) {
      stats.themeAccuracy[key] = { correct: 0, total: 0 };
    }
    stats.themeAccuracy[key].total += 1;
    if (isCorrect) {
      stats.themeAccuracy[key].correct += 1;
    }
  });

  // History Log
  stats.historyLog.unshift({
    date: new Date().toISOString(),
    puzzleId,
    theme: primaryTheme,
    isCorrect,
    ratingDelta,
  });
  if (stats.historyLog.length > 50) stats.historyLog.pop();

  saveStudentPuzzleStats(stats);

  const rank = getStudentRankTitle(stats.tacticalRating, stats.xp);

  return {
    newStats: stats,
    ratingDelta,
    xpGain,
    isGoalJustCompleted,
    rank,
  };
}
