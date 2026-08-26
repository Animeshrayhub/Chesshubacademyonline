'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import DashboardIcon from '@/components/dashboard/ui/DashboardIcon';
import Button from '@/components/ui/Button';
import { getStudentBotProfileAction, coachUnlockLevelAction } from '@/actions/botTraining';
import type {
  StudentBotProfile,
  BotGameRecord,
  RatingHistoryEntry,
  StudentWeakness,
  PersonalizedPuzzle,
  StudentBadge,
  BotLevelConfig,
} from '@/lib/bot-training/types';

const BOT_LEVELS: BotLevelConfig[] = [
  { level: 1, rating: 400, name: 'Level 1 — Pawn', description: 'Beginner (400)', depth: 1, skillLevel: 0, avatarIcon: '♟️' },
  { level: 2, rating: 600, name: 'Level 2 — Knight', description: 'Casual (600)', depth: 2, skillLevel: 2, avatarIcon: '♞' },
  { level: 3, rating: 800, name: 'Level 3 — Bishop', description: 'Intermediate (800)', depth: 4, skillLevel: 5, avatarIcon: '♝' },
  { level: 4, rating: 1000, name: 'Level 4 — Rook', description: 'Club Player (1000)', depth: 6, skillLevel: 8, avatarIcon: '♜' },
  { level: 5, rating: 1200, name: 'Level 5 — Queen', description: 'Advanced (1200)', depth: 8, skillLevel: 11, avatarIcon: '♛' },
  { level: 6, rating: 1400, name: 'Level 6 — CM Bot', description: 'Expert CM (1400)', depth: 10, skillLevel: 14, avatarIcon: '🏅' },
  { level: 7, rating: 1600, name: 'Level 7 — IM Bot', description: 'Master IM (1600)', depth: 12, skillLevel: 16, avatarIcon: '🎖️' },
  { level: 8, rating: 1800, name: 'Level 8 — GM Bot', description: 'Grandmaster (1800)', depth: 14, skillLevel: 18, avatarIcon: '🥇' },
  { level: 9, rating: 2000, name: 'Level 9 — Super GM', description: 'Super GM (2000)', depth: 16, skillLevel: 19, avatarIcon: '👑' },
  { level: 10, rating: 2200, name: 'Level 10 — Engine', description: 'Champion (2200)', depth: 18, skillLevel: 20, avatarIcon: '⚡' },
];

interface Props {
  studentUserId: string;
  profileId: string;
  studentName: string;
}

export default function StudentBotTrainingDetailView({ studentUserId, profileId, studentName }: Props) {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<StudentBotProfile | null>(null);
  const [ratingHistory, setRatingHistory] = useState<RatingHistoryEntry[]>([]);
  const [weaknesses, setWeaknesses] = useState<StudentWeakness[]>([]);
  const [puzzles, setPuzzles] = useState<PersonalizedPuzzle[]>([]);
  const [badges, setBadges] = useState<StudentBadge[]>([]);
  const [recentGames, setRecentGames] = useState<BotGameRecord[]>([]);
  const [unlockingLevel, setUnlockingLevel] = useState<number | null>(null);

  const fetchStudentData = async () => {
    setLoading(true);
    const res = await getStudentBotProfileAction(studentUserId);
    if (res.success && res.data) {
      setProfile(res.data.profile);
      setRatingHistory(res.data.ratingHistory || []);
      setWeaknesses(res.data.weaknesses || []);
      setPuzzles(res.data.puzzles || []);
      setBadges(res.data.badges || []);
      setRecentGames(res.data.recentGames || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchStudentData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentUserId]);

  const handleUnlockLevel = async (lvl: number) => {
    setUnlockingLevel(lvl);
    const res = await coachUnlockLevelAction({ studentUserId, levelToUnlock: lvl });
    if (res.success) {
      fetchStudentData();
    } else {
      alert(res.error?.message || 'Failed to unlock level.');
    }
    setUnlockingLevel(null);
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-400">
        <DashboardIcon iconKey="brain" className="w-10 h-10 animate-spin mx-auto text-primary mb-3" />
        <p className="font-bold text-sm">Loading Student Bot Training Analytics...</p>
      </div>
    );
  }

  const unlockedSet = new Set(profile?.unlocked_levels || [1]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="text-xs font-bold text-slate-400 mb-1">
            <Link href={`/dashboard/coach/students/${profileId}`} className="text-primary hover:underline">
              &larr; Back to Student Profile
            </Link>
          </div>
          <h1 className="text-2xl font-black text-white">{studentName} — Bot Training & Weakness Profile</h1>
          <p className="text-xs text-slate-400 mt-1">
            Coach Management Dashboard: Monitor rating progression, mistake patterns, and manually unlock bot levels.
          </p>
        </div>

        <div className="flex items-center gap-4 bg-slate-950 border border-slate-800 rounded-xl px-5 py-3 text-center">
          <div>
            <div className="text-2xl font-black text-amber-400">{profile?.rating || 400}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Rating</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-2xl font-black text-emerald-400">Level {profile?.current_level || 1}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Current Level</div>
          </div>
          <div className="h-8 w-px bg-slate-800" />
          <div>
            <div className="text-2xl font-black text-sky-400">{profile?.games_played || 0}</div>
            <div className="text-[10px] font-bold text-slate-400 uppercase">Games Played</div>
          </div>
        </div>
      </div>

      {/* Level Access & Coach Unlocks */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <DashboardIcon iconKey="shield" className="w-5 h-5 text-amber-400" />
          Bot Level Access & Manual Coach Unlocks
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          {BOT_LEVELS.map((b) => {
            const isUnlocked = unlockedSet.has(b.level);
            const isCoachUnlocked = profile?.coach_unlocked_levels?.includes(b.level);

            return (
              <div key={b.level} className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{b.avatarIcon}</span>
                  {isUnlocked ? (
                    isCoachUnlocked ? (
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded">
                        🔓 Coach Unlocked
                      </span>
                    ) : (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-bold px-1.5 py-0.5 rounded">
                        Rating Unlocked
                      </span>
                    )
                  ) : (
                    <span className="text-xs text-rose-400 font-bold">🔒 Locked</span>
                  )}
                </div>

                <div>
                  <div className="font-bold text-xs text-white">{b.name}</div>
                  <div className="text-[10px] text-slate-400">Target: {b.rating}</div>
                </div>

                {!isUnlocked && (
                  <Button
                    onClick={() => handleUnlockLevel(b.level)}
                    loading={unlockingLevel === b.level}
                    className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px]"
                  >
                    🔓 Coach Unlock
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Weakness Profile */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <DashboardIcon iconKey="puzzle" className="w-5 h-5 text-rose-400" />
          Student Weaknesses & Mistake Taxonomy ({weaknesses.length})
        </h2>

        {weaknesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {weaknesses.map((w) => (
              <div key={w.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm text-white">{w.weakness_type.replace('_', ' ').toUpperCase()}</span>
                  <span className="text-[10px] font-black bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded">
                    {w.status}
                  </span>
                </div>
                <div className="text-xs text-slate-400 space-y-1">
                  <div>Occurrences: <strong className="text-white">{w.occurrences} games</strong></div>
                  <div>Puzzles Solved: <strong className="text-white">{w.puzzles_correct} / {w.puzzles_completed}</strong></div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No weaknesses detected yet for this student.</p>
        )}
      </div>

      {/* Personalized Generated Puzzles */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <DashboardIcon iconKey="target" className="w-5 h-5 text-amber-400" />
          Active Personalized Puzzles ({puzzles.length})
        </h2>

        {puzzles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {puzzles.map((p) => (
              <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{p.title}</span>
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded">
                    {p.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-400">{p.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">No custom puzzles generated for this student yet.</p>
        )}
      </div>
    </div>
  );
}
