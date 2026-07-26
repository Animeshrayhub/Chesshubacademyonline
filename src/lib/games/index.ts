import { createSupabaseAdmin } from '../supabase/admin';
import {
  BaseError,
  DatabaseError,
  InternalServerError,
  type Result,
} from '../errors';

export interface SavedGame {
  id: string;
  student_id: string;
  title: string;
  pgn: string | null;
  lichess_url: string | null;
  created_at: string;
}

/**
 * Saves a chess game for a student.
 */
export async function saveSavedGame(
  studentProfileId: string,
  title: string,
  pgn: string | null,
  lichessUrl: string | null
): Promise<Result<SavedGame>> {
  try {
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('saved_games')
      .insert({
        student_id: studentProfileId,
        title: title || 'Saved Game Analysis',
        pgn: pgn || null,
        lichess_url: lichessUrl || null,
      })
      .select('*')
      .single();

    if (error || !data) {
      return {
        success: false,
        error: new DatabaseError('Failed to save game', error),
      };
    }

    return { success: true, data: data as SavedGame };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(
        error instanceof Error ? error.message : 'Unknown error'
      ),
    };
  }
}

/**
 * Returns list of saved games for a student.
 */
export async function getStudentSavedGames(
  studentProfileId: string
): Promise<Result<SavedGame[]>> {
  try {
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('saved_games')
      .select('*')
      .eq('student_id', studentProfileId)
      .order('created_at', { ascending: false });

    if (error) {
      return {
        success: false,
        error: new DatabaseError('Failed to list saved games', error),
      };
    }

    return { success: true, data: (data ?? []) as SavedGame[] };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(
        error instanceof Error ? error.message : 'Unknown error'
      ),
    };
  }
}

/**
 * Fetches single saved game details.
 */
export async function getSavedGameDetails(
  gameId: string
): Promise<Result<SavedGame>> {
  try {
    const admin = createSupabaseAdmin();

    const { data, error } = await admin
      .from('saved_games')
      .select('*')
      .eq('id', gameId)
      .single();

    if (error || !data) {
      return {
        success: false,
        error: new DatabaseError('Failed to fetch game details', error),
      };
    }

    return { success: true, data: data as SavedGame };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(
        error instanceof Error ? error.message : 'Unknown error'
      ),
    };
  }
}

/**
 * Deletes a saved game.
 */
export async function deleteSavedGame(
  gameId: string,
  studentProfileId: string
): Promise<Result<void>> {
  try {
    const admin = createSupabaseAdmin();

    const { error } = await admin
      .from('saved_games')
      .delete()
      .eq('id', gameId)
      .eq('student_id', studentProfileId);

    if (error) {
      return {
        success: false,
        error: new DatabaseError('Failed to delete saved game', error),
      };
    }

    return { success: true, data: undefined };
  } catch (error) {
    if (error instanceof BaseError) return { success: false, error };
    return {
      success: false,
      error: new InternalServerError(
        error instanceof Error ? error.message : 'Unknown error'
      ),
    };
  }
}
