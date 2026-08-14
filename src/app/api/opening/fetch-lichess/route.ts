import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/supabase/auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/opening/fetch-lichess
 * Fetches recent games for a Lichess username via public Lichess API
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await request.json();
    const { username, maxGames = 5 } = body;

    if (!username || typeof username !== 'string' || !username.trim()) {
      return NextResponse.json({ error: 'Please enter a valid Lichess username' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const lichessUrl = `https://lichess.org/api/games/user/${cleanUsername}?max=${maxGames}&opening=true`;

    const res = await fetch(lichessUrl, {
      headers: { Accept: 'application/x-ndjson' },
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ error: `Lichess user "${username}" not found.` }, { status: 404 });
      }
      return NextResponse.json({ error: 'Failed to fetch games from Lichess API.' }, { status: res.status });
    }

    const text = await res.text();
    // Parse NDJSON lines from Lichess
    const games = text
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => {
        try { return JSON.parse(line); } catch { return null; }
      })
      .filter(Boolean);

    return NextResponse.json({
      username: cleanUsername,
      count: games.length,
      games: games.map((g: any) => ({
        id: g.id,
        rated: g.rated,
        speed: g.speed,
        moves: g.moves,
        pgn: g.pgn || `[Event "Lichess Game ${g.id}"]\n[Site "https://lichess.org/${g.id}"]\n\n${g.moves} *`,
        opening: g.opening ? { code: g.opening.code, name: g.opening.name } : null,
        players: g.players,
      })),
    });
  } catch (err) {
    console.error('[POST /api/opening/fetch-lichess]', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
