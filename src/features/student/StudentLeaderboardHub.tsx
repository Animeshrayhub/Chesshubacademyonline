'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import type { LeaderboardResponse, LeaderboardCategory, LeaderboardEntry } from '@/lib/students/leaderboard';
import {
  DIVISIONS,
  type DivisionTier,
  type SimulatedStudentPeer,
  type LiveTickerEvent,
  type SeasonInfo,
} from '@/lib/students/leaderboardSimulation';
import { createSupabaseClient } from '@/lib/supabase/client';

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
  const [selectedDivision, setSelectedDivision] = useState<DivisionTier | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isPending, startTransition] = useTransition();
  const [isRealtimeConnected, setIsRealtimeConnected] = useState(false);
  const [liveNotification, setLiveNotification] = useState<{ id: string; text: string; icon: string } | null>(null);

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

  // Real-time Supabase Subscription & Live Broadcast
  useEffect(() => {
    let channel: any = null;
    try {
      const supabase = createSupabaseClient();
      channel = supabase
        .channel('academy-leaderboard-live')
        .on('broadcast', { event: 'xp_earned' }, (payload: any) => {
          if (payload?.payload?.studentName) {
            setLiveNotification({
              id: Date.now().toString(),
              text: `${payload.payload.studentName} earned +${payload.payload.xpGained || 50} XP!`,
              icon: '⚡',
            });
            setTimeout(() => setLiveNotification(null), 4500);
          }
          fetchLatestData();
        })
        .on('broadcast', { event: 'puzzle_solved' }, (payload: any) => {
          if (payload?.payload?.studentName) {
            setLiveNotification({
              id: Date.now().toString(),
              text: `${payload.payload.studentName} solved daily tactical challenge!`,
              icon: '🧩',
            });
            setTimeout(() => setLiveNotification(null), 4500);
          }
          fetchLatestData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
          fetchLatestData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'user_puzzle_history' }, () => {
          fetchLatestData();
        })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'homework_submissions' }, () => {
          fetchLatestData();
        })
        .subscribe((status: string) => {
          setIsRealtimeConnected(status === 'SUBSCRIBED');
        });
    } catch (e) {
      console.warn('[Leaderboard] Supabase realtime connection issue:', e);
    }

    // Auto-sync polling every 25 seconds as backup
    const pollTimer = setInterval(() => {
      fetchLatestData();
    }, 25000);

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
    <div className="space-y-6 max-w-7xl mx-auto select-none">
      {/* ─── Real-Time Live Notification Toast ─── */}
      {liveNotification && (
        <div className="animate-fadeInUp bg-gradient-to-r from-purple-700 via-fuchsia-600 to-amber-500 text-white font-black text-xs px-4 py-2.5 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.55)] flex items-center justify-between gap-3 border border-purple-300/40">
          <div className="flex items-center gap-2">
            <span className="text-base">{liveNotification.icon}</span>
            <span>{liveNotification.text}</span>
          </div>
          <span className="text-[10px] font-mono bg-white/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
            Live Activity
          </span>
        </div>
      )}

      {/* ─── Live Activity Ticker Ribbon ─── */}
      {data.tickerEvents && data.tickerEvents.length > 0 && (
        <div className="bg-slate-950/90 border border-purple-500/30 rounded-2xl p-2.5 px-4 shadow-xl flex items-center gap-3 overflow-hidden text-xs">
          <div className="flex items-center gap-2 shrink-0 text-purple-300 font-black text-[10px] uppercase tracking-wider bg-purple-500/15 px-2.5 py-1 rounded-xl border border-purple-500/30 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Live Academy Feed</span>
          </div>
          <div className="flex items-center gap-6 overflow-x-auto scrollbar-none whitespace-nowrap py-0.5">
            {data.tickerEvents.map((evt) => (
              <div key={evt.id} className="flex items-center gap-1.5 text-slate-300 text-[11px]">
                <span>{evt.avatar}</span>
                <span className="font-bold text-white">{evt.studentName}</span>
                <span className="text-slate-400">{evt.description}</span>
                <span className="text-[9px] text-amber-400/90 font-mono">({evt.timestampMinutesAgo}m ago)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Header & Category Switcher ─── */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950/70 to-slate-950 border border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Background glow accents */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-black uppercase tracking-wider shadow-[0_0_12px_rgba(168,85,247,0.3)]">
                <IconTrophy className="w-3.5 h-3.5 text-amber-400" />
                <span>Academy Standings Hub</span>
              </div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>{isRealtimeConnected ? 'LIVE REALTIME SYNC' : 'ACTIVE SYNC'}</span>
              </div>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              ChessHub Student Leaderboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-xl">
              Celebrate your progress, compete with enrolled academy peers in real-time, and rise through the ranks across XP, tactics, homework, and bot ratings!
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={isPending}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 active:scale-95 text-white text-xs font-bold border border-purple-400/40 transition-all shadow-lg shadow-purple-950/40 cursor-pointer"
              title="Refresh live leaderboard"
            >
              <IconRefresh className={`w-3.5 h-3.5 ${isPending ? 'animate-spin' : ''}`} />
              <span>{isPending ? 'Updating...' : 'Live Sync'}</span>
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="mt-8 pt-6 border-t border-purple-500/20 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <button
            onClick={() => setActiveCategory('xp')}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeCategory === 'xp'
                ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.02] border border-purple-300/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <IconZap className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Overall XP</span>
          </button>

          <button
            onClick={() => setActiveCategory('tactics')}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeCategory === 'tactics'
                ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.02] border border-purple-300/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <IconFlame className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Tactics Solved</span>
          </button>

          <button
            onClick={() => setActiveCategory('homework')}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeCategory === 'homework'
                ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.02] border border-purple-300/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <IconBookOpen className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Homework</span>
          </button>

          <button
            onClick={() => setActiveCategory('rating')}
            className={`flex items-center justify-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-black transition-all cursor-pointer ${
              activeCategory === 'rating'
                ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-indigo-600 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] scale-[1.02] border border-purple-300/40'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 border border-white/5'
            }`}
          >
            <IconSword className="w-4 h-4 shrink-0 text-amber-400" />
            <span>Training Rating</span>
          </button>
        </div>

        {/* ─── 4 Division Leagues Filter & Season Countdown ─── */}
        <div className="mt-4 pt-4 border-t border-purple-500/20 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">Division:</span>
            <button
              onClick={() => setSelectedDivision('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                selectedDivision === 'all'
                  ? 'bg-purple-500/30 text-white font-black border border-purple-400/40'
                  : 'bg-white/5 hover:bg-white/10 text-slate-400'
              }`}
            >
              All Leagues
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
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 font-black shadow-md shadow-amber-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  <span>{dCfg.badge}</span>
                  <span>{dCfg.name}</span>
                </button>
              );
            })}
          </div>

          {data.seasonInfo && (
            <div className="text-[11px] font-mono text-purple-200 bg-purple-950/40 px-3 py-1 rounded-xl border border-purple-500/30 flex items-center gap-1.5 shrink-0 shadow-inner">
              <span className="text-amber-400">⏱️</span>
              <span className="text-slate-400">Sunday Reset:</span>
              <span className="text-amber-300 font-bold">
                {data.seasonInfo.daysRemaining}d {data.seasonInfo.hoursRemaining}h {data.seasonInfo.minutesRemaining}m
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ─── Your Personal Standing Highlight Card (Sparkling Purple & Royal Gold) ─── */}
      {youEntry && yourCurrentRank && (
        <div className="relative overflow-hidden shimmer-purple-sweep bg-gradient-to-r from-slate-950 via-purple-950/70 to-indigo-950 border-2 border-purple-500/40 hover:border-purple-400/60 rounded-3xl p-5 sm:p-6 shadow-[0_0_35px_rgba(168,85,247,0.25)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all">
          {/* Ambient Purple Sparkle Glow Orbs */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-purple-600/25 rounded-full blur-3xl pointer-events-none animate-purple-glow" />
          <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-fuchsia-600/20 rounded-full blur-3xl pointer-events-none animate-purple-glow" />

          {/* Twinkling Sparkle Stars ✨ */}
          <div className="absolute top-3 right-12 text-purple-300/80 animate-sparkle-twinkle pointer-events-none text-sm select-none">
            ✦
          </div>
          <div className="absolute bottom-3 left-1/3 text-fuchsia-300/70 animate-sparkle-twinkle-delayed pointer-events-none text-xs select-none">
            ✨
          </div>

          <div className="relative z-10 flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500/40 via-amber-500/30 to-fuchsia-600/40 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(168,85,247,0.5)] border-2 border-purple-400/80">
                {youEntry.avatar || '🛡️'}
              </div>
              <span className="absolute -top-1.5 -right-1.5 text-xs animate-sparkle-twinkle select-none pointer-events-none">✨</span>
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black text-purple-300 uppercase tracking-wider flex items-center gap-1">
                  <span>Your Standing</span>
                </span>
                <span className="bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-purple-300/30 shadow-[0_0_10px_rgba(168,85,247,0.4)]">
                  {youEntry.level}
                </span>
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Division: {data.yourStanding?.division ? DIVISIONS[data.yourStanding.division]?.name : 'Active'}
                </span>
              </div>
              <h3 className="text-lg font-black text-white mt-1">
                {youEntry.name} <span className="text-xs text-purple-300/80 font-normal">(You)</span>
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Currently ranked <strong className="text-amber-400 font-black">#{yourCurrentRank.rank}</strong> of {data.totalStudents} academy peers in {activeCategory.toUpperCase()}!
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center gap-4 sm:gap-6 bg-slate-950/80 border border-purple-500/30 px-6 py-3.5 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.4)] self-stretch sm:self-auto justify-between sm:justify-end backdrop-blur-md">
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Rank</div>
              <div className="text-xl font-black text-purple-300 font-mono">#{yourCurrentRank.rank}</div>
            </div>
            <div className="w-px h-8 bg-purple-500/30" />
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Score</div>
              <div className="text-xl font-black text-fuchsia-300 font-mono">{getMetricLabel(activeCategory, youEntry)}</div>
            </div>
            <div className="w-px h-8 bg-purple-500/30" />
            <div className="text-center">
              <div className="text-[10px] uppercase font-bold text-slate-400">Streak</div>
              <div className="text-xl font-black text-amber-400 flex items-center justify-center gap-1">
                <IconFlame className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>{youEntry.streak}d</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Top 3 Podium (Visual WOW factor: Sparkling Purple & Royal Gold) ─── */}
      {topThree.length >= 3 && (
        <div className="relative overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-purple-950/50 border-2 border-purple-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {/* Ambient Glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-72 h-72 bg-purple-600/15 rounded-full blur-3xl pointer-events-none" />

          <div className="text-center max-w-md mx-auto mb-6 relative z-10">
            <span className="text-xs font-black uppercase tracking-wider text-purple-200 bg-gradient-to-r from-purple-500/30 via-amber-500/20 to-purple-500/30 px-3.5 py-1 rounded-full border border-purple-400/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]">
              ✨ Podium Champions
            </span>
            <h3 className="text-xl font-black text-white mt-2 tracking-tight">Top 3 Contenders</h3>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-end justify-center gap-4 sm:gap-6 max-w-3xl mx-auto pt-4 relative z-10">
            {/* 2nd Place (Silver Contender) */}
            <div className="bg-slate-900/90 border border-slate-700/80 rounded-3xl p-5 text-center flex flex-col items-center justify-between order-2 sm:order-1 sm:w-1/3 relative shadow-lg hover:border-slate-500 transition-all">
              <div className="absolute -top-4 w-9 h-9 rounded-full bg-slate-800 border-2 border-slate-400 flex items-center justify-center font-black text-slate-200 text-sm shadow-[0_0_15px_rgba(148,163,184,0.4)]">
                🥈
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-3xl mt-3 border-2 border-slate-400 shadow-inner">
                {topThree[1].avatar}
              </div>
              <div className="mt-3">
                <div className="font-black text-sm text-white truncate max-w-[160px]">
                  {topThree[1].name}
                </div>
                <div className="text-xs font-black text-slate-300 font-mono mt-0.5">
                  {getMetricLabel(activeCategory, topThree[1])}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  🔥 {topThree[1].streak}-day streak
                </div>
              </div>
              <div className="w-full mt-4 py-2 bg-slate-800/90 rounded-xl text-[11px] font-black text-slate-200 uppercase tracking-wider border border-slate-700">
                Rank #2
              </div>
            </div>

            {/* 1st Place (Royal Gold Leader) */}
            <div className="relative overflow-hidden bg-gradient-to-b from-amber-950/60 via-slate-900 to-purple-950/60 border-2 border-amber-400 rounded-3xl p-6 text-center flex flex-col items-center justify-between order-1 sm:order-2 sm:w-1/3 shadow-[0_0_40px_rgba(245,158,11,0.35)] scale-105 sm:-translate-y-2">
              <div className="absolute -top-6 flex flex-col items-center text-amber-400">
                <IconCrown className="w-9 h-9 animate-bounce drop-shadow-[0_0_12px_rgba(245,158,11,0.8)]" />
              </div>
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 via-yellow-400 to-amber-600 flex items-center justify-center text-4xl mt-3 border-4 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.7)]">
                {topThree[0].avatar}
              </div>
              <div className="mt-3">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-950 bg-gradient-to-r from-amber-400 to-yellow-400 px-2.5 py-0.5 rounded-full shadow-sm">
                  Leader
                </span>
                <div className="font-black text-base text-white mt-1.5 truncate max-w-[180px]">
                  {topThree[0].name}
                </div>
                <div className="text-sm font-black text-amber-400 font-mono mt-0.5">
                  {getMetricLabel(activeCategory, topThree[0])}
                </div>
                <div className="text-[10px] text-amber-300/90 mt-1 font-bold">
                  🔥 {topThree[0].streak}-day streak • {topThree[0].level}
                </div>
              </div>
              <div className="w-full mt-4 py-2.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-xl text-xs font-black text-slate-950 uppercase tracking-wider shadow-gold">
                👑 Champion #1
              </div>
            </div>

            {/* 3rd Place (Bronze Contender) */}
            <div className="bg-slate-900/90 border border-amber-900/60 rounded-3xl p-5 text-center flex flex-col items-center justify-between order-3 sm:order-3 sm:w-1/3 relative shadow-lg hover:border-amber-700 transition-all">
              <div className="absolute -top-4 w-9 h-9 rounded-full bg-amber-950 border-2 border-amber-600 flex items-center justify-center font-black text-amber-300 text-sm shadow-[0_0_15px_rgba(217,119,6,0.3)]">
                🥉
              </div>
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-900/80 to-slate-900 flex items-center justify-center text-3xl mt-3 border-2 border-amber-600/60 shadow-inner">
                {topThree[2].avatar}
              </div>
              <div className="mt-3">
                <div className="font-black text-sm text-white truncate max-w-[160px]">
                  {topThree[2].name}
                </div>
                <div className="text-xs font-black text-amber-400 font-mono mt-0.5">
                  {getMetricLabel(activeCategory, topThree[2])}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  🔥 {topThree[2].streak}-day streak
                </div>
              </div>
              <div className="w-full mt-4 py-2 bg-amber-950/60 rounded-xl text-[11px] font-black text-amber-300 uppercase tracking-wider border border-amber-800/60">
                Rank #3
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Full Standings Table ─── */}
      <div className="bg-slate-900/90 border border-purple-500/25 rounded-3xl shadow-2xl overflow-hidden backdrop-blur-md">
        {/* Table Controls */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-black text-white">
              {getCategoryTitle(activeCategory)}
            </h3>
            <p className="text-xs text-slate-400">
              Showing {filteredList.length} academy students enrolled
            </p>
          </div>

          <div className="relative w-full sm:w-64">
            <IconSearch className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-700 bg-slate-950 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 transition-all"
            />
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-950/70 border-b border-slate-800 text-[11px] uppercase tracking-wider font-extrabold text-slate-400">
                <th className="py-3.5 px-4 text-center w-14">Rank</th>
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4 text-center">Level</th>
                <th className="py-3.5 px-4 text-center">Streak</th>
                <th className="py-3.5 px-4 text-right">
                  {activeCategory === 'xp' ? 'Total XP' : activeCategory === 'tactics' ? 'Tactics Solved' : activeCategory === 'homework' ? 'Homework' : 'Rating'}
                </th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {filteredList.map((entry) => {
                const isFirst = entry.rank === 1;
                const isSecond = entry.rank === 2;
                const isThird = entry.rank === 3;

                return (
                  <tr
                    key={entry.id}
                    className={`transition-colors ${
                      entry.isYou
                        ? 'bg-gradient-to-r from-purple-950/70 via-indigo-950/50 to-purple-950/70 border-l-4 border-purple-400 text-white shadow-inner font-bold'
                        : 'hover:bg-purple-950/20 text-slate-200'
                    }`}
                  >
                    {/* Rank */}
                    <td className="py-3.5 px-4 text-center">
                      {isFirst ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40 font-black text-sm">
                          🥇
                        </span>
                      ) : isSecond ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-700/60 text-slate-200 border border-slate-500/40 font-black text-sm">
                          🥈
                        </span>
                      ) : isThird ? (
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-950/60 text-amber-400 border border-amber-700/40 font-black text-sm">
                          🥉
                        </span>
                      ) : (
                        <span className="font-extrabold text-slate-400">#{entry.rank}</span>
                      )}
                    </td>

                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-lg border border-slate-700 shrink-0">
                          {entry.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-white truncate">
                              {entry.name}
                            </span>
                            {entry.isYou && (
                              <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-600 to-fuchsia-600 text-white font-black text-[10px] uppercase shadow-sm">
                                You
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            {entry.rating} Elo • Boss Lvl {entry.botLevel}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Level */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-block px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-purple-300 border border-purple-500/30">
                        {entry.level}
                      </span>
                    </td>

                    {/* Streak */}
                    <td className="py-3.5 px-4 text-center">
                      <span className="inline-flex items-center gap-1 font-bold text-amber-400 text-xs">
                        <IconFlame className="w-3.5 h-3.5 text-amber-400" />
                        <span>{entry.streak}d</span>
                      </span>
                    </td>

                    {/* Metric Value */}
                    <td className="py-3.5 px-4 text-right">
                      <span className="font-extrabold text-amber-400 font-mono text-sm">
                        {getMetricLabel(activeCategory, entry)}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-3.5 px-4 text-right">
                      {!entry.isYou ? (
                        <Link
                          href={`/dashboard/student?tab=bot-training`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-[11px] uppercase transition-all shadow-md shadow-purple-900/40 active:scale-95 cursor-pointer"
                        >
                          <span>Challenge</span>
                          <span>⚔️</span>
                        </Link>
                      ) : (
                        <span className="text-[10px] text-purple-300 font-bold">You</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-slate-400 italic">
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
