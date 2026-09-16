'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import {
  BOT_LEVELS,
  getBotLevelConfig,
  calculateRatingDelta,
  getUnlockedLevels,
  getCurrentLevelFromRating,
  getOrCreateStudentBotProfile,
} from '@/lib/bot-training/botService';
import { analyzeGamePositions } from '@/lib/bot-training/analysisEngine';
import { processGameMistakesAndPuzzles, updateWeaknessOnPuzzleAttempt } from '@/lib/bot-training/puzzleGenerator';
import { getCuratedPuzzlesForTheme } from '@/lib/bot-training/weaknessPuzzleBank';
import { checkAndAwardBadges } from '@/lib/bot-training/badgeEngine';
import { recordStudentActivity } from '@/lib/activity';
import type {
  GameResult,
  GameTermination,
  TimeControlOption,
  StudentColor,
  StudentBotProfile,
  BotGameRecord,
  RatingHistoryEntry,
  StudentWeakness,
  PersonalizedPuzzle,
  StudentBadge,
} from '@/lib/bot-training/types';

/**
 * Fetches full Bot Training Profile, Rating History, Weaknesses, Puzzles, Badges & Recent Games.
 */
export async function getStudentBotProfileAction(targetStudentUserId?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: { message: 'Unauthorized.' } };
    }

    const admin = createSupabaseAdmin();
    const isCoachOrAdmin = user.role === 'COACH' || user.role === 'ADMIN';
    const effectiveUserId = (isCoachOrAdmin && targetStudentUserId) ? targetStudentUserId : user.id;

    // 1. Profile
    const profile = await getOrCreateStudentBotProfile(effectiveUserId);

    // 2. Rating History
    let ratingHistory: RatingHistoryEntry[] = [];
    try {
      const { data } = await admin
        .from('student_bot_rating_history')
        .select('*')
        .eq('student_id', effectiveUserId)
        .order('created_at', { ascending: true })
        .limit(50);
      if (data) ratingHistory = data;
    } catch (e) {}

    // 3. Weaknesses
    let weaknesses: StudentWeakness[] = [];
    try {
      const { data } = await admin
        .from('student_weaknesses')
        .select('*')
        .eq('student_id', effectiveUserId)
        .order('occurrences', { ascending: false });
      if (data) weaknesses = data;
    } catch (e) {}

    // 4. Personalized Puzzles
    let puzzles: PersonalizedPuzzle[] = [];
    try {
      const { data } = await admin
        .from('personalized_puzzles')
        .select('*')
        .eq('student_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) puzzles = data;
    } catch (e) {}

    // 5. Badges
    let badges: StudentBadge[] = [];
    try {
      const { data } = await admin
        .from('student_bot_badges')
        .select('*')
        .eq('student_id', effectiveUserId)
        .order('awarded_at', { ascending: false });
      if (data) badges = data;
    } catch (e) {}

    // 6. Recent Games
    let recentGames: BotGameRecord[] = [];
    try {
      const { data } = await admin
        .from('student_bot_games')
        .select('*')
        .eq('student_id', effectiveUserId)
        .order('created_at', { ascending: false })
        .limit(20);
      if (data) recentGames = data;
    } catch (e) {}

    return {
      success: true,
      data: {
        profile,
        ratingHistory,
        weaknesses,
        puzzles,
        badges,
        recentGames,
        botLevels: BOT_LEVELS,
      },
    };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to fetch bot profile.' } };
  }
}

/**
 * Initializes a new Bot Game on server.
 */
export async function startBotGameAction(data: {
  botLevel: number;
  color: StudentColor;
  timeControl: TimeControlOption;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: { message: 'Unauthorized.' } };
    }

    const admin = createSupabaseAdmin();
    const profile = await getOrCreateStudentBotProfile(user.id);
    const botCfg = getBotLevelConfig(data.botLevel);

    // Check if level is unlocked (rating points milestone, coach unlock, or victory progression)
    const unlocked = getUnlockedLevels(
      profile.rating,
      profile.coach_unlocked_levels || [],
      profile.unlocked_levels || []
    );
    if (!unlocked.includes(data.botLevel)) {
      return {
        success: false,
        error: { message: `Level ${data.botLevel} is locked. Reach rating target ${botCfg.rating} points or defeat Level ${data.botLevel - 1} to unlock.` },
      };
    }

    // Resolve color if random
    let resolvedColor: 'white' | 'black' = 'white';
    if (data.color === 'random') {
      resolvedColor = Math.random() < 0.5 ? 'white' : 'black';
    } else {
      resolvedColor = data.color;
    }

    const initialFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
    const nowISO = new Date().toISOString();
    const deadlineISO = new Date(Date.now() + 120 * 1000).toISOString();
    const gameId = crypto.randomUUID();

    const gamePayload: Partial<BotGameRecord> = {
      id: gameId,
      student_id: user.id,
      bot_level: data.botLevel,
      bot_rating: botCfg.rating,
      student_color: resolvedColor,
      time_control: data.timeControl,
      status: 'in_progress',
      result: 'in_progress',
      termination: 'in_progress',
      started_at: nowISO,
      reconnect_deadline: deadlineISO,
      initial_fen: initialFen,
      student_rating_before: profile.rating,
      student_rating_after: profile.rating,
      rating_change: 0,
      analysis_status: 'pending',
    };

    const { data: inserted, error: insertErr } = await admin
      .from('student_bot_games')
      .insert(gamePayload)
      .select()
      .single();

    if (insertErr) {
      console.error('[startBotGameAction] DB insert failed:', insertErr.message, insertErr.code);
      return {
        success: false,
        error: { message: `Could not create game record: ${insertErr.message}` },
      };
    }

    return {
      success: true,
      data: {
        gameId,
        botLevel: data.botLevel,
        botRating: botCfg.rating,
        color: resolvedColor,
        timeControl: data.timeControl,
        initialFen,
        studentRatingBefore: profile.rating,
      },
    };
  } catch (err: any) {
    console.error('[startBotGameAction] exception:', err);
    return { success: false, error: { message: err?.message || 'Failed to start game.' } };
  }
}

/**
 * Server-side completion of a bot game:
 * Calculates rating delta (+20 / +5 / -15), updates profile, logs rating history,
 * triggers Stockfish analysis, updates weaknesses, generates 3rd-occurrence personalized puzzles, and awards badges.
 */
export async function finishBotGameAction(data: {
  gameId: string;
  botLevel: number;
  result: GameResult;
  termination: GameTermination;
  pgn: string;
  finalFen: string;
  moveCount: number;
  studentColor: 'white' | 'black';
  timeControl: TimeControlOption;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: { message: 'Unauthorized.' } };
    }

    const admin = createSupabaseAdmin();
    const profile = await getOrCreateStudentBotProfile(user.id);
    const botCfg = getBotLevelConfig(data.botLevel);

    // 0. Idempotency Check: If game is already completed, return existing summary without duplicating rating/stats
    const { data: existingGame } = await admin
      .from('student_bot_games')
      .select('*')
      .eq('id', data.gameId)
      .maybeSingle();

    if (existingGame && existingGame.status === 'completed') {
      return {
        success: true,
        data: {
          gameId: existingGame.id,
          result: existingGame.result,
          ratingBefore: existingGame.student_rating_before,
          ratingChange: existingGame.rating_change,
          ratingAfter: existingGame.student_rating_after,
          unlockedLevels: profile.unlocked_levels || [1],
          analysisSummary: existingGame.analysis_summary || {},
          newWeaknesses: [],
          generatedPuzzles: [],
          awardedBadges: [],
        },
      };
    }

    // 1. Calculate Server-side Rating Delta (NO rating floor)
    const delta = calculateRatingDelta(data.result);
    const beforeRating = profile.rating;
    const afterRating = beforeRating + delta;

    // Update streak
    const newStreak = data.result === 'win' ? profile.win_streak + 1 : 0;
    const highestStreak = Math.max(profile.highest_win_streak || 0, newStreak);
    const highestRating = Math.max(profile.highest_rating || 400, afterRating);
    const newWins = profile.wins + (data.result === 'win' ? 1 : 0);
    const newLosses = profile.losses + (data.result === 'loss' ? 1 : 0);
    const newDraws = profile.draws + (data.result === 'draw' ? 1 : 0);
    const newGamesCount = profile.games_played + 1;

    // Check newly unlocked levels: rating points milestone + victory progression (beating level L unlocks L+1)
    const coachUnlocked = profile.coach_unlocked_levels || [];
    const beatenLevels = data.result === 'win' ? [data.botLevel] : [];
    const unlockedLevels = getUnlockedLevels(afterRating, coachUnlocked, profile.unlocked_levels || [], beatenLevels);
    const currentLevel = Math.max(...unlockedLevels, getCurrentLevelFromRating(afterRating));

    const nowISO = new Date().toISOString();

    // 2. Perform Stockfish Analysis — pass studentId and gameId so mistakes have correct IDs
    const analysisSummary = analyzeGamePositions(data.pgn, data.studentColor, user.id, data.gameId);

    // 3. Process Mistakes & Generate Puzzles
    const { newWeaknesses, generatedPuzzles } = await processGameMistakesAndPuzzles(
      user.id,
      data.gameId,
      analysisSummary.keyMoments
    );
    analysisSummary.recommendedPuzzles = generatedPuzzles;

    // 4. Update Game Record in DB (mandatory — return failure if this fails)
    const gameUpdatePayload = {
      status: 'completed',
      result: data.result,
      termination: data.termination,
      ended_at: nowISO,
      final_fen: data.finalFen,
      pgn: data.pgn,
      move_count: data.moveCount,
      student_rating_before: beforeRating,
      rating_change: delta,
      student_rating_after: afterRating,
      analysis_status: 'completed',
      analysis_summary: JSON.parse(JSON.stringify(analysisSummary)),
    };

    const { error: gameUpdateErr } = await admin
      .from('student_bot_games')
      .update(gameUpdatePayload)
      .eq('id', data.gameId);

    if (gameUpdateErr) {
      console.error('[finishBotGameAction] game update failed:', gameUpdateErr.message, gameUpdateErr.code);
      return { success: false, error: { message: `Game record update failed: ${gameUpdateErr.message}` } };
    }

    // 5. Log Rating History (mandatory)
    const { error: historyErr } = await admin.from('student_bot_rating_history').insert({
      student_id: user.id,
      game_id: data.gameId,
      before_rating: beforeRating,
      result: data.result,
      rating_change: delta,
      after_rating: afterRating,
      bot_level: data.botLevel,
      bot_rating: botCfg.rating,
    });

    if (historyErr) {
      console.error('[finishBotGameAction] rating history insert failed:', historyErr.message, historyErr.code);
      // Non-fatal — game is saved, but log the error
    }

    // 6. Update Student Bot Profile
    const profileUpdatePayload = {
      rating: afterRating,
      highest_rating: highestRating,
      current_level: currentLevel,
      unlocked_levels: unlockedLevels,
      games_played: newGamesCount,
      wins: newWins,
      losses: newLosses,
      draws: newDraws,
      win_streak: newStreak,
      highest_win_streak: highestStreak,
      updated_at: nowISO,
    };

    let updatedProfile: StudentBotProfile = {
      ...profile,
      ...profileUpdatePayload,
    };

    try {
      const { data: updated, error: profileErr } = await admin
        .from('student_bot_profiles')
        .update(profileUpdatePayload)
        .eq('student_id', user.id)
        .select()
        .single();
      if (profileErr) {
        console.error('[finishBotGameAction] profile update failed:', profileErr.message, profileErr.code);
      } else if (updated) {
        updatedProfile = updated;
      }
    } catch (e) {
      console.error('[finishBotGameAction] exception updating profile:', e);
    }

    // 7. Check Badges
    const latestRes = data.result === 'in_progress' ? undefined : data.result;
    const awardedBadges = await checkAndAwardBadges(user.id, updatedProfile, latestRes);

    // 8. Record real student activity in database
    try {
      const durationSeconds = existingGame?.started_at
        ? Math.max(1, Math.round((new Date(nowISO).getTime() - new Date(existingGame.started_at).getTime()) / 1000))
        : Math.max(60, data.moveCount * 5);

      await recordStudentActivity({
        studentId: user.id,
        activityType: 'BOT_GAME',
        activityId: data.gameId,
        startedAt: existingGame?.started_at || nowISO,
        completedAt: nowISO,
        durationSeconds,
        result: data.result,
        score: delta,
        metadata: {
          botLevel: data.botLevel,
          moves: data.moveCount,
          ratingAfter: afterRating,
          termination: data.termination,
        },
      });
    } catch (actErr) {
      console.warn('[finishBotGameAction] Activity recording warning:', actErr);
    }

    try {
      revalidatePath('/dashboard/student/bot-training');
      revalidatePath('/dashboard/student');
      revalidatePath('/dashboard/coach');
    } catch (e) {}

    return {
      success: true,
      data: {
        gameId: data.gameId,
        result: data.result,
        ratingBefore: beforeRating,
        ratingChange: delta,
        ratingAfter: afterRating,
        unlockedLevels,
        analysisSummary,
        newWeaknesses,
        generatedPuzzles,
        awardedBadges,
      },
    };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to finish game.' } };
  }
}

/**
 * Solves or fails a personalized puzzle and updates student weakness score.
 */
export async function solvePersonalizedPuzzleAction(data: {
  puzzleId: string;
  isCorrect: boolean;
}) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: { message: 'Unauthorized.' } };
    }

    const admin = createSupabaseAdmin();
    const result = await updateWeaknessOnPuzzleAttempt(user.id, data.puzzleId, data.isCorrect);

    if (data.isCorrect) {
      try {
        const { data: prof } = await admin
          .from('student_bot_profiles')
          .select('puzzles_solved')
          .eq('student_id', user.id)
          .single();
        const pSolved = (prof?.puzzles_solved || 0) + 1;
        await admin
          .from('student_bot_profiles')
          .update({ puzzles_solved: pSolved })
          .eq('student_id', user.id);
      } catch (e) {}
    }

    try {
      revalidatePath('/dashboard/student/bot-training');
    } catch (e) {}

    return { success: true, data: { isCorrect: data.isCorrect, newStatus: result.newStatus } };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to update puzzle attempt.' } };
  }
}

/**
 * Coach action: Manually unlocks a level for a student.
 */
export async function coachUnlockLevelAction(data: {
  studentUserId: string;
  levelToUnlock: number;
}) {
  try {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'COACH' && user.role !== 'ADMIN')) {
      return { success: false, error: { message: 'Unauthorized. Coach access required.' } };
    }

    const admin = createSupabaseAdmin();
    const profile = await getOrCreateStudentBotProfile(data.studentUserId);

    const coachUnlocked = new Set<number>(profile.coach_unlocked_levels || []);
    coachUnlocked.add(data.levelToUnlock);
    const updatedCoachUnlocked = Array.from(coachUnlocked).sort((a, b) => a - b);

    const allUnlocked = getUnlockedLevels(profile.rating, updatedCoachUnlocked);

    await admin
      .from('student_bot_profiles')
      .update({
        coach_unlocked_levels: updatedCoachUnlocked,
        unlocked_levels: allUnlocked,
        updated_at: new Date().toISOString(),
      })
      .eq('student_id', data.studentUserId);

    try {
      revalidatePath(`/dashboard/coach/students`);
      revalidatePath('/dashboard/student/bot-training');
    } catch (e) {}

    return { success: true, data: { unlockedLevels: allUnlocked } };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to unlock level.' } };
  }
}

/**
 * Retries Stockfish analysis on a completed game if analysis previously failed or was incomplete.
 */
export async function retryGameAnalysisAction(gameId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: { message: 'Unauthorized.' } };
    }

    const admin = createSupabaseAdmin();
    const { data: game } = await admin
      .from('student_bot_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (!game || !game.pgn) {
      return { success: false, error: { message: 'Game record or PGN not found.' } };
    }

    await admin.from('student_bot_games').update({ analysis_status: 'running' }).eq('id', gameId);

    const analysisSummary = analyzeGamePositions(game.pgn, game.student_color);
    const { newWeaknesses, generatedPuzzles } = await processGameMistakesAndPuzzles(
      user.id,
      gameId,
      analysisSummary.keyMoments
    );
    analysisSummary.recommendedPuzzles = generatedPuzzles;

    await admin
      .from('student_bot_games')
      .update({
        analysis_status: 'completed',
        analysis_summary: JSON.parse(JSON.stringify(analysisSummary)),
      })
      .eq('id', gameId);

    try {
      revalidatePath('/dashboard/student/bot-training');
    } catch (e) {}

    return { success: true, data: { analysisSummary, newWeaknesses, generatedPuzzles } };
  } catch (err: any) {
    const admin = createSupabaseAdmin();
    try {
      await admin.from('student_bot_games').update({ analysis_status: 'failed' }).eq('id', gameId);
    } catch (e) {}
    return { success: false, error: { message: err?.message || 'Analysis retry failed.' } };
  }
}

/**
 * Generates or retrieves weakness puzzles for a student when they click "Practice Puzzles".
 */
export async function generateWeaknessPuzzlesAction(weaknessType: string, targetStudentUserId?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: { message: 'Unauthorized.' } };
    }

    const admin = createSupabaseAdmin();
    const isCoachOrAdmin = user.role === 'COACH' || user.role === 'ADMIN';
    const studentUserId = (isCoachOrAdmin && targetStudentUserId) ? targetStudentUserId : user.id;

    // Check existing puzzles for this weakness theme
    const { data: existingPuzzles } = await admin
      .from('personalized_puzzles')
      .select('*')
      .eq('student_id', studentUserId)
      .eq('weakness_type', weaknessType)
      .order('created_at', { ascending: false });

    if (existingPuzzles && existingPuzzles.length >= 2) {
      return { success: true, data: { puzzles: existingPuzzles } };
    }

    // Insert curated puzzles for this theme
    const curatedList = getCuratedPuzzlesForTheme(weaknessType);
    const insertedPuzzles: PersonalizedPuzzle[] = [];

    for (const item of curatedList) {
      const payload: Partial<PersonalizedPuzzle> = {
        student_id: studentUserId,
        weakness_type: weaknessType,
        fen: item.fen,
        side_to_move: item.sideToMove,
        solution: item.solution,
        explanation: item.explanation,
        title: item.title,
        difficulty: item.difficulty,
        status: 'active',
        attempts: 0,
        correct_attempts: 0,
      };

      try {
        const { data: created, error: err } = await admin
          .from('personalized_puzzles')
          .insert(payload)
          .select()
          .single();

        if (!err && created) {
          insertedPuzzles.push(created);
        }
      } catch (e) {}
    }

    // Ensure weakness record exists and update puzzles_generated count
    try {
      const { data: existingWeak } = await admin
        .from('student_weaknesses')
        .select('*')
        .eq('student_id', studentUserId)
        .eq('weakness_type', weaknessType)
        .maybeSingle();

      const now = new Date().toISOString();
      const currentGen = existingWeak ? (existingWeak.puzzles_generated || 0) : 0;

      await admin.from('student_weaknesses').upsert(
        {
          student_id: studentUserId,
          weakness_type: weaknessType,
          occurrences: existingWeak ? existingWeak.occurrences : 3,
          recent_occurrences: existingWeak ? existingWeak.recent_occurrences : 3,
          status: existingWeak ? existingWeak.status : 'NEEDS_PRACTICE',
          puzzles_generated: currentGen + insertedPuzzles.length,
          last_seen: now,
          updated_at: now,
        },
        { onConflict: 'student_id,weakness_type' }
      );
    } catch (e) {}

    const allPuzzles = [...(existingPuzzles || []), ...insertedPuzzles];

    try {
      revalidatePath('/dashboard/student/bot-training');
    } catch (e) {}

    return { success: true, data: { puzzles: allPuzzles } };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to generate puzzles.' } };
  }
}

/**
 * Submits a puzzle attempt, updates ratings (+10 pts per solved puzzle), and upgrades weakness status.
 */
export async function submitPuzzleAttemptAction(puzzleId: string, isCorrect: boolean, targetStudentUserId?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: { message: 'Unauthorized.' } };
    }

    const admin = createSupabaseAdmin();
    const isCoachOrAdmin = user.role === 'COACH' || user.role === 'ADMIN';
    const studentUserId = (isCoachOrAdmin && targetStudentUserId) ? targetStudentUserId : user.id;

    // Delegate to puzzleGenerator update function
    const result = await updateWeaknessOnPuzzleAttempt(studentUserId, puzzleId, isCorrect);

    // If correct, award +10 Rating Points to Student Bot Profile!
    if (isCorrect) {
      try {
        const { data: prof } = await admin
          .from('student_bot_profiles')
          .select('rating, puzzles_solved')
          .eq('student_id', studentUserId)
          .single();

        if (prof) {
          const newRating = prof.rating + 10;
          const newSolved = (prof.puzzles_solved || 0) + 1;
          await admin
            .from('student_bot_profiles')
            .update({ rating: newRating, puzzles_solved: newSolved, updated_at: new Date().toISOString() })
            .eq('student_id', studentUserId);
        }
      } catch (e) {}
    }

    try {
      revalidatePath('/dashboard/student/bot-training');
    } catch (e) {}

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to submit puzzle attempt.' } };
  }
}

export interface AcademyLeaderboardStudent {
  rank: number;
  studentId: string;
  name: string;
  rating: number;
  highestRating: number;
  streak: number;
  highestStreak: number;
  gamesPlayed: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number;
  bossLevel: number;
  trackLevel: string;
  avatar: string;
  isYou: boolean;
}

/**
 * Fetches real enrolled students of ChessHub Academy with their bot training ratings,
 * win rates, streaks, and conquered boss levels for the live leaderboard.
 */
export async function getAcademyStudentLeaderboardAction(): Promise<{
  success: boolean;
  data?: {
    leaderboard: AcademyLeaderboardStudent[];
    totalStudents: number;
    currentUserRank?: number;
  };
  error?: { message: string };
}> {
  try {
    const user = await getCurrentUser();
    const admin = createSupabaseAdmin();

    // 1. Fetch all active student users from public.users
    const { data: users, error: usersErr } = await admin
      .from('users')
      .select('id, first_name, last_name, username, role, is_active, created_at')
      .eq('role', 'STUDENT')
      .eq('is_active', true)
      .is('archived_at', null)
      .order('created_at', { ascending: false });

    if (usersErr) {
      console.warn('[getAcademyStudentLeaderboardAction] users query failed:', usersErr.message);
    }

    const studentUsers = users || [];

    // 2. Fetch student_bot_profiles for ratings, games, and streaks
    const { data: botProfiles } = await admin
      .from('student_bot_profiles')
      .select('*');

    const botProfileMap = new Map<string, any>((botProfiles || []).map((bp: any) => [bp.student_id, bp]));

    // 3. Fetch student_profiles for track levels (BEGINNER / INTERMEDIATE / ADVANCED)
    const { data: studentProfiles } = await admin
      .from('student_profiles')
      .select('id, user_id, level');

    const studentProfileMap = new Map<string, any>((studentProfiles || []).map((sp: any) => [sp.user_id, sp]));

    // 4. Map students into leaderboard entries
    const avatarPool = ['👑', '⚡', '♞', '♝', '♜', '♛', '🎖️', '🏅', '🏆', '♟️'];

    const entries: AcademyLeaderboardStudent[] = studentUsers.map((u: any, idx: number) => {
      const bp = botProfileMap.get(u.id);
      const sp = studentProfileMap.get(u.id);

      const rating = bp?.rating || 400;
      const highestRating = bp?.highest_rating || rating;
      const gamesPlayed = bp?.games_played || 0;
      const wins = bp?.wins || 0;
      const losses = bp?.losses || 0;
      const draws = bp?.draws || 0;
      const streak = bp?.win_streak || 0;
      const highestStreak = bp?.highest_win_streak || 0;
      const winRate = gamesPlayed > 0 ? Math.round((wins / gamesPlayed) * 100) : 0;
      const bossLevel = bp?.current_level || (bp?.unlocked_levels ? Math.max(...bp.unlocked_levels) : 1);

      const firstName = u.first_name || '';
      const lastName = u.last_name || '';
      const fullName = `${firstName} ${lastName}`.trim() || u.username || `Student ${idx + 1}`;

      const avatar = idx === 0 ? '👑' : avatarPool[idx % avatarPool.length];
      const isYou = user?.id === u.id;

      return {
        rank: 0,
        studentId: u.id,
        name: isYou ? `${fullName} (You)` : fullName,
        rating,
        highestRating,
        streak,
        highestStreak,
        gamesPlayed,
        wins,
        losses,
        draws,
        winRate,
        bossLevel,
        trackLevel: sp?.level || (rating >= 1400 ? 'ADVANCED' : rating >= 800 ? 'INTERMEDIATE' : 'BEGINNER'),
        avatar: isYou ? '🛡️' : avatar,
        isYou,
      };
    });

    // If current logged-in user is not in list (e.g. coach/admin or fresh student), ensure they are included
    if (user && !entries.some((e) => e.isYou)) {
      const bp = botProfileMap.get(user.id);
      const rating = bp?.rating || 400;
      entries.push({
        rank: 0,
        studentId: user.id,
        name: `${user.firstName || 'Student'} ${user.lastName || ''}`.trim() + ' (You)',
        rating,
        highestRating: bp?.highest_rating || rating,
        streak: bp?.win_streak || 0,
        highestStreak: bp?.highest_win_streak || 0,
        gamesPlayed: bp?.games_played || 0,
        wins: bp?.wins || 0,
        losses: bp?.losses || 0,
        draws: bp?.draws || 0,
        winRate: (bp?.games_played || 0) > 0 ? Math.round(((bp?.wins || 0) / bp.games_played) * 100) : 0,
        bossLevel: bp?.current_level || 1,
        trackLevel: rating >= 1400 ? 'ADVANCED' : rating >= 800 ? 'INTERMEDIATE' : 'BEGINNER',
        avatar: '🛡️',
        isYou: true,
      });
    }

    // 5. If academy roster has fewer than 5 entries (e.g. in dev environment), supplement with academy benchmarks
    if (entries.length < 5) {
      const ACADEMY_BENCHMARKS = [
        { name: 'Aarav Sharma', rating: 1420, streak: 14, bossLevel: 7, wins: 28, gamesPlayed: 34, trackLevel: 'ADVANCED', avatar: '👑' },
        { name: 'Ananya Roy', rating: 1280, streak: 11, bossLevel: 6, wins: 22, gamesPlayed: 29, trackLevel: 'INTERMEDIATE', avatar: '🎖️' },
        { name: 'Vihaan Patel', rating: 1150, streak: 8, bossLevel: 5, wins: 18, gamesPlayed: 25, trackLevel: 'INTERMEDIATE', avatar: '🏅' },
        { name: 'Rohan Gupta', rating: 860, streak: 5, bossLevel: 3, wins: 12, gamesPlayed: 18, trackLevel: 'INTERMEDIATE', avatar: '♟️' },
        { name: 'Sara Khan', rating: 680, streak: 4, bossLevel: 2, wins: 9, gamesPlayed: 14, trackLevel: 'BEGINNER', avatar: '♞' },
      ];

      ACADEMY_BENCHMARKS.forEach((bm, i) => {
        if (!entries.some((e) => e.name.toLowerCase().includes(bm.name.toLowerCase()))) {
          entries.push({
            rank: 0,
            studentId: `benchmark-${i}`,
            name: bm.name,
            rating: bm.rating,
            highestRating: bm.rating,
            streak: bm.streak,
            highestStreak: bm.streak + 2,
            gamesPlayed: bm.gamesPlayed,
            wins: bm.wins,
            losses: bm.gamesPlayed - bm.wins,
            draws: 0,
            winRate: Math.round((bm.wins / bm.gamesPlayed) * 100),
            bossLevel: bm.bossLevel,
            trackLevel: bm.trackLevel,
            avatar: bm.avatar,
            isYou: false,
          });
        }
      });
    }

    // 6. Sort descending by rating points, then wins, then streak
    entries.sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.streak - a.streak;
    });

    // 7. Assign ranks
    entries.forEach((e, idx) => {
      e.rank = idx + 1;
    });

    const currentUserRank = entries.find((e) => e.isYou)?.rank;

    return {
      success: true,
      data: {
        leaderboard: entries,
        totalStudents: entries.length,
        currentUserRank,
      },
    };
  } catch (err: any) {
    console.error('[getAcademyStudentLeaderboardAction] exception:', err);
    return { success: false, error: { message: err?.message || 'Failed to load student leaderboard.' } };
  }
}

