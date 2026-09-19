'use client';

import React, { useState } from 'react';
import { syncStudentLichessAction, linkLichessAccountAction } from '@/actions/lichess';
import type { TournamentItem } from '@/components/dashboard/ui/LichessTournamentManager';

interface LichessRatingData {
  username: string;
  ratings: {
    blitz: number;
    rapid: number;
    classical: number;
    bullet: number;
    puzzle: number;
  };
  gamesCount: number;
  syncedAt: string;
}

interface StudentTournamentRatingHubProps {
  studentId: string;
  initialLichess: LichessRatingData | null;
  tournaments?: TournamentItem[];
}

export default function StudentTournamentRatingHub({
  studentId,
  initialLichess,
  tournaments = [],
}: StudentTournamentRatingHubProps) {
  const [lichess, setLichess] = useState<LichessRatingData | null>(initialLichess);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [inputUsername, setInputUsername] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  const handleSync = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!lichess?.username) return;
    setIsSyncing(true);
    setSyncFeedback(null);

    try {
      const res = await syncStudentLichessAction(studentId, lichess.username);
      if (res.success && res.data) {
        setLichess((prev) =>
          prev
            ? {
                ...prev,
                ratings: {
                  ...prev.ratings,
                  blitz: res.data.blitzRating ?? prev.ratings.blitz,
                  rapid: res.data.rapidRating ?? prev.ratings.rapid,
                  puzzle: res.data.puzzleRating ?? prev.ratings.puzzle,
                },
                syncedAt: new Date().toISOString(),
              }
            : null
        );
        setSyncFeedback('✅ Ratings synced successfully!');
      } else {
        setSyncFeedback('❌ Could not sync ratings. Please try again.');
      }
    } catch {
      setSyncFeedback('❌ Sync error. Please try again.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  const handleLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputUsername.trim()) return;
    setIsLinking(true);
    setSyncFeedback(null);

    try {
      const res = await linkLichessAccountAction(inputUsername.trim());
      if (res.success && res.data) {
        const p = res.data.profile as any;
        setLichess({
          username: p.username,
          ratings: {
            blitz: p.perfs?.blitz?.rating || 1500,
            rapid: p.perfs?.rapid?.rating || 1500,
            classical: p.perfs?.classical?.rating || 1500,
            bullet: p.perfs?.bullet?.rating || 1500,
            puzzle: p.perfs?.puzzle?.rating || 1500,
          },
          gamesCount: p.count?.all || 0,
          syncedAt: new Date().toISOString(),
        });
        setSyncFeedback('✅ Lichess account linked successfully!');
      } else {
        setSyncFeedback('❌ Could not find this Lichess username.');
      }
    } catch {
      setSyncFeedback('❌ Failed to link account.');
    } finally {
      setIsLinking(false);
      setTimeout(() => setSyncFeedback(null), 4000);
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Ambient background glow */}
      <div className="absolute -top-10 -right-10 w-44 h-44 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 flex items-center justify-center text-xl shadow-gold">
            ♞
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-black text-white tracking-tight">
                Lichess &amp; Tournament Hub
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase">
                Live Sync
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Synced ratings, tactical puzzle performance, and weekly Academy Arena battles
            </p>
          </div>
        </div>

        {lichess ? (
          <div className="flex items-center gap-3 self-start sm:self-auto">
            <button
              type="button"
              onClick={handleSync}
              disabled={isSyncing}
              className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 hover:text-white font-bold text-xs rounded-xl border border-slate-700 transition-all flex items-center gap-1.5 shadow-sm"
            >
              <span className={isSyncing ? 'animate-spin' : ''}>🔄</span>
              <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
            </button>
            <a
              href={`https://lichess.org/@/${lichess.username}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 underline underline-offset-2 flex items-center gap-1"
            >
              <span>@{lichess.username}</span>
              <span>↗</span>
            </a>
          </div>
        ) : null}
      </div>

      {syncFeedback && (
        <div className="p-3 bg-slate-950/80 border border-slate-700 rounded-xl text-xs font-bold text-amber-300 animate-fadeIn text-center">
          {syncFeedback}
        </div>
      )}

      {/* Ratings Grid */}
      {lichess ? (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center space-y-0.5 hover:border-amber-500/40 transition-colors">
            <span className="text-[10px] text-slate-400 uppercase font-black block">Tactics / Puzzle</span>
            <span className="text-base font-black text-amber-400 font-mono">
              {lichess.ratings.puzzle || '—'}
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center space-y-0.5 hover:border-emerald-500/40 transition-colors">
            <span className="text-[10px] text-slate-400 uppercase font-black block">Rapid Rating</span>
            <span className="text-base font-black text-emerald-400 font-mono">
              {lichess.ratings.rapid || '—'}
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center space-y-0.5 hover:border-blue-500/40 transition-colors">
            <span className="text-[10px] text-slate-400 uppercase font-black block">Blitz Rating</span>
            <span className="text-base font-black text-blue-400 font-mono">
              {lichess.ratings.blitz || '—'}
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center space-y-0.5 hover:border-purple-500/40 transition-colors">
            <span className="text-[10px] text-slate-400 uppercase font-black block">Classical</span>
            <span className="text-base font-black text-purple-400 font-mono">
              {lichess.ratings.classical || '—'}
            </span>
          </div>
          <div className="bg-slate-950/80 border border-slate-800 p-3 rounded-2xl text-center space-y-0.5 col-span-2 sm:col-span-1">
            <span className="text-[10px] text-slate-400 uppercase font-black block">Total Games</span>
            <span className="text-base font-black text-slate-200 font-mono">
              {lichess.gamesCount || '—'}
            </span>
          </div>
        </div>
      ) : (
        <div className="p-5 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🔗</span>
            <div>
              <p className="text-sm font-bold text-white">Connect Your Lichess Account</p>
              <p className="text-xs text-slate-400">
                Sync your rapid, blitz, and tactical puzzle rating directly to your student profile.
              </p>
            </div>
          </div>
          <form onSubmit={handleLink} className="flex items-center gap-2 pt-1 max-w-md">
            <input
              type="text"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              placeholder="Your Lichess username (e.g. magnus123)"
              className="flex-1 px-3.5 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={isLinking || !inputUsername.trim()}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-gold whitespace-nowrap"
            >
              {isLinking ? 'Linking...' : 'Connect'}
            </button>
          </form>
        </div>
      )}

      {/* Upcoming Academy Tournaments Subsection */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <span>🏆</span>
            <span>Upcoming Academy Arena Matches</span>
          </h4>
        </div>

        {tournaments.length === 0 ? (
          <div className="p-4 rounded-2xl bg-slate-950/50 border border-slate-800/80 text-center text-xs text-slate-400">
            No live arena scheduled right now. Coaches announce weekly tournaments here.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {tournaments.slice(0, 2).map((t) => (
              <div
                key={t.id}
                className="p-4 bg-slate-950/80 border border-slate-800 rounded-2xl flex items-center justify-between gap-3 hover:border-amber-500/40 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 text-[10px] font-black uppercase">
                      {t.timeControl}
                    </span>
                    <span className="text-[11px] text-slate-400">{t.date}</span>
                  </div>
                  <h5 className="text-xs font-bold text-white">{t.title}</h5>
                </div>

                <a
                  href={t.lichessUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-gold whitespace-nowrap transition-all"
                >
                  Join ➔
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
