'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { getStudentPuzzleStats, getStudentRankTitle, type StudentPuzzleStats } from '@/lib/puzzles/progress';

interface Props {
  stats: {
    completedHomework: number;
    classesToday: number;
    activeAssignments: number;
    certificates: number;
    level: string;
    lichess?: any;
  };
}

export default function StudentProgressClient({ stats }: Props) {
  const [puzzleStats, setPuzzleStats] = useState<StudentPuzzleStats | null>(null);

  useEffect(() => {
    setPuzzleStats(getStudentPuzzleStats());
  }, []);

  const totalHomework = stats.completedHomework + stats.activeAssignments;
  const homeworkPercent = totalHomework > 0 ? Math.round((stats.completedHomework / totalHomework) * 100) : 0;
  const currentLevel = (stats.level || 'BEGINNER').toUpperCase();

  const rank = puzzleStats
    ? getStudentRankTitle(puzzleStats.tacticalRating, puzzleStats.xp)
    : { title: 'Pawn Tactician', badge: '♟️', minRating: 800 };

  return (
    <div className="space-y-6">
      {/* 🏆 Overall Mastery Overview Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950/90 border border-slate-800 rounded-3xl p-6 shadow-2xl text-white">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-3xl shadow-gold">
              {rank.badge}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  {rank.title}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {currentLevel} LEVEL
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1">
                Student Learning Dashboard
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Track curriculum milestones, workbook submissions, and tactical ratings progression.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/student/homework"
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition-all shadow-gold"
            >
              📝 Open Workbooks
            </Link>
            <Link
              href="/dashboard/student/puzzles"
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition-all"
            >
              🧩 Solve Puzzles
            </Link>
          </div>
        </div>
      </div>

      {/* Grid Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Card 1: Academy Course Track Progression */}
        <div className="bg-white rounded-3xl border border-border shadow-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <span>🎓</span> Academy Course Track
            </h3>
            <span className="text-xs font-bold px-3 py-1 rounded-full bg-primary/10 text-primary uppercase">
              {currentLevel}
            </span>
          </div>

          {/* Stepper Bar */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs font-semibold text-text-secondary">
              <span>Course Milestone Progress</span>
              <span className="font-bold text-text-primary">
                {currentLevel === 'ADVANCED' ? '100%' : currentLevel === 'INTERMEDIATE' ? '66%' : '33%'}
              </span>
            </div>

            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-gradient-to-r from-primary to-amber-500 h-full rounded-full transition-all duration-500 shadow-sm"
                style={{
                  width: currentLevel === 'ADVANCED' ? '100%' : currentLevel === 'INTERMEDIATE' ? '66%' : '33%',
                }}
              />
            </div>

            <div className="grid grid-cols-3 text-center text-[11px] font-bold text-text-secondary pt-1">
              <div className={currentLevel === 'BEGINNER' ? 'text-primary font-black' : ''}>
                ♟️ Beginner
              </div>
              <div className={currentLevel === 'INTERMEDIATE' ? 'text-primary font-black' : ''}>
                ♞ Intermediate
              </div>
              <div className={currentLevel === 'ADVANCED' ? 'text-primary font-black' : ''}>
                ♜ Advanced
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-border flex items-center justify-between text-xs">
            <span className="text-text-secondary font-medium">Issued Course Certificates:</span>
            <span className="font-bold text-text-primary flex items-center gap-1.5">
              📜 {stats.certificates} Verified Certificate{stats.certificates !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Card 2: Workbook Task Completion */}
        <div className="bg-white rounded-3xl border border-border shadow-card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
              <span>📝</span> Workbook Task Completion
            </h3>
            <span className="text-xs font-bold text-accent">
              {homeworkPercent}% Complete
            </span>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center text-xs font-semibold text-text-secondary">
              <span>Exercises Completed</span>
              <span className="font-bold text-text-primary">
                {stats.completedHomework} / {totalHomework > 0 ? totalHomework : stats.completedHomework} Completed
              </span>
            </div>

            <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-gradient-to-r from-accent to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalHomework > 0 ? homeworkPercent : (stats.completedHomework > 0 ? 100 : 0)}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs pt-1">
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-[10px] text-text-secondary font-bold uppercase block">Completed Tasks</span>
                <span className="text-lg font-extrabold text-green-600 font-mono">{stats.completedHomework}</span>
              </div>
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                <span className="text-[10px] text-text-secondary font-bold uppercase block">Pending Review</span>
                <span className="text-lg font-extrabold text-amber-600 font-mono">{stats.activeAssignments}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Badges & Achievements Grid */}
      <div className="bg-white rounded-3xl border border-border shadow-card p-6 space-y-4">
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
          <span>🏆</span> Earned Achievements & Badges
        </h3>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex flex-col items-center text-center space-y-1">
            <span className="text-3xl">🧩</span>
            <span className="text-xs font-bold text-text-primary">Tactical Visionary</span>
            <span className="text-[10px] text-text-secondary font-semibold">
              {puzzleStats?.totalSolved || 0} Puzzles Solved
            </span>
          </div>

          <div className="p-4 bg-indigo-500/5 border border-indigo-500/20 rounded-2xl flex flex-col items-center text-center space-y-1">
            <span className="text-3xl">🔥</span>
            <span className="text-xs font-bold text-text-primary">Streak Warrior</span>
            <span className="text-[10px] text-text-secondary font-semibold">
              {puzzleStats?.currentStreak || 0} Days Active
            </span>
          </div>

          <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex flex-col items-center text-center space-y-1">
            <span className="text-3xl">🎓</span>
            <span className="text-xs font-bold text-text-primary">Curriculum Master</span>
            <span className="text-[10px] text-text-secondary font-semibold">
              {currentLevel} Course
            </span>
          </div>

          <div className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl flex flex-col items-center text-center space-y-1">
            <span className="text-3xl">⚡</span>
            <span className="text-xs font-bold text-text-primary">Academy XP</span>
            <span className="text-[10px] text-text-secondary font-semibold">
              {puzzleStats?.xp || 0} Points
            </span>
          </div>
        </div>
      </div>

      {/* Lichess / Tactical Rating Performance Tracker */}
      <div className="bg-white rounded-3xl border border-border shadow-card p-6 space-y-4">
        <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
          <span>📊</span> Tactical Rating & Performance
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            <span className="text-[10px] text-text-secondary uppercase font-bold block">Tactical Puzzle Rating</span>
            <span className="text-3xl font-extrabold text-primary font-mono">
              {puzzleStats?.tacticalRating || stats.lichess?.ratings?.puzzle || 1200}
            </span>
            <p className="text-[10px] text-text-secondary">Evaluated via ChessHub Tactical Growth Engine.</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            <span className="text-[10px] text-text-secondary uppercase font-bold block">Lichess Rapid Rating</span>
            <span className="text-3xl font-extrabold text-text-primary font-mono">
              {stats.lichess?.ratings?.rapid || '1200'}
            </span>
            <p className="text-[10px] text-text-secondary">Measures live standard session performance.</p>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1">
            <span className="text-[10px] text-text-secondary uppercase font-bold block">Lichess Blitz Rating</span>
            <span className="text-3xl font-extrabold text-text-primary font-mono">
              {stats.lichess?.ratings?.blitz || '1200'}
            </span>
            <p className="text-[10px] text-text-secondary">Measures speed tactics under time pressure.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
