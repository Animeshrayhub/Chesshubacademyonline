'use client';

import React, { useState, useTransition } from 'react';
import type { LeaderboardResponse, LeaderboardCategory, LeaderboardEntry } from '@/lib/students/leaderboard';

// Inline SVG Icons for self-contained, zero-dependency rendering
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

function IconCrown({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="2 4 5 20 19 20 22 4 15 10 12 2 9 10 2 4" />
    </svg>
  );
}

interface StudentLeaderboardHubProps {
  initialData: LeaderboardResponse;
  currentUserId?: string;
}

export default function StudentLeaderboardHub({ initialData, currentUserId }: StudentLeaderboardHubProps) {
  const [data, setData] = useState<LeaderboardResponse>(initialData);
  const [activeCategory, setActiveCategory] = useState<LeaderboardCategory>('xp');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(async () => {
      try {
        const res = await fetch('/api/leaderboard');
        if (res.ok) {
          const fresh = await res.json();
          setData(fresh);
        }
      } catch (err) {
        console.warn('Failed to refresh leaderboard:', err);
      }
    });
  };

  const currentList: LeaderboardEntry[] = data.entries[activeCategory] || [];
  const filteredList = currentList.filter(
    (e) =>
      e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const topThree = currentList.slice(0, 3);
  const yourCurrentRank = data.yourStanding ? data.yourStanding[activeCategory] : null;
  const youEntry = currentList.find((e) => e.isYou);

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
        return 'Academy Champions (Overall XP)';
      case 'tactics':
        return 'Tactics & Puzzle Masters';
      case 'homework':
        return 'Homework Champions';
      case 'rating':
        return 'Training & Bot Rating Standings';
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* ─── Header & Category Switcher ─── */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-900/50 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Background glow accents */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-black uppercase tracking-wider">
              <IconTrophy className="w-3.5 h-3.5" />
              <span>Academy Standings Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ChessHub Student Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Celebrate your progress, compete with enrolled academy peers, and rise through the ranks across XP, tactics, homework, and bot ratings!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/15 active:scale-95 text-white text-xs font-bold border border-white/10 transition-all shadow-sm"
              title="Refresh live leaderboard"
            >
              <IconRefresh className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
              <span>{isPending ? 'Updating...' : 'Live Sync'}</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setActiveCategory('xp')}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-black transition-all ${
              activeCategory === 'xp'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-[1.02]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <IconZap className="w-4 h-4 shrink-0" />
            <span>Overall XP</span>
          </button>

          <button
            onClick={() => setActiveCategory('tactics')}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-black transition-all ${
              activeCategory === 'tactics'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-[1.02]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <IconFlame className="w-4 h-4 shrink-0" />
            <span>Tactics Solved</span>
          </button>

          <button
            onClick={() => setActiveCategory('homework')}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-black transition-all ${
              activeCategory === 'homework'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-[1.02]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <IconBookOpen className="w-4 h-4 shrink-0" />
            <span>Homework</span>
          </button>

          <button
            onClick={() => setActiveCategory('rating')}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-black transition-all ${
              activeCategory === 'rating'
                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25 scale-[1.02]'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <IconSword className="w-4 h-4 shrink-0" />
            <span>Training Rating</span>
          </button>
        </div>
      </div>

      {/* ─── Your Personal Standing Highlight Card ─── */}
      {youEntry && yourCurrentRank && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-card flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center text-2xl shadow-lg border border-amber-400 shrink-0">
              {youEntry.avatar || '🛡️'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Your Standing</span>
                <span className="bg-amber-500/20 text-amber-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-amber-500/30">
                  {youEntry.level}
                </span>
              </div>
              <h3 className="text-base font-black text-text-primary mt-0.5">
                {youEntry.name} <span className="text-xs text-text-muted font-normal">(You)</span>
              </h3>
              <p className="text-xs text-text-secondary">
                Currently ranked <strong className="text-amber-600 font-black">#{yourCurrentRank.rank}</strong> of {data.totalStudents} academy peers in {activeCategory.toUpperCase()}!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6 bg-white border border-border px-5 py-3 rounded-2xl shadow-sm self-stretch sm:self-auto justify-between sm:justify-end">
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-text-muted">Rank</div>
              <div className="text-lg font-black text-amber-600">#{yourCurrentRank.rank}</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-text-muted">Score</div>
              <div className="text-lg font-black text-text-primary">{getMetricLabel(activeCategory, youEntry)}</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-text-muted">Streak</div>
              <div className="text-lg font-black text-rose-500 flex items-center justify-center gap-1">
                <IconFlame className="w-4 h-4" />
                <span>{youEntry.streak}d</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Top 3 Podium (Visual WOW factor) ─── */}
      {topThree.length >= 3 && (
        <div className="bg-white border border-border rounded-3xl p-6 sm:p-8 shadow-card">
          <div className="text-center max-w-md mx-auto mb-6">
            <span className="text-xs font-black uppercase tracking-wider text-amber-600 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              Podium Champions
            </span>
            <h3 className="text-lg font-black text-text-primary mt-2">Top 3 Contenders</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 items-end max-w-3xl mx-auto pt-4">
            {/* 2nd Place */}
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 text-center flex flex-col items-center justify-between order-2 sm:order-1 relative shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute -top-4 w-8 h-8 rounded-full bg-slate-200 border-2 border-slate-300 flex items-center justify-center font-black text-slate-700 text-sm shadow-sm">
                🥈
              </div>
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-3xl mt-3 border-2 border-slate-300 shadow-inner">
                {topThree[1].avatar}
              </div>
              <div className="mt-3">
                <div className="font-extrabold text-sm text-text-primary truncate max-w-[160px]">
                  {topThree[1].name}
                </div>
                <div className="text-xs font-black text-slate-600 mt-0.5">
                  {getMetricLabel(activeCategory, topThree[1])}
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  🔥 {topThree[1].streak}-day streak
                </div>
              </div>
              <div className="w-full mt-4 py-2 bg-slate-200/80 rounded-xl text-[11px] font-black text-slate-700 uppercase tracking-wider">
                Rank #2
              </div>
            </div>

            {/* 1st Place (Gold / Crown / Tallest) */}
            <div className="bg-gradient-to-b from-amber-50 to-amber-100/50 border-2 border-amber-400 rounded-3xl p-6 text-center flex flex-col items-center justify-between order-1 sm:order-2 relative shadow-xl shadow-amber-500/10 scale-105 sm:-translate-y-2">
              <div className="absolute -top-6 flex flex-col items-center text-amber-500">
                <IconCrown className="w-8 h-8 animate-bounce" />
              </div>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-4xl mt-3 border-4 border-amber-300 shadow-lg">
                {topThree[0].avatar}
              </div>
              <div className="mt-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 bg-amber-200/60 px-2 py-0.5 rounded-full">
                  Leader
                </span>
                <div className="font-black text-base text-text-primary mt-1 truncate max-w-[180px]">
                  {topThree[0].name}
                </div>
                <div className="text-sm font-black text-amber-700 mt-0.5">
                  {getMetricLabel(activeCategory, topThree[0])}
                </div>
                <div className="text-[10px] text-amber-800/80 mt-1 font-bold">
                  🔥 {topThree[0].streak}-day streak • {topThree[0].level}
                </div>
              </div>
              <div className="w-full mt-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl text-xs font-black text-slate-950 uppercase tracking-wider shadow-sm">
                👑 Champion #1
              </div>
            </div>

            {/* 3rd Place */}
            <div className="bg-amber-50/40 border border-amber-200/60 rounded-3xl p-5 text-center flex flex-col items-center justify-between order-3 sm:order-3 relative shadow-sm hover:shadow-md transition-shadow">
              <div className="absolute -top-4 w-8 h-8 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center font-black text-amber-800 text-sm shadow-sm">
                🥉
              </div>
              <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center text-3xl mt-3 border-2 border-amber-200 shadow-inner">
                {topThree[2].avatar}
              </div>
              <div className="mt-3">
                <div className="font-extrabold text-sm text-text-primary truncate max-w-[160px]">
                  {topThree[2].name}
                </div>
                <div className="text-xs font-black text-amber-800 mt-0.5">
                  {getMetricLabel(activeCategory, topThree[2])}
                </div>
                <div className="text-[10px] text-text-muted mt-1">
                  🔥 {topThree[2].streak}-day streak
                </div>
              </div>
              <div className="w-full mt-4 py-2 bg-amber-200/60 rounded-xl text-[11px] font-black text-amber-800 uppercase tracking-wider">
                Rank #3
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Full Standings Table ─── */}
      <div className="bg-white border border-border rounded-3xl shadow-card overflow-hidden">
        {/* Table Controls */}
        <div className="p-5 sm:p-6 border-b border-border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-text-primary">
              {getCategoryTitle(activeCategory)}
            </h3>
            <p className="text-xs text-text-secondary">
              Showing {filteredList.length} academy students enrolled
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <IconSearch className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-border bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all"
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-border text-[11px] uppercase tracking-wider font-extrabold text-text-muted">
                <th className="py-3.5 px-4 text-center w-14">Rank</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4 text-center">Level</th>
                <th className="py-3.5 px-4 text-center">Streak</th>
                <th className="py-3.5 px-4 text-right">
                  {activeCategory === 'xp' ? 'Total XP' : activeCategory === 'tactics' ? 'Tactics Solved' : activeCategory === 'homework' ? 'Homework' : 'Rating'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-medium">
              {filteredList.map((entry) => {
                const isFirst = entry.rank === 1;
                const isSecond = entry.rank === 2;
                const isThird = entry.rank === 3;

                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      entry.isYou
                        ? 'bg-amber-50/80 hover:bg-amber-100/60 font-bold'
                        : 'hover:bg-slate-50/80'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      {isFirst ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-100 text-amber-800 font-black text-sm">
                          🥇
                        </span>
                      ) : isSecond ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-black text-sm">
                          🥈
                        </span>
                      ) : isThird ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-50 text-amber-900 border border-amber-200 font-black text-sm">
                          🥉
                        </span>
                      ) : (
                        <span className="font-extrabold text-text-muted">#{entry.rank}</span>
                      )}
                    </td>

                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-lg border border-border shrink-0">
                          {entry.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-text-primary truncate">
                              {entry.name}
                            </span>
                            {entry.isYou && (
                              <span className="px-2 py-0.5 rounded-full bg-amber-500 text-slate-950 font-black text-[10px] uppercase">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-text-muted font-mono">
                            {entry.rating} Elo • Boss Lvl {entry.botLevel}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Level */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-text-secondary border border-border">
                        {entry.level}
                      </span>
                    </td>

                    {/* Streak */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-rose-500 text-xs">
                        <IconFlame className="w-3.5 h-3.5" />
                        <span>{entry.streak}d</span>
                      </span>
                    </td>

                    {/* Metric Value */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-extrabold text-amber-600 font-mono text-sm">
                        {getMetricLabel(activeCategory, entry)}
                      </span>
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-text-muted italic">
                    No students match your search query.
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
