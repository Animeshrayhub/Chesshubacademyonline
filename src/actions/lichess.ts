'use server';

import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { fetchLichessDailyPuzzle, fetchLichessPuzzleById } from '@/lib/puzzles/lichess';
import { fetchLichessCloudEval } from '@/lib/lichess/cloudEval';
import { fetchLichessUserProfile, fetchLichessUserGames } from '@/lib/lichess/user';

/**
 * Server action to fetch official Lichess Daily Puzzle.
 */
export async function getLichessDailyPuzzleAction() {
  try {
    const puzzle = await fetchLichessDailyPuzzle();
    return { success: true, data: puzzle };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to fetch Lichess daily puzzle.' } };
  }
}

/**
 * Server action to fetch Stockfish 16 cloud evaluation from Lichess Cloud Eval API.
 */
export async function getLichessCloudEvalAction(fen: string) {
  try {
    const res = await fetchLichessCloudEval(fen);
    return res;
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch cloud eval.' };
  }
}

/**
 * Server action to link student Lichess username and fetch ratings.
 */
export async function linkLichessAccountAction(username: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: { message: 'Unauthorized.' } };

    const lichessProfile = await fetchLichessUserProfile(username);
    if (!lichessProfile) {
      return { success: false, error: { message: `Lichess user "@${username}" not found.` } };
    }

    const admin = createSupabaseAdmin();
    await admin.from('users').update({
      lichess_username: lichessProfile.username,
      updated_at: new Date().toISOString(),
    }).eq('id', user.id);

    return {
      success: true,
      data: {
        profile: lichessProfile,
        blitzRating: lichessProfile.perfs?.blitz?.rating,
        rapidRating: lichessProfile.perfs?.rapid?.rating,
        puzzleRating: lichessProfile.perfs?.puzzle?.rating,
      },
    };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to link Lichess account.' } };
  }
}

/**
 * Server action to import student recent Lichess games for Coach Analysis.
 */
export async function importLichessGamesAction(username: string) {
  try {
    const games = await fetchLichessUserGames(username, 5);
    return { success: true, data: { gamesCount: games.length, games } };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to import games.' } };
  }
}

/**
 * Server action to sync student Lichess rating and puzzle stats.
 */
export async function syncStudentLichessAction(studentId: string, username: string) {
  try {
    const lichessProfile = await fetchLichessUserProfile(username);
    if (!lichessProfile) {
      return { success: false, error: { message: `Could not fetch Lichess user "@${username}".` } };
    }

    const admin = createSupabaseAdmin();
    await admin.from('users').update({
      lichess_username: lichessProfile.username,
      updated_at: new Date().toISOString(),
    }).eq('id', studentId);

    return {
      success: true,
      data: {
        profile: lichessProfile,
        blitzRating: lichessProfile.perfs?.blitz?.rating,
        rapidRating: lichessProfile.perfs?.rapid?.rating,
        puzzleRating: lichessProfile.perfs?.puzzle?.rating,
      },
    };
  } catch (err: any) {
    return { success: false, error: { message: err?.message || 'Failed to sync Lichess profile.' } };
  }
}
