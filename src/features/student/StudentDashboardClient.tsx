'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import StudentHomeworkQuickSolverModal from './StudentHomeworkQuickSolverModal';
import RecentClassRecordingsWidget, { RecentRecordingData } from './RecentClassRecordingsWidget';
import AiBlunderRadarWidget from './AiBlunderRadarWidget';
import StudentTournamentRatingHub from './StudentTournamentRatingHub';
import DailyStreakWidget from '@/components/dashboard/ui/DailyStreakWidget';
import StudentBattleArena from '@/components/dashboard/ui/StudentBattleArena';
import AcademyAnnouncementBanner from '@/components/dashboard/ui/AcademyAnnouncementBanner';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import ActivityFeed from '@/components/dashboard/ui/ActivityFeed';
import DailyLoginTrigger from '@/components/dashboard/ui/DailyLoginTrigger';
import KidsPetCompanionCard from './KidsPetCompanionCard';
import type { ActivityItem, TableColumn } from '@/types/dashboard';
import type { TournamentItem } from '@/components/dashboard/ui/LichessTournamentManager';

export interface StudentDashboardStats {
  completedHomework: number;
  classesToday: number;
  activeAssignments: number;
  certificates: number;
  completedClasses: number;
  totalEnrolledClasses: number;
  attendanceRate: number;
  level: string;
  xp: number;
  streak: number;
  shields: number;
  todaySolved: boolean;
  todayLoggedIn?: boolean;
  isFirstLoginToday?: boolean;
  loginBonusXp?: number;
  unlockedMilestone?: any;
  solvedDates: string[];
  equippedPet: string;
  equippedGear: string;
  unlockedGear: string[];
  lichess: any;
  nextClass: string;
  puzzleStats: any;
  weakMotifs?: Array<{
    name: string;
    accuracy: number;
    missedCount: number;
    icon: string;
  }>;
  recentRecording?: RecentRecordingData | null;
  liveClass?: {
    id: string;
    title: string;
    classType: string;
    liveSessionId: string;
    startedAt: string;
  } | null;
  botTierInfo?: {
    level: number;
    name: string;
    description: string;
    rating: number;
    avatarIcon: string;
    trainingPoints: number;
    pointsToNext: number;
    nextLevelName: string;
  };
  dailyPuzzlesProgress?: {
    solvedToday: number;
    target: number;
  };
}

interface StudentDashboardClientProps {
  user: {
    id: string;
    firstName: string;
    lastName?: string;
    email?: string;
    role?: string;
  };
  stats: StudentDashboardStats;
  assignments: any[];
  activities: ActivityItem[];
  tournaments: TournamentItem[];
  activeAnnouncement: {
    title: string;
    body: string;
    published_at?: string | null;
  } | null;
}

export default function StudentDashboardClient({
  user,
  stats,
  assignments,
  activities,
  tournaments,
  activeAnnouncement,
}: StudentDashboardClientProps) {
  const [isSolverOpen, setIsSolverOpen] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<string | undefined>(undefined);
  const [dailySolved, setDailySolved] = useState(
    stats.dailyPuzzlesProgress?.solvedToday ?? (stats.todaySolved ? 3 : 0)
  );

  const handleOpenSolver = (theme?: string) => {
    setSelectedTheme(theme);
    setIsSolverOpen(true);
  };

  const handlePuzzleSolved = () => {
    setDailySolved((prev) => Math.min(3, prev + 1));
  };

  const COLUMNS: TableColumn[] = [
    { key: 'category', label: 'Curriculum Focus' },
    { key: 'status', label: 'Progress Track' },
  ];

  const ROWS = assignments.slice(0, 5).map((asgn: any) => ({
    category: (
      <div>
        <span className="font-semibold text-white text-xs block">
          {asgn.workbookTitle || 'Tactics Workbook'}
        </span>
        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wide">
          {asgn.chapterTitle}
        </span>
      </div>
    ),
    status: (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
          asgn.status === 'reviewed'
            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            : asgn.status === 'submitted'
            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            : 'bg-slate-800 text-slate-300 border-slate-700'
        }`}
      >
        {asgn.status}
      </span>
    ),
  }));

  const isLive = !!stats.liveClass;
  const currentLevelNumber = Math.floor(stats.xp / 250) + 1;
  const xpCurrentLevel = stats.xp % 250;
  const xpPercentage = Math.min(100, Math.round((xpCurrentLevel / 250) * 100));

  return (
    <div className="space-y-6 select-none">
      {/* ☀️ Daily Login Streak & Celebration Trigger */}
      <DailyLoginTrigger
        isFirstLoginToday={stats.isFirstLoginToday}
        streak={stats.streak ?? 1}
        xpEarned={stats.loginBonusXp || 15}
        shields={stats.shields ?? 0}
        unlockedMilestone={stats.unlockedMilestone}
        studentName={user?.firstName || 'Champion'}
        equippedPet={stats.equippedPet || 'dragon'}
        studentProfileId={user?.id || ''}
      />

      {/* 👑 TOP UNIFIED STUDENT PROGRESS CARD (Q5) */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-2 border-amber-500/30 rounded-3xl p-6 shadow-2xl">
        {/* Glow ambient background accents */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
          {/* Left: Avatar & Identity */}
          <div className="flex items-center gap-4 text-center lg:text-left w-full lg:w-auto justify-center lg:justify-start">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-purple-500/30 border-2 border-amber-400/60 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(245,158,11,0.3)] flex-shrink-0 animate-bounce-slow">
              {stats.equippedPet === 'lion'
                ? '🦁'
                : stats.equippedPet === 'knight'
                ? '♞'
                : stats.equippedPet === 'phoenix'
                ? '🦅'
                : '🐉'}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 justify-center lg:justify-start flex-wrap">
                <h1 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Welcome back, {user?.firstName || 'Champion'}!
                </h1>
                <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                  Level {currentLevelNumber}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-[10px] font-extrabold">
                  {stats.level}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Academy Rating: <span className="text-amber-400 font-bold font-mono">1280 ELO</span> •{' '}
                {stats.lichess?.username ? (
                  <span className="text-emerald-400 font-medium">
                    Synced with @{stats.lichess.username}
                  </span>
                ) : (
                  <span className="text-slate-500">Lichess Not Connected</span>
                )}
              </p>
            </div>
          </div>

          {/* Center: Streak & Shields */}
          <div className="flex items-center gap-6 bg-slate-950/60 border border-slate-800 px-5 py-3 rounded-2xl">
            <div className="text-center">
              <span className="text-xs text-slate-400 uppercase font-bold block mb-0.5">
                Flame Streak
              </span>
              <div className="flex items-center justify-center gap-1.5 text-amber-400 font-black text-base">
                <span className="animate-pulse">🔥</span>
                <span>{stats.streak} Days</span>
              </div>
            </div>
            <div className="h-8 w-px bg-slate-800" />
            <div className="text-center">
              <span className="text-xs text-slate-400 uppercase font-bold block mb-0.5">
                Shield Protection
              </span>
              <div className="flex items-center justify-center gap-1.5 text-blue-400 font-black text-base">
                <span>🛡️</span>
                <span>{stats.shields} Active</span>
              </div>
            </div>
          </div>

          {/* Right: XP Progress Bar */}
          <div className="w-full lg:w-72 space-y-1.5 bg-slate-950/60 border border-slate-800 p-3 rounded-2xl">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-300">XP to Level {currentLevelNumber + 1}</span>
              <span className="text-amber-400 font-mono">
                {stats.xp} / {currentLevelNumber * 250} XP
              </span>
            </div>
            <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-amber-400 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block text-right">
              {250 - xpCurrentLevel} XP remaining to level up
            </span>
          </div>
        </div>
      </div>

      {/* 📣 Announcement Banner if Active */}
      {activeAnnouncement && (
        <AcademyAnnouncementBanner
          title={activeAnnouncement.title}
          message={activeAnnouncement.body}
          date={
            activeAnnouncement.published_at
              ? new Date(activeAnnouncement.published_at).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
              : undefined
          }
        />
      )}

      {/* ⚡ 4-PILLAR BALANCED COMMAND GRID (Q1, Q2, Q3, Q4) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* PILLAR 1: LIVE CLASS CARD (Q2) */}
        <div
          className={`relative overflow-hidden rounded-3xl p-5 shadow-xl transition-all border-2 flex flex-col justify-between group ${
            isLive
              ? 'bg-gradient-to-br from-emerald-950 via-slate-900 to-slate-950 border-emerald-500 shadow-emerald-900/30'
              : 'bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-800 hover:border-indigo-500/40'
          }`}
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Pillar 1 • Live Class
              </span>
              {isLive ? (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-black uppercase tracking-wide">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  <span>LIVE NOW</span>
                </span>
              ) : (
                <span className="text-[10px] font-bold text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded-full">
                  Scheduled
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${
                  isLive
                    ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 shadow-emerald-900/50 animate-pulse'
                    : 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400'
                }`}
              >
                📹
              </div>
              <div className="overflow-hidden">
                <h3 className="text-sm font-black text-white truncate">
                  {stats.liveClass?.title || 'Interactive Session'}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {isLive ? 'Coach is waiting on board' : stats.nextClass || 'No class today'}
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link
              href="/dashboard/student/classes"
              className={`w-full py-2.5 px-4 font-black text-xs rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wider ${
                isLive
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-900/50 animate-pulse'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700'
              }`}
            >
              <span>{isLive ? 'JOIN LIVE CLASS' : 'ENTER CLASSROOM'}</span>
              <span>➔</span>
            </Link>
          </div>
        </div>

        {/* PILLAR 2: HOMEWORK CARD (Q3) */}
        <div className="relative overflow-hidden rounded-3xl p-5 shadow-xl transition-all border-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-800 hover:border-amber-500/40 flex flex-col justify-between group">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Pillar 2 • Tactical Homework
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase">
                {stats.activeAssignments} Active
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl flex-shrink-0 shadow-gold">
                🧩
              </div>
              <div className="w-full space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Daily Puzzles</span>
                  <span className="font-mono text-amber-400 font-bold">{dailySolved}/3 Solved</span>
                </div>
                <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(100, (dailySolved / 3) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <button
              type="button"
              onClick={() => handleOpenSolver()}
              className="w-full py-2.5 px-4 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs rounded-xl shadow-gold flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
            >
              <span>SOLVE PUZZLES</span>
              <span>➔</span>
            </button>
          </div>
        </div>

        {/* PILLAR 3: BOT TRAINING CARD (Q4) */}
        <div className="relative overflow-hidden rounded-3xl p-5 shadow-xl transition-all border-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-800 hover:border-purple-500/40 flex flex-col justify-between group">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Pillar 3 • Bot Arena
              </span>
              <span className="px-2 py-0.5 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase">
                Tier {stats.botTierInfo?.level || 1}
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/30 text-purple-400 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                {stats.botTierInfo?.avatarIcon || '♟️'}
              </div>
              <div className="overflow-hidden">
                <h3 className="text-sm font-black text-white truncate">
                  {stats.botTierInfo?.name || 'Level 1 — Pawn'}
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  {stats.botTierInfo?.rating || 400} ELO • {stats.botTierInfo?.pointsToNext || 400}{' '}
                  pts to next tier
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link
              href="/dashboard/student/bot-training"
              className="w-full py-2.5 px-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
            >
              <span>QUICK MATCH</span>
              <span>➔</span>
            </Link>
          </div>
        </div>

        {/* PILLAR 4: ACADEMY STANDINGS & STATS CARD (Q1) */}
        <div className="relative overflow-hidden rounded-3xl p-5 shadow-xl transition-all border-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-slate-800 hover:border-blue-500/40 flex flex-col justify-between group">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                Pillar 4 • Standings
              </span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/20 border border-blue-500/30 text-blue-300 text-[10px] font-black uppercase">
                {stats.attendanceRate || 100}% Attendance
              </span>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                🏆
              </div>
              <div className="overflow-hidden">
                <h3 className="text-sm font-black text-white truncate">
                  {stats.completedClasses || 0} Sessions Completed
                </h3>
                <p className="text-xs text-slate-400 truncate">
                  Solve Rate: {stats.puzzleStats?.solveRate || 85}% • {stats.certificates || 0} Awards
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4">
            <Link
              href="/dashboard/student/progress"
              className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white border border-slate-700 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition-all uppercase tracking-wider"
            >
              <span>VIEW STANDINGS</span>
              <span>➔</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 🎯 AI BLUNDER RADAR & KIDS CHESS PLAYGROUND (Q7) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AiBlunderRadarWidget
          weakMotifs={stats.weakMotifs || []}
          onStartRetry={(motifName) => handleOpenSolver(motifName)}
        />

        {/* 🎮 Kids Chess Playground Action Banner */}
        <div className="relative overflow-hidden rounded-3xl border-2 border-amber-400/50 bg-gradient-to-r from-slate-950 via-indigo-950 to-amber-950/80 p-6 shadow-[0_0_35px_rgba(245,158,11,0.15)] flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-2xl shadow-gold">
                🎮
              </span>
              <div>
                <h3 className="text-base font-black text-white tracking-wide">
                  Kids Chess Playground &amp; Hero Quests
                </h3>
                <span className="text-xs text-slate-400 font-medium">
                  Conquer Knight’s Star Maze, Pawn Sprint, and unlock Companion Gear!
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2 text-[11px] text-amber-300 font-bold flex-wrap">
              <span>⭐ 4 Chapters</span>
              <span>•</span>
              <span>🎯 20 Interactive Levels</span>
              <span>•</span>
              <span>⚡ Earn Real Academy XP</span>
            </div>
          </div>

          <div className="pt-4">
            <Link
              href="/dashboard/student/playground"
              className="w-full py-3 bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-300 hover:via-yellow-300 hover:to-orange-400 text-slate-950 font-black text-xs md:text-sm rounded-2xl shadow-gold flex items-center justify-center gap-2 transition-all"
            >
              <span>PLAY MINIGAMES ARCADE</span>
              <span>➔</span>
            </Link>
          </div>
        </div>
      </div>

      {/* ♞ LICHESS & TOURNAMENT HUB (Q6) */}
      <StudentTournamentRatingHub
        studentId={user.id}
        initialLichess={stats.lichess}
        tournaments={tournaments}
      />

      {/* 📹 RECENT CLASS VAULT & COACH FEEDBACK (Q8) */}
      <RecentClassRecordingsWidget recording={stats.recentRecording} />

      {/* 🦁 Kids Companion & Pet Avatar Customizer */}
      <KidsPetCompanionCard
        studentXp={stats.xp ?? 0}
        studentName={user?.firstName || 'Champion'}
        initialPetId={stats.equippedPet || 'dragon'}
        initialGearId={stats.equippedGear || 'none'}
        initialUnlockedGear={stats.unlockedGear || ['none']}
      />

      {/* 🏆 Daily Streak Habit Tracker & ⚔️ 1v1 Speed Duel Arena */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyStreakWidget
          currentStreak={stats.streak ?? 1}
          totalXp={stats.xp ?? 0}
          shields={stats.shields ?? 0}
          todaySolved={stats.todaySolved ?? false}
          todayLoggedIn={stats.todayLoggedIn ?? true}
          solvedDates={stats.solvedDates ?? []}
          equippedPet={stats.equippedPet || 'dragon'}
        />
        <StudentBattleArena studentName={user?.firstName || 'Champion'} />
      </div>

      {/* 📜 TABLES & ACTIVITY FEED (Q9) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-4">
        <div className="lg:col-span-2">
          <DashboardTable
            columns={COLUMNS}
            rows={ROWS}
            emptyTitle="No Active Homework Tasks"
            emptyDescription="Your coach will assign tactical chapters and exercises. Check back after your next session."
            caption="Overview of current curriculum tracks"
          />
        </div>
        <div>
          <ActivityFeed items={activities} />
        </div>
      </div>

      {/* 🧩 Interactive Tactical Homework Quick Solver Modal */}
      <StudentHomeworkQuickSolverModal
        isOpen={isSolverOpen}
        onClose={() => setIsSolverOpen(false)}
        initialTheme={selectedTheme}
        onPuzzleSolved={handlePuzzleSolved}
      />
    </div>
  );
}
