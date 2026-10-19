'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import type { LeaderboardResponse, LeaderboardCategory, LeaderboardEntry } from '@/lib/students/leaderboard';
import {
  DIVISIONS,
  type DivisionTier,
} from '@/lib/students/leaderboardSimulation';
import { createSupabaseClient } from '@/lib/supabase/client';

function IconTrophy({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

function IconFlame({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
    </svg>
  );
}

function IconZap({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  );
}

function IconBookOpen({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}

function IconSword({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="14.5 17.5 3 6 3 3 6 3 17.5 14.5" />
      <line x1="13" y1="19" x2="19" y2="13" />
      <line x1="16" y1="16" x2="20" y2="20" />
      <line x1="19" y1="21" x2="21" y2="19" />
    </svg>
  );
}

function IconSearch({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconRefresh({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

interface StudentLeaderboardHubProps {
  initialData: LeaderboardResponse;
  currentUserId?: string;
}

export default function StudentLeaderboardHub({ initialData }: StudentLeaderboardHubProps) {
  const [data, setData] = useState<LeaderboardResponse>(initialData);
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('xp');
  const [selectedDivision, setSelectedDivision] = useState<DivisionTier | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const fetchLatestData = async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (res.ok) {
        const fresh = await res.json();
        setData(fresh);
      }
    } catch (err) {
      console.warn('Failed to refresh leaderboard:', err);
    }
  };

  const handleRefresh = () => {
    startTransition(async () => {
      await fetchLatestData();
    });
  };

  useEffect(() => {
    let channel: any = null;
    try {
      const supabase = createSupabaseClient();
      channel = supabase
        .channel('academy-leaderboard-live')
        .on('broadcast', { event: 'xp_earned' }, () => fetchLatestData())
        .on('broadcast', { event: 'puzzle_solved' }, () => fetchLatestData())
        .subscribe();
    } catch (e) {
      // Non-blocking
    }

    const pollTimer = setInterval(() => {
      fetchLatestData();
    }, 30000);

    return () => {
      clearInterval(pollTimer);
      if (channel) {
        try {
          const supabase = createSupabaseClient();
          supabase.removeChannel(channel);
        } catch (_) {}
      }
    };
  }, []);

  const baseList: LeaderboardEntry[] = data.entries[activeCategory] || [];
  const currentList = selectedDivision === 'all'
    ? baseList
    : baseList.filter((e) => {
        const dCfg = DIVISIONS[selectedDivision];
        return e.rating >= dCfg.minElo && e.rating <= dCfg.maxElo;
      });

  const filteredList = currentList.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const yourCurrentRank = data.yourStanding ? data.yourStanding[activeCategory] : null;
  const youEntry = currentList.find((e) => e.isYou) || baseList.find((e) => e.isYou);

  const getMetricLabel = (category: LeaderboardCategory, entry: LeaderboardEntry) => {
    switch (category) {
      case 'xp':
        return `${entry.xp.toLocaleString()} XP`;
      case 'tactics':
        return `${entry.tacticsSolved} Solved`;
      case 'homework':
        return `${entry.homeworkCompleted} Done`;
      case 'rating':
        return `${entry.rating} Elo`;
    }
  };

  const getCategoryTitle = (category: LeaderboardCategory) => {
    switch (category) {
      case 'xp':
        return 'Academy Standings (Overall XP)';
      case 'tactics':
        return 'Tactics & Puzzle Leaders';
      case 'homework':
        return 'Study Workbook Completions';
      case 'rating':
        return 'Rating & Bot Training Standings';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto select-none font-sans">
      {/* ─── Sleek Dark Slate Header ─── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <IconTrophy className="w-3.5 h-3.5 text-amber-400" />
              <span>Academy Standings</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Student Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 max-w-xl">
              Track your rank and compete with fellow academy peers across XP, puzzle tactics, workbooks, and bot training.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {data.seasonInfo && (
              <div className="text-[11px] font-mono text-slate-300 bg-slate-950 px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-2 shadow-inner">
                <span className="text-amber-400">⏱️</span>
                <span className="text-slate-400">Weekly Reset:</span>
                <span className="text-amber-400 font-bold">
                  {data.seasonInfo.daysRemaining}d {data.seasonInfo.hoursRemaining}h
                </span>
              </div>
            )}

            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-white text-xs font-bold border border-slate-700 transition-all shadow-sm cursor-pointer"
              title="Refresh standings"
            >
              <IconRefresh className={`w-3.5 h-3.5 text-amber-400 ${isPending ? 'animate-spin' : ''}`} />
              <span>{isPending ? 'Updating...' : 'Sync'}</span>
            </button>
          </div>
        </div>

        {/* ─── 4 Sleek Category Pills ─── */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <button
            onClick={() => setActiveCategory('xp')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'xp'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20 scale-[1.01]'
                : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <IconZap className={`w-4 h-4 shrink-0 ${activeCategory === 'xp' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>Overall XP</span>
          </button>

          <button
            onClick={() => setActiveCategory('tactics')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'tactics'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20 scale-[1.01]'
                : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <IconFlame className={`w-4 h-4 shrink-0 ${activeCategory === 'tactics' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>Tactics Solved</span>
          </button>

          <button
            onClick={() => setActiveCategory('homework')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'homework'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20 scale-[1.01]'
                : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <IconBookOpen className={`w-4 h-4 shrink-0 ${activeCategory === 'homework' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>Homework</span>
          </button>

          <button
            onClick={() => setActiveCategory('rating')}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeCategory === 'rating'
                ? 'bg-amber-500 text-slate-950 font-extrabold shadow-md shadow-amber-500/20 scale-[1.01]'
                : 'bg-slate-950/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
            }`}
          >
            <IconSword className={`w-4 h-4 shrink-0 ${activeCategory === 'rating' ? 'text-slate-950' : 'text-amber-400'}`} />
            <span>Training Rating</span>
          </button>
        </div>

        {/* ─── League Division Pills ─── */}
        <div className="mt-4 pt-3 border-t border-slate-800/60 flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
          <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Division:</span>
          <button
            onClick={() => setSelectedDivision('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
              selectedDivision === 'all'
                ? 'bg-slate-800 text-white border border-slate-700'
                : 'bg-slate-950 text-slate-400 hover:text-white border border-transparent'
            }`}
          >
            All Divisions
          </button>
          {(['bronze', 'silver', 'gold', 'diamond'] as DivisionTier[]).map((divKey) => {
            const dCfg = DIVISIONS[divKey];
            const isSel = selectedDivision === divKey;
            return (
              <button
                key={divKey}
                onClick={() => setSelectedDivision(divKey)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  isSel
                    ? 'bg-slate-800 text-amber-400 font-extrabold border border-amber-500/40 shadow-sm'
                    : 'bg-slate-950 text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <span>{dCfg.badge}</span>
                <span>{dCfg.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Your Personal Standing Hero Card (Golden Accent Border) ─── */}
      {youEntry && (
        <div className="bg-slate-900 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative overflow-hidden">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shrink-0 shadow-inner">
              {youEntry.avatar || '🛡️'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-black text-amber-400 uppercase tracking-wider">
                  Your Standing
                </span>
                <span className="bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {youEntry.level}
                </span>
                <span className="bg-amber-500/10 text-amber-300 border border-amber-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  {data.yourStanding?.division ? DIVISIONS[data.yourStanding.division]?.name : 'Bronze League'}
                </span>
              </div>
              <h3 className="text-lg font-bold text-white mt-0.5">
                {youEntry.name} <span className="text-xs text-amber-400 font-medium">(You)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Ranked <strong className="text-white font-extrabold">#{yourCurrentRank?.rank || youEntry.rank}</strong> of {filteredList.length} enrolled academy peers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5 sm:gap-6 bg-slate-950 border border-slate-800 px-5 py-3 rounded-2xl self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-500">Current Rank</div>
              <div className="text-xl font-extrabold text-amber-400 font-mono">#{yourCurrentRank?.rank || youEntry.rank}</div>
            </div>
            <div className="w-px h-7 bg-slate-800" />
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-500">Score</div>
              <div className="text-xl font-extrabold text-white font-mono">{getMetricLabel(activeCategory, youEntry)}</div>
            </div>
            <div className="w-px h-7 bg-slate-800" />
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-500">Streak</div>
              <div className="text-xl font-extrabold text-amber-400 flex items-center justify-center gap-1">
                <IconFlame className="w-4 h-4 text-amber-400" />
                <span>{youEntry.streak}d</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Clean Unified Leaderboard Table ─── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-xl overflow-hidden">
        {/* Search header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">
              {getCategoryTitle(activeCategory)}
            </h3>
            <p className="text-xs text-slate-400">
              {filteredList.length} active students competing
            </p>
          </div>

          <div className="relative w-full sm:w-60">
            <IconSearch className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3.5 py-1.5 text-xs rounded-xl border border-slate-800 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-colors"
            />
          </div>
        </div>

        {/* Table rows */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/60 border-b border-slate-800 text-[10px] uppercase tracking-wider font-bold text-slate-400">
                <th className="py-3 px-4 text-center w-14">Rank</th>
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4 text-center">Division</th>
                <th className="py-3 px-4 text-center">Streak</th>
                <th className="py-3 px-4 text-right">
                  {activeCategory === 'xp' ? 'Total XP' : activeCategory === 'tactics' ? 'Puzzles' : activeCategory === 'homework' ? 'Workbooks' : 'Elo Rating'}
                </th>
                <th className="py-3 px-4 text-right">Challenge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredList.map((entry) => {
                const isFirst = entry.rank === 1;
                const isSecond = entry.rank === 2;
                const isThird = entry.rank === 3;

                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      entry.isYou
                        ? 'bg-amber-500/10 border-l-4 border-amber-500 text-white font-bold'
                        : 'hover:bg-slate-800/40 text-slate-300'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3 px-4 text-center">
                      {isFirst ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-xs">
                          🥇
                        </span>
                      ) : isSecond ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700/60 text-slate-200 border border-slate-500/40 font-bold text-xs">
                          🥈
                        </span>
                      ) : isThird ? (
                        <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-950/60 text-amber-500 border border-amber-700/40 font-bold text-xs">
                          🥉
                        </span>
                      ) : (
                        <span className="font-mono text-slate-400 font-semibold">#{entry.rank}</span>
                      )}
                    </td>

                    {/* Student Info */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-base border border-slate-700 shrink-0">
                          {entry.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white truncate">
                              {entry.name}
                            </span>
                            {entry.isYou && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[9px] uppercase shadow-sm">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {entry.rating} Elo • {entry.level}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Division */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-950 text-slate-300 border border-slate-800">
                        {entry.rating >= 1200 ? '🥇 Gold' : entry.rating >= 800 ? '🥈 Silver' : '🥉 Bronze'}
                      </span>
                    </td>

                    {/* Streak */}
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-semibold text-amber-400 text-xs">
                        <IconFlame className="w-3 h-3 text-amber-400" />
                        <span>{entry.streak}d</span>
                      </span>
                    </td>

                    {/* Metric Score */}
                    <td className="py-3 px-4 text-right">
                      <span className="font-extrabold text-amber-400 font-mono text-xs">
                        {getMetricLabel(activeCategory, entry)}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-right">
                      {!entry.isYou ? (
                        <Link
                          href="/dashboard/student?tab=bot-training"
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white font-semibold text-[11px] border border-slate-700 transition-colors"
                        >
                          <span>Play</span>
                          <span>⚔️</span>
                        </Link>
                      ) : (
                        <span className="text-[10px] text-amber-400 font-bold px-2 py-1">Active</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-xs text-slate-400 italic">
                    No students found matching your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
