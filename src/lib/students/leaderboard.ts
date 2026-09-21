import { createSupabaseAdmin } from '../supabase/admin';
import { BaseError, DatabaseError, InternalServerError, type Result } from '../errors';
import {
  buildDynamicAcademyCohort,
  DIVISIONS,
  type DivisionTier,
  type SimulatedStudentPeer,
  type LiveTickerEvent,
  type SeasonInfo,
} from './leaderboardSimulation';

export type LeaderboardCategory = 'xp' | 'tactics' | 'homework' | 'rating';

export interface LeaderboardEntry {
  id: string;
  userId: string;
  name: string;
  username: string;
  avatar: string;
  level: string;
  xp: number;
  tacticsSolved: number;
  homeworkCompleted: number;
  rating: number;
  streak: number;
  botLevel: number;
  isYou: boolean;
  rank: number;
}

export interface LeaderboardResponse {
  entries: {
    xp: LeaderboardEntry[];
    tactics: LeaderboardEntry[];
    homework: LeaderboardEntry[];
    rating: LeaderboardEntry[];
  };
  divisions: Record<DivisionTier, SimulatedStudentPeer[]>;
  tickerEvents: LiveTickerEvent[];
  seasonInfo: SeasonInfo;
  yourStanding: {
    xp: { rank: number; score: number };
    tactics: { rank: number; score: number };
    homework: { rank: number; score: number };
    rating: { rank: number; score: number };
    division: DivisionTier;
    divisionRank: number;
  } | null;
  totalStudents: number;
  lastUpdated: string;
}

const AVATAR_POOL = ['👑', '🦁', '⚡', '🐉', '🎯', '🦅', '🐺', '🔥', '🛡️', '⚔️', '♟️', '♞', '♝', '♜', '♛', '♚'];

function getAvatarForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_POOL.length;
  return AVATAR_POOL[index];
}

function formatStudentName(firstName?: string | null, lastName?: string | null, username?: string | null): string {
  if (firstName && firstName.trim().length > 0) {
    const f = firstName.trim();
    const l = lastName && lastName.trim().length > 0 ? ` ${lastName.trim()[0]}.` : '';
    return `${f}${l}`;
  }
  if (username && username.trim().length > 0) {
    return username.trim();
  }
  return 'Academy Student';
}

/**
 * Fetches real academy enrolled students from Supabase and aggregates
 * rankings across Overall XP, Tactics Solved, Homework Completed, and Rating.
 */
export async function getAcademyLeaderboard(currentUserId?: string): Promise<Result<LeaderboardResponse>> {
  try {
    const admin = createSupabaseAdmin();

    // 1. Fetch active students from users table
    const { data: users, error: usersErr } = await admin
      .from('users')
      .select('id, username, first_name, last_name, is_active, archived_at')
      .eq('role', 'STUDENT')
      .is('archived_at', null)
      .limit(100);

    if (usersErr) {
      console.warn('[getAcademyLeaderboard] users fetch error:', usersErr);
    }

    const studentUsers = ((users as any[]) || []).filter((u: any) => u.is_active !== false);

    // 2. Fetch student profiles
    const { data: profiles } = await admin
      .from('student_profiles')
      .select('id, user_id, level, joined_date, created_at')
      .is('archived_at', null);

    const profileByUserId = new Map<string, any>();
    const profileIdToUserId = new Map<string, string>();
    ((profiles as any[]) || []).forEach((p: any) => {
      if (p.user_id) {
        profileByUserId.set(p.user_id, p);
        profileIdToUserId.set(p.id, p.user_id);
      }
    });

    // 3. Fetch bot profiles for training rating, streak, bot knockouts
    const { data: botProfiles } = await admin
      .from('student_bot_profiles')
      .select('student_id, rating, highest_rating, training_points, highest_unlocked_level, win_streak, puzzles_solved, wins');

    const botByStudentId = new Map<string, any>();
    ((botProfiles as any[]) || []).forEach((bp: any) => {
      if (bp.student_id) {
        botByStudentId.set(bp.student_id, bp);
      }
    });

    // 4. Fetch solved puzzle results
    const { data: puzzleRows } = await admin
      .from('puzzle_results')
      .select('student_id, solved');

    const puzzleCountsByProfileId = new Map<string, number>();
    ((puzzleRows as any[]) || []).forEach((pr: any) => {
      if (pr.solved && pr.student_id) {
        const prev = puzzleCountsByProfileId.get(pr.student_id) || 0;
        puzzleCountsByProfileId.set(pr.student_id, prev + 1);
      }
    });

    // 5. Fetch completed homework submissions
    const { data: homeworkAssignments } = await admin
      .from('homework_assignments')
      .select('id, student_id');

    const assignmentToStudent = new Map<string, string>();
    ((homeworkAssignments as any[]) || []).forEach((a: any) => {
      if (a.student_id) {
        assignmentToStudent.set(a.id, a.student_id);
      }
    });

    const { data: homeworkSubmissions } = await admin
      .from('homework_submissions')
      .select('assignment_id');

    const homeworkCountsByProfileId = new Map<string, number>();
    ((homeworkSubmissions as any[]) || []).forEach((sub: any) => {
      const studentId = assignmentToStudent.get(sub.assignment_id);
      if (studentId) {
        const prev = homeworkCountsByProfileId.get(studentId) || 0;
        homeworkCountsByProfileId.set(studentId, prev + 1);
      }
    });

    // Build raw aggregated records for each student
    const rawList: Omit<LeaderboardEntry, 'rank'>[] = studentUsers.map((u: any) => {
      const profile = profileByUserId.get(u.id);
      const profileId = profile?.id || u.id;
      const bot = botByStudentId.get(u.id) || botByStudentId.get(profileId);

      const tacticsSolved = (puzzleCountsByProfileId.get(profileId) || 0) + (bot?.puzzles_solved || 0);
      const homeworkCompleted = homeworkCountsByProfileId.get(profileId) || 0;
      const botLevel = bot?.highest_unlocked_level || 1;
      const rating = bot?.rating || 400;
      const streak = bot?.win_streak || 1;

      // XP formula: Base (50) + Tactics * 15 + Homework * 60 + Bot Points + Streak bonus
      const trainingPoints = bot?.training_points || (bot?.wins || 0) * 25;
      const xp = 50 + tacticsSolved * 15 + homeworkCompleted * 60 + trainingPoints + streak * 10;

      const level = profile?.level || (rating >= 1200 ? 'Advanced' : rating >= 800 ? 'Intermediate' : 'Beginner');
      const isYou = Boolean(currentUserId && (u.id === currentUserId || profileId === currentUserId));

      return {
        id: profileId,
        userId: u.id,
        name: formatStudentName(u.first_name, u.last_name, u.username),
        username: u.username || '',
        avatar: getAvatarForId(u.id),
        level,
        xp,
        tacticsSolved,
        homeworkCompleted,
        rating,
        streak,
        botLevel,
        isYou,
      };
    });

    // If current student is not in the list (e.g. fresh registration or test mode), add them
    if (currentUserId && !rawList.some((e) => e.isYou)) {
      rawList.push({
        id: `current-${currentUserId}`,
        userId: currentUserId,
        name: 'You (Current Student)',
        username: 'you',
        avatar: '🛡️',
        level: 'Beginner',
        xp: 150,
        tacticsSolved: 3,
        homeworkCompleted: 1,
        rating: 400,
        streak: 1,
        botLevel: 1,
        isYou: true,
      });
    }

    // Sort into the 4 categories
    const sortedByXp = [...rawList]
      .sort((a, b) => b.xp - a.xp || b.tacticsSolved - a.tacticsSolved)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    const sortedByTactics = [...rawList]
      .sort((a, b) => b.tacticsSolved - a.tacticsSolved || b.xp - a.xp)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    const sortedByHomework = [...rawList]
      .sort((a, b) => b.homeworkCompleted - a.homeworkCompleted || b.xp - a.xp)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    const sortedByRating = [...rawList]
      .sort((a, b) => b.rating - a.rating || b.botLevel - a.botLevel)
      .map((entry, idx) => ({ ...entry, rank: idx + 1 }));

    // Find current student standing across each category
    const yourXpEntry = sortedByXp.find((e) => e.isYou);
    const yourTacticsEntry = sortedByTactics.find((e) => e.isYou);
    const yourHomeworkEntry = sortedByHomework.find((e) => e.isYou);
    const yourRatingEntry = sortedByRating.find((e) => e.isYou);

    // 3. Build Dynamic Academy Cohort with 4 Division Leagues & Live Ticker
    const { cohort, divisions, tickerEvents, seasonInfo } = buildDynamicAcademyCohort(
      rawList.map((r) => ({
        id: r.id,
        userId: r.userId,
        name: r.name,
        username: r.username,
        avatar: r.avatar,
        rating: r.rating,
        trainingPoints: r.xp,
        streak: r.streak,
        botLevel: r.botLevel,
        isYou: r.isYou,
      })),
      currentUserId
    );

    const currentUserDivisionPeer = cohort.find((c) => c.isYou);
    const currentUserDivision = currentUserDivisionPeer?.division || 'bronze';
    const currentUserDivisionRank = currentUserDivisionPeer?.rank || 1;

    const yourStanding = yourXpEntry
      ? {
          xp: { rank: yourXpEntry.rank, score: yourXpEntry.xp },
          tactics: { rank: yourTacticsEntry?.rank || yourXpEntry.rank, score: yourTacticsEntry?.tacticsSolved || 0 },
          homework: { rank: yourHomeworkEntry?.rank || yourXpEntry.rank, score: yourHomeworkEntry?.homeworkCompleted || 0 },
          rating: { rank: yourRatingEntry?.rank || yourXpEntry.rank, score: yourRatingEntry?.rating || 400 },
          division: currentUserDivision,
          divisionRank: currentUserDivisionRank,
        }
      : null;

    return {
      success: true,
      data: {
        entries: {
          xp: sortedByXp,
          tactics: sortedByTactics,
          homework: sortedByHomework,
          rating: sortedByRating,
        },
        divisions,
        tickerEvents,
        seasonInfo,
        yourStanding,
        totalStudents: cohort.length,
        lastUpdated: new Date().toISOString(),
      },
    };
  } catch (err) {
    console.error('[getAcademyLeaderboard] Unexpected error:', err);
    return {
      success: false,
      error: new InternalServerError(err instanceof Error ? err.message : 'Failed to fetch academy leaderboard'),
    };
  }
}
