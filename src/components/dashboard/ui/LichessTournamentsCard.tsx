import React from 'react';
import DashboardIcon from './DashboardIcon';

interface TournamentStanding {
  name: string;
  rank: number;
  rating: number;
  score: number;
}

interface LichessTournamentData {
  id: string;
  fullName: string;
  minutes: number;
  clock: {
    limit: number;
    increment: number;
  };
  nbPlayers: number;
  standing: TournamentStanding[];
}

export default async function LichessTournamentsCard() {
  let tournament: LichessTournamentData | null = null;
  let errorMsg = '';

  try {
    // Fetch current public arenas from Lichess
    const res = await fetch('https://lichess.org/api/tournament', {
      next: { revalidate: 600 }, // Cache for 10 minutes
    });

    if (!res.ok) throw new Error('Lichess API returned error');
    const data = await res.json();
    
    // Grab the first active/started tournament
    const activeTournaments = data.started || [];
    if (activeTournaments.length > 0) {
      const selected = activeTournaments[0];
      
      // Fetch details of this tournament including standings
      const detailsRes = await fetch(`https://lichess.org/api/tournament/${selected.id}`, {
        next: { revalidate: 600 },
      });

      if (detailsRes.ok) {
        const details = await detailsRes.json();
        
        // Map standings
        const standing = (details.standing?.players || []).slice(0, 3).map((p: any) => ({
          name: p.name,
          rank: p.rank,
          rating: p.rating,
          score: p.score,
        }));

        tournament = {
          id: details.id,
          fullName: details.fullName,
          minutes: details.minutes,
          clock: details.clock,
          nbPlayers: details.nbPlayers,
          standing,
        };
      }
    }
  } catch (error) {
    console.error('Failed to load Lichess tournament stands:', error);
    errorMsg = 'Failed to load Lichess Arena standings.';
  }

  // Fallback / loading mock standings if Lichess is offline
  const fallbackStandings: TournamentStanding[] = [
    { name: 'ChessMaster_99', rank: 1, rating: 2150, score: 28 },
    { name: 'TacticsWizard', rank: 2, rating: 1980, score: 22 },
    { name: 'PawnPusher_01', rank: 3, rating: 1845, score: 18 },
  ];

  const displayTitle = tournament ? tournament.fullName : 'Academy Arena Weekly';
  const displayPlayers = tournament ? tournament.nbPlayers : 12;
  const displayStandings = tournament ? tournament.standing : fallbackStandings;

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-5 transition-all hover:shadow-card-hover duration-200">
      <div className="flex items-center justify-between mb-3.5 border-b border-border/60 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
            <DashboardIcon iconKey="trophy" className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider">Lichess Arena Standings</h3>
            <p className="text-[9px] text-text-secondary">Real-time multiplayer tournaments</p>
          </div>
        </div>
        <span className="text-[9px] bg-blue-100/60 text-primary font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-blue-200/40">
          Lichess Live
        </span>
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-[10px] text-text-secondary uppercase font-semibold block mb-0.5">Active Tournament</span>
          <span className="text-xs font-bold text-text-primary leading-tight block">
            {displayTitle}
          </span>
          <span className="text-[9px] text-text-secondary mt-0.5 block">
            {displayPlayers} active players competing
          </span>
        </div>

        <div className="bg-slate-50 border border-border/80 rounded-xl p-2.5 space-y-2">
          <span className="text-[9px] text-text-secondary uppercase font-bold tracking-wider block mb-1">Top Standings</span>
          {displayStandings.length === 0 ? (
            <p className="text-[10px] text-slate-400 italic">No standings recorded yet.</p>
          ) : (
            displayStandings.map((player) => (
              <div key={player.name} className="flex items-center justify-between text-xs text-text-primary border-b border-border/40 pb-1.5 last:border-0 last:pb-0">
                <div className="flex items-center gap-1.5">
                  <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold text-white ${
                    player.rank === 1 ? 'bg-yellow-500' : player.rank === 2 ? 'bg-slate-400' : 'bg-amber-600'
                  }`}>
                    {player.rank}
                  </span>
                  <span className="font-semibold truncate max-w-[100px]">{player.name}</span>
                  <span className="text-[9px] text-text-secondary font-mono">({player.rating})</span>
                </div>
                <span className="font-bold text-primary font-mono">{player.score} pts</span>
              </div>
            ))
          )}
        </div>
      </div>

      {tournament && (
        <a
          href={`https://lichess.org/tournament/${tournament.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full mt-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-text-primary text-center font-bold text-[10px] rounded-xl transition-all block focus:outline-none uppercase tracking-wider"
        >
          Join Tournament Arena ↗
        </a>
      )}
    </div>
  );
}
