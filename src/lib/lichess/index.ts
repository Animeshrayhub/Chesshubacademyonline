import { BaseError, DatabaseError, ValidationError, type Result } from '../errors';

export interface LichessData {
  username: string;
  ratings: {
    blitz: number;
    rapid: number;
    classical: number;
    bullet: number;
    puzzle: number;
  };
  gamesCount: number;
}

/**
 * Fetches profile ratings and metadata from the official Lichess API.
 */
export async function fetchLichessProfile(username: string): Promise<Result<LichessData>> {
  try {
    const response = await fetch(`https://lichess.org/api/user/${username}`, {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 3600 }, // Cache in Next.js for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: new ValidationError(`Lichess user "${username}" not found.`) };
      }
      return { success: false, error: new DatabaseError(`Lichess API returned status: ${response.status}`) };
    }

    const data = await response.json();
    
    const ratings = {
      blitz: data.perfs?.blitz?.rating ?? 1500,
      rapid: data.perfs?.rapid?.rating ?? 1500,
      classical: data.perfs?.classical?.rating ?? 1500,
      bullet: data.perfs?.bullet?.rating ?? 1500,
      puzzle: data.perfs?.puzzle?.rating ?? 1500,
    };

    return {
      success: true,
      data: {
        username: data.username || username,
        ratings,
        gamesCount: data.count?.all ?? 0,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: new DatabaseError(error instanceof Error ? error.message : 'Failed to reach Lichess API'),
    };
  }
}

export interface LichessDailyPuzzle {
  id: string;
  fen: string;
  solution: string[];
  rating: number;
  title?: string;
}

/**
 * Fetches the daily puzzle from the public Lichess API.
 */
export async function fetchDailyPuzzle(): Promise<Result<LichessDailyPuzzle>> {
  try {
    const response = await fetch('https://lichess.org/api/puzzle/daily', {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 3600 }, // Cache in Next.js for 1 hour
    });

    if (!response.ok) {
      return { success: false, error: new DatabaseError(`Lichess Daily Puzzle API returned status: ${response.status}`) };
    }

    const data = await response.json();
    return {
      success: true,
      data: {
        id: data.puzzle?.id || '',
        fen: data.puzzle?.fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
        solution: data.puzzle?.solution || [],
        rating: data.puzzle?.rating || 1500,
        title: data.game?.perf?.name || 'Daily Puzzle',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: new DatabaseError(error instanceof Error ? error.message : 'Failed to fetch Lichess daily puzzle'),
    };
  }
}
