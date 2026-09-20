'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import StudentHomeworkQuickSolverModal from './StudentHomeworkQuickSolverModal';
import RecentClassRecordingsWidget, { RecentRecordingData } from './RecentClassRecordingsWidget';
import AiBlunderRadarWidget from './AiBlunderRadarWidget';
import StudentTournamentRatingHub from './StudentTournamentRatingHub';
import StudentBattleArena from '@/components/dashboard/ui/StudentBattleArena';
import AcademyAnnouncementBanner from '@/components/dashboard/ui/AcademyAnnouncementBanner';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import ActivityFeed from '@/components/dashboard/ui/ActivityFeed';
import DailyLoginTrigger from '@/components/dashboard/ui/DailyLoginTrigger';
import KidsPetCompanionCard from './KidsPetCompanionCard';
import DailyStreakWidget from '@/components/dashboard/ui/DailyStreakWidget';
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

type TabKey = 'today' | 'practice' | 'progress';

export default function StudentDashboardClient({
  user,
  stats,
  assignments,
  activities,
  tournaments,
  activeAnnouncement,
}: StudentDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('today');
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

  const isLive = !!stats.liveClass;
  const currentLevelNumber = Math.floor(stats.xp / 250) + 1;
  const xpCurrentLevel = stats.xp % 250;
  const xpPercentage = Math.min(100, Math.round((xpCurrentLevel / 250) * 100));

  // Dynamic Rating logic to avoid hardcoded 1280 ELO
  const lichessRating =
    stats.lichess?.ratings?.rapid ||
    stats.lichess?.ratings?.blitz ||
    stats.lichess?.ratings?.classical;
  const displayRating = lichessRating
    ? `${lichessRating} ELO (Lichess)`
    : stats.botTierInfo?.rating
    ? `${stats.botTierInfo.rating} ELO (Academy Tier)`
    : `${stats.level || 'Intermediate'}`;

  // Daily Mission calculation
  const missionTasks = [
    {
      id: 'live-class',
      title: isLive ? 'Attend Live Class (In Progress)' : 'Attend Next Scheduled Session',
      status: isLive ? 'ready' : stats.classesToday > 0 ? 'completed' : 'pending',
      actionLabel: isLive ? 'Join Live' : 'View Classes',
      actionHref: '/dashboard/student/classes',
      isCompleted: stats.classesToday > 0,
    },
    {
      id: 'homework',
      title: 'Complete Coach Assignments',
      status: assignments.length === 0 ? 'completed' : `${stats.activeAssignments || assignments.length} Pending`,
      actionLabel: 'Solve Homework',
      actionHref: '/dashboard/student/homework',
      isCompleted: assignments.length === 0 || assignments.every((a: any) => a.status === 'submitted' || a.status === 'reviewed'),
    },
    {
      id: 'puzzles',
      title: 'Solve 3 Daily Tactics Challenge',
      status: `${dailySolved}/3 Solved`,
      actionLabel: dailySolved >= 3 ? 'Completed' : 'Solve Puzzles',
      onClick: () => handleOpenSolver(),
      isCompleted: dailySolved >= 3,
    },
  ];

  const completedMissionsCount = missionTasks.filter((t) => t.isCompleted).length;

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

  return (
    <div className="space-y-6 select-none pb-12">
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

      {/* 👑 TOP UNIFIED STUDENT HEADER CARD */}
      <div className="relative overflow-hidden bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 border-2 border-amber-500/30 rounded-3xl p-6 shadow-2xl">
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
                Rating: <span className="text-amber-400 font-bold font-mono">{displayRating}</span> •{' '}
                {stats.lichess?.username ? (
                  <span className="text-emerald-400 font-medium">
                    Synced with @{stats.lichess.username}
                  </span>
                ) : (
                  <Link href="/dashboard/student/settings" className="text-slate-400 hover:text-amber-300 underline transition-colors">
                    Connect Lichess
                  </Link>
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

      {/* 🧭 MODERN 3-TAB NAVIGATION BAR */}
      <div className="flex items-center justify-center sm:justify-start gap-2 border-b border-slate-800/80 pb-3 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-black text-xs md:text-sm tracking-wide transition-all ${
            activeTab === 'today'
              ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-lg shadow-amber-500/20 scale-100'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <span className="text-base">🎯</span>
          <span>Today&apos;s Focus</span>
          {isLive ? (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black animate-pulse">
              LIVE
            </span>
          ) : stats.activeAssignments > 0 ? (
            <span className="px-1.5 py-0.5 rounded-full bg-slate-950/40 text-slate-900 text-[10px] font-bold">
              {stats.activeAssignments}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('practice')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-black text-xs md:text-sm tracking-wide transition-all ${
            activeTab === 'practice'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/25 scale-100'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <span className="text-base">♟️</span>
          <span>Practice &amp; Games</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold hidden sm:inline-block">
            Bots &amp; Arcade
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2.5 px-5 py-3 rounded-2xl font-black text-xs md:text-sm tracking-wide transition-all ${
            activeTab === 'progress'
              ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-600/25 scale-100'
              : 'bg-slate-900/80 text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800'
          }`}
        >
          <span className="text-base">📊</span>
          <span>My Progress &amp; Vault</span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-bold hidden sm:inline-block">
            Ratings &amp; Recordings
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 🎯 TAB 1: TODAY'S FOCUS                                                   */}
      {/* ========================================================================= */}
      {activeTab === 'today' && (
        <div className="space-y-6 animate-fadeIn">
          {/* 1. HERO CLASS CARD */}
          <div
            className={`relative overflow-hidden rounded-3xl p-6 border-2 transition-all shadow-xl ${
              isLive
                ? 'bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-950 border-emerald-500 shadow-emerald-950/40'
                : 'bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-950 border-slate-800'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl flex-shrink-0 ${
                    isLive
                      ? 'bg-emerald-500/20 border-2 border-emerald-500/40 text-emerald-300 animate-pulse'
                      : 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-400'
                  }`}
                >
                  📹
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Live Classroom
                    </span>
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[10px] font-black uppercase tracking-wide">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                        <span>LIVE NOW</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
                        Next Session
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg md:text-xl font-black text-white mt-1">
                    {stats.liveClass?.title || 'Interactive Session with Coach'}
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {isLive
                      ? 'Your coach is live on the board! Join the session now.'
                      : stats.nextClass !== 'None'
                      ? `Scheduled: ${stats.nextClass}`
                      : 'No live classes scheduled for today. Explore homework or practice bots!'}
                  </p>
                </div>
              </div>

              <div className="w-full md:w-auto">
                <Link
                  href="/dashboard/student/classes"
                  className={`w-full md:w-auto px-6 py-3 font-black text-xs md:text-sm rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all uppercase tracking-wider ${
                    isLive
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-900/50 animate-pulse'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                  }`}
                >
                  <span>{isLive ? 'JOIN LIVE CLASSROOM' : 'VIEW CLASS SCHEDULE'}</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>
          </div>

          {/* 2. SIDE-BY-SIDE: COACH HOMEWORK & DAILY TACTICS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARD A: COACH ASSIGNMENTS */}
            <div className="rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl text-amber-400">
                      📚
                    </span>
                    <div>
                      <h3 className="text-base font-black text-white">Coach Homework</h3>
                      <p className="text-[11px] text-slate-400">Assigned curriculum chapters</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-black">
                    {stats.activeAssignments} Active
                  </span>
                </div>

                {assignments.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    {assignments.slice(0, 2).map((asgn: any) => (
                      <div
                        key={asgn.id || asgn.chapterTitle}
                        className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-3"
                      >
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-white truncate">
                            {asgn.chapterTitle || 'Chapter Practice'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">
                            {asgn.workbookTitle || 'Curriculum Workbook'}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border flex-shrink-0 ${
                            asgn.status === 'reviewed'
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                              : asgn.status === 'submitted'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {asgn.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-4 text-center text-xs text-slate-400">
                    🎉 All caught up! No pending homework from your coach.
                  </div>
                )}
              </div>

              <div className="pt-5">
                <Link
                  href="/dashboard/student/homework"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-gold flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                >
                  <span>OPEN HOMEWORK CENTER</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            {/* CARD B: DAILY 3-PUZZLE TACTICS */}
            <div className="rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 flex flex-col justify-between shadow-xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-xl text-purple-400">
                      🧩
                    </span>
                    <div>
                      <h3 className="text-base font-black text-white">Daily Tactics Challenge</h3>
                      <p className="text-[11px] text-slate-400">Solve 3 puzzles to protect your streak</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-400 text-xs px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800">
                    {dailySolved}/3 Solved
                  </span>
                </div>

                <div className="space-y-2 pt-2 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-bold">Daily Tactics Progress</span>
                    <span className="text-emerald-400 font-bold">
                      {dailySolved >= 3 ? '✅ Daily Goal Reached!' : `${3 - dailySolved} remaining`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-900 h-2.5 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (dailySolved / 3) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Earn +25 Academy XP &amp; keep your {stats.streak}-day streak alive!
                  </p>
                </div>
              </div>

              <div className="pt-5">
                <button
                  type="button"
                  onClick={() => handleOpenSolver()}
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-900/30 flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                >
                  <span>{dailySolved >= 3 ? 'PRACTICE MORE TACTICS' : 'SOLVE TODAY’S PUZZLES'}</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          </div>

          {/* 3. TODAY'S MISSION CHECKLIST & RECENT ACTIVITIES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* MISSION CHECKLIST */}
            <div className="lg:col-span-2 rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-black text-white">Daily Mission Checklist</h3>
                  <p className="text-xs text-slate-400">Complete all 3 tasks to maximize your daily XP</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-black">
                  {completedMissionsCount}/3 Completed
                </span>
              </div>

              <div className="space-y-3 pt-2">
                {missionTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between gap-4 transition-all ${
                      task.isCompleted
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                        : 'bg-slate-950/60 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-lg">
                        {task.isCompleted ? '✅' : '⚪'}
                      </span>
                      <div>
                        <p className={`text-xs font-black ${task.isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                          {task.title}
                        </p>
                        <p className="text-[10px] text-slate-400">{task.status}</p>
                      </div>
                    </div>

                    <div>
                      {task.actionHref ? (
                        <Link
                          href={task.actionHref}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold transition-all"
                        >
                          {task.actionLabel}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={task.onClick}
                          className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold transition-all"
                        >
                          {task.actionLabel}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RECENT ACTIVITY */}
            <div className="rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-xl">
              <ActivityFeed items={activities} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ♟️ TAB 2: PRACTICE & GAMES                                                */}
      {/* ========================================================================= */}
      {activeTab === 'practice' && (
        <div className="space-y-6 animate-fadeIn">
          {/* 4 FEATURED PRACTICE CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* CARD 1: BOT TRAINING */}
            <div className="rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 flex flex-col justify-between shadow-xl hover:border-purple-500/40 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Sparring Bots
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
                      {stats.botTierInfo?.rating || 400} ELO • {stats.botTierInfo?.pointsToNext || 400} pts to next tier
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                <Link
                  href="/dashboard/student/bot-training"
                  className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs rounded-xl shadow-lg shadow-purple-900/40 flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                >
                  <span>CHALLENGE BOT</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            {/* CARD 2: AI OPENING TEACHER */}
            <div className="rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 flex flex-col justify-between shadow-xl hover:border-emerald-500/40 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Repertoire Training
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-[10px] font-black uppercase">
                    AI Coach
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                    🧠
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-sm font-black text-white truncate">
                      AI Opening Teacher
                    </h3>
                    <p className="text-xs text-slate-400 truncate">
                      Master opening variations with step-by-step guidance
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                <Link
                  href="/dashboard/student/openings"
                  className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-900/40 flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                >
                  <span>TRAIN OPENINGS</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            {/* CARD 3: KIDS CHESS PLAYGROUND ARCADE */}
            <div className="rounded-3xl border-2 border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 flex flex-col justify-between shadow-xl hover:border-amber-500/40 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Minigames Arcade
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-[10px] font-black uppercase">
                    Hero Quests
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl flex-shrink-0 shadow-md">
                    🎮
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-sm font-black text-white truncate">
                      Kids Chess Playground
                    </h3>
                    <p className="text-xs text-slate-400 truncate">
                      Knight Maze, Pawn Sprint &amp; earn companion gear
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-5">
                <Link
                  href="/dashboard/student/playground"
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs rounded-xl shadow-gold flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                >
                  <span>PLAY MINIGAMES</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>
          </div>

          {/* AI BLUNDER RADAR & 1V1 SPEED DUEL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <AiBlunderRadarWidget
              weakMotifs={stats.weakMotifs || []}
              onStartRetry={(motifName) => handleOpenSolver(motifName)}
            />
            <StudentBattleArena studentName={user?.firstName || 'Champion'} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📊 TAB 3: MY PROGRESS & VAULT                                             */}
      {/* ========================================================================= */}
      {activeTab === 'progress' && (
        <div className="space-y-6 animate-fadeIn">
          {/* STANDINGS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
              <span className="text-xs text-slate-400 font-bold block uppercase">Attendance Rate</span>
              <p className="text-2xl font-black text-white mt-1">{stats.attendanceRate || 100}%</p>
              <span className="text-[10px] text-emerald-400 mt-1 block">Excellent consistency</span>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
              <span className="text-xs text-slate-400 font-bold block uppercase">Sessions Completed</span>
              <p className="text-2xl font-black text-white mt-1">{stats.completedClasses || 0}</p>
              <span className="text-[10px] text-indigo-400 mt-1 block">Classroom lectures</span>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
              <span className="text-xs text-slate-400 font-bold block uppercase">Tactics Solve Rate</span>
              <p className="text-2xl font-black text-white mt-1">{stats.puzzleStats?.solveRate || 85}%</p>
              <span className="text-[10px] text-amber-400 mt-1 block">Based on solved puzzles</span>
            </div>
            <div className="rounded-2xl bg-slate-900/80 border border-slate-800 p-5">
              <span className="text-xs text-slate-400 font-bold block uppercase">Certificates Earned</span>
              <p className="text-2xl font-black text-white mt-1">{stats.certificates || 0}</p>
              <span className="text-[10px] text-cyan-400 mt-1 block">Academy milestones</span>
            </div>
          </div>

          {/* LICHESS & TOURNAMENT HUB */}
          <StudentTournamentRatingHub
            studentId={user.id}
            initialLichess={stats.lichess}
            tournaments={tournaments}
          />

          {/* RECENT RECORDINGS VAULT */}
          <RecentClassRecordingsWidget recording={stats.recentRecording} />

          {/* PET COMPANION & HABIT TRACKER */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <KidsPetCompanionCard
              studentXp={stats.xp ?? 0}
              studentName={user?.firstName || 'Champion'}
              initialPetId={stats.equippedPet || 'dragon'}
              initialGearId={stats.equippedGear || 'none'}
              initialUnlockedGear={stats.unlockedGear || ['none']}
            />
            <DailyStreakWidget
              currentStreak={stats.streak ?? 1}
              totalXp={stats.xp ?? 0}
              shields={stats.shields ?? 0}
              todaySolved={stats.todaySolved ?? false}
              todayLoggedIn={stats.todayLoggedIn ?? true}
              solvedDates={stats.solvedDates ?? []}
              equippedPet={stats.equippedPet || 'dragon'}
            />
          </div>

          {/* CURRICULUM TABLE */}
          <div className="rounded-3xl border-2 border-slate-800 bg-slate-900/60 p-6 shadow-xl">
            <DashboardTable
              columns={COLUMNS}
              rows={ROWS}
              emptyTitle="No Active Homework Tasks"
              emptyDescription="Your coach will assign tactical chapters and exercises. Check back after your next session."
              caption="Overview of current curriculum tracks"
            />
          </div>
        </div>
      )}

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
