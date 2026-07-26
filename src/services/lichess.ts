export interface LichessProfile {
  username: string;
  perfs: {
    blitz?: { rating: number };
    bullet?: { rating: number };
    classical?: { rating: number };
    puzzle?: { rating: number };
  };
}

/**
 * Fetch rating data directly from Lichess public API endpoints.
 */
export async function fetchLichessProfile(username: string): Promise<LichessProfile | null> {
  if (!username) return null;

  try {
    const response = await fetch(`https://lichess.org/api/user/${encodeURIComponent(username)}`, {
      headers: {
        Accept: 'application/json',
      },
      next: { revalidate: 3600 }, // Cache response for 1 hour
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`Lichess handle not found: ${username}`);
      }
      return null;
    }

    const data = await response.json();
    return {
      username: data.id,
      perfs: {
        blitz: data.perfs?.blitz ? { rating: data.perfs.blitz.rating } : undefined,
        bullet: data.perfs?.bullet ? { rating: data.perfs.bullet.rating } : undefined,
        classical: data.perfs?.classical ? { rating: data.perfs.classical.rating } : undefined,
        puzzle: data.perfs?.puzzle ? { rating: data.perfs.puzzle.rating } : undefined,
      },
    };
  } catch (error) {
    console.error('Error fetching data from Lichess API:', error);
    return null;
  }
}
