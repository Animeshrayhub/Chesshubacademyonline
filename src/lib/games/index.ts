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

function parseGamesFromNotes(notesText: string | null | undefined): SavedGame[] {
  if (!notesText) return [];
  try {
    if (notesText.includes('__SAVED_GAMES__=')) {
      const jsonStr = notesText.split('__SAVED_GAMES__=')[1]?.split('__END_SAVED_GAMES__')[0];
      if (jsonStr) return JSON.parse(jsonStr);
    }
  } catch (e) {
    console.error('Error parsing saved games from notes:', e);
  }
  return [];
}

function serializeGamesToNotes(notesText: string | null | undefined, games: SavedGame[]): string {
  const cleanNotes = (notesText || '').replace(/__SAVED_GAMES__=[\s\S]*?__END_SAVED_GAMES__/, '').trim();
  const jsonStr = JSON.stringify(games);
  const block = `__SAVED_GAMES__=${jsonStr}__END_SAVED_GAMES__`;
  return cleanNotes ? `${cleanNotes}\n\n${block}` : block;
}

/**
 * Saves a chess game for a student (with automatic DB fallback).
 */
export async function saveSavedGame(
  studentProfileId: string,
  title: string,
  pgn: string | null,
  lichessUrl: string | null
): Promise<Result<SavedGame>> {
  try {
    const admin = createSupabaseAdmin();

    const newGame: SavedGame = {
      id: crypto.randomUUID(),
      student_id: studentProfileId,
      title: title || 'Saved Game Analysis',
      pgn: pgn || null,
      lichess_url: lichessUrl || null,
      created_at: new Date().toISOString(),
    };

    // Try primary table first
    const { data, error } = await admin
      .from('saved_games')
      .insert({
        student_id: studentProfileId,
        title: newGame.title,
        pgn: newGame.pgn,
        lichess_url: newGame.lichess_url,
      })
      .select('*')
      .single();

    if (!error && data) {
      return { success: true, data: data as SavedGame };
    }

    // Fallback: Store in student_profiles.notes if table does not exist
    const { data: profile } = await admin
      .from('student_profiles')
      .select('notes')
      .eq('id', studentProfileId)
      .maybeSingle();

    const existingGames = parseGamesFromNotes(profile?.notes);
    const updatedGames = [newGame, ...existingGames];
    const newNotes = serializeGamesToNotes(profile?.notes, updatedGames);

    await admin
      .from('student_profiles')
      .update({ notes: newNotes, updated_at: new Date().toISOString() })
      .eq('id', studentProfileId);

    return { success: true, data: newGame };
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

    if (!error && data) {
      return { success: true, data: data as SavedGame[] };
    }

    // Fallback: Read from student_profiles.notes
    const { data: profile } = await admin
      .from('student_profiles')
      .select('notes')
      .eq('id', studentProfileId)
      .maybeSingle();

    const fallbackGames = parseGamesFromNotes(profile?.notes);
    return { success: true, data: fallbackGames };
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

    if (!error && data) {
      return { success: true, data: data as SavedGame };
    }

    // Search across profiles if table missing
    const { data: profiles } = await admin
      .from('student_profiles')
      .select('notes');

    if (profiles) {
      for (const p of profiles) {
        const games = parseGamesFromNotes(p.notes);
        const match = games.find((g) => g.id === gameId);
        if (match) return { success: true, data: match };
      }
    }

    return {
      success: false,
      error: new DatabaseError('Saved game not found', null),
    };
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

    if (!error) {
      return { success: true, data: undefined };
    }

    // Fallback: Delete from student_profiles.notes
    const { data: profile } = await admin
      .from('student_profiles')
      .select('notes')
      .eq('id', studentProfileId)
      .maybeSingle();

    const existingGames = parseGamesFromNotes(profile?.notes);
    const updatedGames = existingGames.filter((g) => g.id !== gameId);
    const newNotes = serializeGamesToNotes(profile?.notes, updatedGames);

    await admin
      .from('student_profiles')
      .update({ notes: newNotes, updated_at: new Date().toISOString() })
      .eq('id', studentProfileId);

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
