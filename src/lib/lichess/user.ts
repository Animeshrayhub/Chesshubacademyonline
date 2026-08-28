export interface LichessUserProfile {
  id: string;
  username: string;
  url: string;
  perfs?: {
    blitz?: { rating: number; games: number };
    rapid?: { rating: number; games: number };
    classical?: { rating: number; games: number };
    puzzle?: { rating: number; games: number };
  };
}

/**
 * Fetches student Lichess profile ratings and user stats.
 */
export async function fetchLichessUserProfile(username: string): Promise<LichessUserProfile | null> {
  if (!username) return null;
  try {
    const cleanUser = username.trim().replace(/^@/, '');
    const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(cleanUser)}`, {
      headers: {
        Accept: 'application/json',
        ...(process.env.LICHESS_API_TOKEN
          ? { Authorization: `Bearer ${process.env.LICHESS_API_TOKEN}` }
          : {}),
      },
    });

    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/**
 * Fetches recent games for a Lichess user for 1-click import into Coach analysis.
 */
export async function fetchLichessUserGames(username: string, limit = 5): Promise<string[]> {
  if (!username) return [];
  try {
    const cleanUser = username.trim().replace(/^@/, '');
    const res = await fetch(
      `https://lichess.org/api/games/user/${encodeURIComponent(cleanUser)}?max=${limit}&opening=true`,
      {
        headers: {
          Accept: 'application/x-ndjson',
          ...(process.env.LICHESS_API_TOKEN
            ? { Authorization: `Bearer ${process.env.LICHESS_API_TOKEN}` }
            : {}),
        },
      }
    );

    if (!res.ok) return [];
    const text = await res.text();
    return text.split('\n').filter(Boolean);
  } catch {
    return [];
  }
}
