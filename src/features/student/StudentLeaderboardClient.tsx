'use client';

import React, { useState, useEffect } from 'react';
import { getStudentPuzzleStats } from '@/lib/puzzles/progress';

export interface LeaderboardStudentData {
  id: string; // profile id
  name: string;
  solved: number;
  xp: number;
  homeworkCompleted: number;
}

interface StudentLeaderboardClientProps {
  initialStudents: LeaderboardStudentData[];
}

export default function StudentLeaderboardClient({ initialStudents }: StudentLeaderboardClientProps) {
  const [studentsData, setStudentsData] = useState<LeaderboardStudentData[]>(initialStudents);

  useEffect(() => {
    // Merge live local puzzle stats for active student
    if (typeof window === 'undefined') return;

    try {
      const localStats = getStudentPuzzleStats();
      if (!localStats || localStats.totalSolved === 0) return;

      setStudentsData((prev) => {
        return prev.map((std) => {
          // If this entry matches, or if we update the top active local student
          const newSolved = Math.max(std.solved, localStats.totalSolved);
          const newXp = Math.max(std.xp, localStats.xp);
          return {
            ...std,
            solved: newSolved,
            xp: newXp,
          };
        });
      });
    } catch (e) {
      console.warn('Leaderboard client sync warning:', e);
    }
  }, []);

  const sortedSolved = [...studentsData]
    .sort((a, b) => b.solved - a.solved || a.name.localeCompare(b.name))
    .slice(0, 10);

  const sortedXp = [...studentsData]
    .sort((a, b) => b.xp - a.xp || a.name.localeCompare(b.name))
    .slice(0, 10);

  const sortedHomework = [...studentsData]
    .sort((a, b) => b.homeworkCompleted - a.homeworkCompleted || a.name.localeCompare(b.name))
    .slice(0, 10);

  const getRankBadge = (idx: number) => {
    if (idx === 0) return '🥇';
    if (idx === 1) return '🥈';
    if (idx === 2) return '🥉';
    return `${idx + 1}.`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* 1. Tactics Solved Leaderboard */}
      <div className="bg-white border border-border rounded-3xl shadow-card p-5 space-y-4">
        <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-wider flex items-center justify-between border-b border-border/80 pb-3">
          <span className="flex items-center gap-2">
            <span className="text-base">🔥</span> Tactics Solved
          </span>
          <span className="text-[10px] font-bold text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
            Real-Time
          </span>
        </h4>

        <div className="space-y-2.5">
          {sortedSolved.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between text-xs p-2 rounded-xl transition-all ${
                idx === 0
                  ? 'bg-amber-50 border border-amber-200 font-bold'
                  : 'bg-slate-50/70 border border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-extrabold text-text-secondary w-6 text-center text-sm">
                  {getRankBadge(idx)}
                </span>
                <span className="truncate font-semibold text-text-primary">
                  {item.name}
                </span>
              </div>
              <span className="font-extrabold text-primary font-mono whitespace-nowrap pl-2">
                {item.solved} solved
              </span>
            </div>
          ))}
          {sortedSolved.length === 0 && (
            <p className="text-xs italic text-slate-400 text-center py-4">No puzzle solves recorded yet.</p>
          )}
        </div>
      </div>

      {/* 2. Weekly XP Leaderboard */}
      <div className="bg-white border border-border rounded-3xl shadow-card p-5 space-y-4">
        <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-wider flex items-center justify-between border-b border-border/80 pb-3">
          <span className="flex items-center gap-2">
            <span className="text-base">⚡</span> Weekly XP
          </span>
          <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
            Active
          </span>
        </h4>

        <div className="space-y-2.5">
          {sortedXp.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between text-xs p-2 rounded-xl transition-all ${
                idx === 0
                  ? 'bg-emerald-50 border border-emerald-200 font-bold'
                  : 'bg-slate-50/70 border border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-extrabold text-text-secondary w-6 text-center text-sm">
                  {getRankBadge(idx)}
                </span>
                <span className="truncate font-semibold text-text-primary">
                  {item.name}
                </span>
              </div>
              <span className="font-extrabold text-emerald-600 font-mono whitespace-nowrap pl-2">
                {item.xp} XP
              </span>
            </div>
          ))}
          {sortedXp.length === 0 && (
            <p className="text-xs italic text-slate-400 text-center py-4">No XP accumulated yet.</p>
          )}
        </div>
      </div>

      {/* 3. Homework Champions Leaderboard */}
      <div className="bg-white border border-border rounded-3xl shadow-card p-5 space-y-4">
        <h4 className="text-xs font-extrabold text-text-primary uppercase tracking-wider flex items-center justify-between border-b border-border/80 pb-3">
          <span className="flex items-center gap-2">
            <span className="text-base">📝</span> Homework Champions
          </span>
          <span className="text-[10px] font-bold text-orange-500 bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200">
            Workbooks
          </span>
        </h4>

        <div className="space-y-2.5">
          {sortedHomework.map((item, idx) => (
            <div
              key={item.id}
              className={`flex items-center justify-between text-xs p-2 rounded-xl transition-all ${
                idx === 0
                  ? 'bg-orange-50 border border-orange-200 font-bold'
                  : 'bg-slate-50/70 border border-slate-100'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="font-extrabold text-text-secondary w-6 text-center text-sm">
                  {getRankBadge(idx)}
                </span>
                <span className="truncate font-semibold text-text-primary">
                  {item.name}
                </span>
              </div>
              <span className="font-extrabold text-orange-600 font-mono whitespace-nowrap pl-2">
                {item.homeworkCompleted} completed
              </span>
            </div>
          ))}
          {sortedHomework.length === 0 && (
            <p className="text-xs italic text-slate-400 text-center py-4">No completed homework yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
