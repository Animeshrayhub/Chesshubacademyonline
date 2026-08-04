'use client';

import React, { useState, useEffect } from 'react';
import {
  searchMasterGames,
  fetchOpeningTree,
  MasterGame,
  MasterMove,
} from '@/services/openingTreeService';

interface ClassroomDatabasePanelProps {
  currentFen?: string;
  onLoadPgn?: (pgn: string, title?: string) => void;
  onLoadFen?: (fen: string, title?: string) => void;
  className?: string;
}

export default function ClassroomDatabasePanel({
  currentFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
  onLoadPgn,
  onLoadFen,
  className = '',
}: ClassroomDatabasePanelProps) {
  const [activeTab, setActiveTab] = useState<'games' | 'opening_tree' | 'studies'>('games');
  const [query, setQuery] = useState('');
  const [games, setGames] = useState<MasterGame[]>([]);
  const [moves, setMoves] = useState<MasterMove[]>([]);
  const [loading, setLoading] = useState(false);

  // Load master games
  useEffect(() => {
    const loadGames = async () => {
      setLoading(true);
      const results = await searchMasterGames(query);
      setGames(results);
      setLoading(false);
    };
    loadGames();
  }, [query]);

  // Load opening tree when FEN changes or tab opens
  useEffect(() => {
    if (activeTab === 'opening_tree' && currentFen) {
      const loadTree = async () => {
        setLoading(true);
        const data = await fetchOpeningTree(currentFen);
        setMoves(data);
        setLoading(false);
      };
      loadTree();
    }
  }, [activeTab, currentFen]);

  return (
    <div className={`bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-xl text-white space-y-4 ${className}`}>
      {/* Panel Header & Tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">🗄️</span>
          <h3 className="font-heading font-bold text-sm text-amber-400">
            Classroom Chess Database
          </h3>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 gap-1 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('games')}
            className={`px-3 py-1 rounded-lg transition ${
              activeTab === 'games'
                ? 'bg-amber-500 text-slate-950 shadow-gold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Master Games
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('opening_tree')}
            className={`px-3 py-1 rounded-lg transition ${
              activeTab === 'opening_tree'
                ? 'bg-amber-500 text-slate-950 shadow-gold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Opening Tree
          </button>
        </div>
      </div>

      {/* Tab Content: Master Games Library */}
      {activeTab === 'games' && (
        <div className="space-y-3">
          {/* Search Bar */}
          <div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by player, opening, ECO (e.g. Kasparov, Sicilian, C41)..."
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Games List */}
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400">
                <span className="animate-spin text-lg inline-block mb-1">⏳</span>
                <p>Loading database games...</p>
              </div>
            ) : games.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500 italic">
                No matching games found in database.
              </div>
            ) : (
              games.map((g) => (
                <div
                  key={g.id}
                  className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 p-3 rounded-xl transition-all space-y-1.5 group"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-xs text-amber-200 group-hover:text-amber-300">
                        {g.title}
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        {g.white} vs. {g.black} ({g.year})
                      </p>
                    </div>
                    <span className="px-2 py-0.5 bg-slate-800 text-[10px] font-mono text-slate-300 rounded font-bold">
                      {g.result}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-900 pt-1.5">
                    <span>
                      {g.eco} • {g.opening}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (onLoadPgn) onLoadPgn(g.pgn, g.title);
                        if (onLoadFen && g.fen) onLoadFen(g.fen, g.title);
                      }}
                      className="px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg font-bold transition flex items-center gap-1"
                    >
                      <span>⚡ Load Board</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Tab Content: Opening Tree Explorer */}
      {activeTab === 'opening_tree' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Master opening stats for current position:
          </p>

          {loading ? (
            <div className="p-8 text-center text-xs text-slate-400">
              <span className="animate-spin text-lg inline-block mb-1">⏳</span>
              <p>Fetching opening statistics...</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
              {moves.map((m) => {
                const total = m.totalGames || 1;
                const wPct = Math.round((m.whiteWins / total) * 100);
                const dPct = Math.round((m.draws / total) * 100);
                const bPct = Math.round((m.blackWins / total) * 100);

                return (
                  <div
                    key={m.san}
                    className="bg-slate-950 border border-slate-800 p-3 rounded-xl space-y-2 hover:border-slate-700 transition"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-amber-300 text-sm">
                        {m.san}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {m.totalGames.toLocaleString()} games (Avg: {m.averageRating})
                      </span>
                    </div>

                    {/* Win/Draw/Loss Bar */}
                    <div className="h-2.5 w-full bg-slate-900 rounded-full overflow-hidden flex">
                      <div
                        style={{ width: `${wPct}%` }}
                        className="bg-emerald-500 h-full"
                        title={`White Wins: ${wPct}%`}
                      />
                      <div
                        style={{ width: `${dPct}%` }}
                        className="bg-slate-500 h-full"
                        title={`Draws: ${dPct}%`}
                      />
                      <div
                        style={{ width: `${bPct}%` }}
                        className="bg-rose-500 h-full"
                        title={`Black Wins: ${bPct}%`}
                      />
                    </div>

                    <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                      <span className="text-emerald-400">White: {wPct}%</span>
                      <span className="text-slate-400">Draw: {dPct}%</span>
                      <span className="text-rose-400">Black: {bPct}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
