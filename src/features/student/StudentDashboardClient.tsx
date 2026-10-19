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
import StudentSessionBalanceWidget from './StudentSessionBalanceWidget';
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

      {/* 👑 TOP STREAMLINED STUDENT HEADER CARD (LIGHT & AIRY) */}
      <div className="bg-white border border-slate-200/90 rounded-2xl p-4 sm:p-5 shadow-xs transition-all">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-4 sm:gap-6">
          {/* Left: Avatar & Identity */}
          <div className="flex items-center gap-3.5 w-full lg:w-auto">
            <div className="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-center text-2xl shadow-xs shrink-0">
              {stats.equippedPet === 'lion'
                ? '🦁'
                : stats.equippedPet === 'knight'
                ? '♞'
                : stats.equippedPet === 'phoenix'
                ? '🦅'
                : '🐉'}
            </div>
            <div className="min-w-0 space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
                  Welcome back, {user?.firstName || 'Champion'}!
                </h1>
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-extrabold uppercase tracking-wider">
                  Level {currentLevelNumber}
                </span>
                <span className="px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">
                  {stats.level}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Rating: <span className="text-slate-900 font-bold font-mono">{displayRating}</span> •{' '}
                {stats.lichess?.username ? (
                  <span className="text-emerald-700 font-semibold">
                    Synced with @{stats.lichess.username}
                  </span>
                ) : (
                  <Link href="/dashboard/student/settings" className="text-primary hover:underline font-semibold transition-colors">
                    Connect Lichess
                  </Link>
                )}
              </p>
            </div>
          </div>

          {/* Center: Streak & Shields */}
          <div className="flex items-center gap-4 sm:gap-6 bg-slate-50 border border-slate-200/80 px-4 py-2 rounded-xl w-full sm:w-auto justify-around">
            <div className="text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Streak
              </span>
              <div className="flex items-center justify-center gap-1 text-amber-600 font-black text-sm">
                <span>🔥</span>
                <span>{stats.streak} Days</span>
              </div>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div className="text-center">
              <span className="text-[10px] text-slate-500 uppercase font-bold block">
                Shields
              </span>
              <div className="flex items-center justify-center gap-1 text-blue-600 font-black text-sm">
                <span>🛡️</span>
                <span>{stats.shields} Active</span>
              </div>
            </div>
          </div>

          {/* Right: XP Progress Bar */}
          <div className="w-full lg:w-64 space-y-1.5 bg-slate-50 border border-slate-200/80 p-2.5 rounded-xl">
            <div className="flex items-center justify-between text-xs font-bold">
              <span className="text-slate-600 text-[11px]">XP to Level {currentLevelNumber + 1}</span>
              <span className="text-amber-700 font-mono text-[11px]">
                {stats.xp} / {currentLevelNumber * 250} XP
              </span>
            </div>
            <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
              <div
                className="bg-gradient-to-r from-amber-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${xpPercentage}%` }}
              />
            </div>
            <span className="text-[10px] text-slate-400 block text-right">
              {250 - xpCurrentLevel} XP to level up
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

      {/* 🧭 MODERN LIGHT SEGMENTED CONTROL TABS */}
      <div className="bg-slate-100 p-1 rounded-2xl flex items-center gap-1 border border-slate-200/80 w-fit max-w-full overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab('today')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'today'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>🎯</span>
          <span>Today&apos;s Focus</span>
          {isLive ? (
            <span className="px-1.5 py-0.2 rounded-full bg-red-500 text-white text-[9px] font-black animate-pulse">
              LIVE
            </span>
          ) : stats.activeAssignments > 0 ? (
            <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold">
              {stats.activeAssignments}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('practice')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'practice'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>♟️</span>
          <span>Practice &amp; Games</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('progress')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs transition-all whitespace-nowrap ${
            activeTab === 'progress'
              ? 'bg-white text-slate-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <span>📊</span>
          <span>My Progress &amp; Vault</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* 🎯 TAB 1: TODAY'S FOCUS                                                   */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 🎯 TAB 1: TODAY'S FOCUS (LIGHT & AIRY)                                    */}
      {/* ========================================================================= */}
      {activeTab === 'today' && (
        <div className="space-y-5 animate-fadeIn">
          {/* 1. HERO CLASS CARD */}
          <div
            className={`rounded-2xl p-5 border transition-all shadow-xs ${
              isLive
                ? 'bg-emerald-50/80 border-emerald-300 ring-1 ring-emerald-300/50'
                : 'bg-white border-slate-200/90'
            }`}
          >
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0 ${
                    isLive
                      ? 'bg-emerald-100 border border-emerald-300 text-emerald-700 animate-pulse'
                      : 'bg-indigo-50 border border-indigo-200 text-indigo-600'
                  }`}
                >
                  📹
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                      Live Classroom
                    </span>
                    {isLive ? (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-100 border border-red-200 text-red-700 text-[10px] font-black uppercase tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-ping" />
                        <span>LIVE NOW</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                        Next Session
                      </span>
                    )}
                  </div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                    {stats.liveClass?.title || 'Interactive Session with Coach'}
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
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
                  className={`w-full md:w-auto px-5 py-2.5 font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all uppercase tracking-wider ${
                    isLive
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white animate-pulse'
                      : 'bg-primary hover:bg-primary-dark text-white'
                  }`}
                >
                  <span>{isLive ? 'JOIN LIVE CLASSROOM' : 'VIEW CLASS SCHEDULE'}</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>
          </div>

          {/* 1.5 SESSION WALLET & BALANCE TOP-UP */}
          <StudentSessionBalanceWidget />

          {/* 2. SIDE-BY-SIDE: COACH HOMEWORK & DAILY TACTICS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* CARD A: COACH ASSIGNMENTS */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-xs">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200/70 flex items-center justify-center text-lg text-amber-600">
                      📚
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Coach Homework</h3>
                      <p className="text-[11px] text-slate-500">Assigned curriculum chapters</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-extrabold">
                    {stats.activeAssignments} Active
                  </span>
                </div>

                {assignments.length > 0 ? (
                  <div className="space-y-2 pt-1">
                    {assignments.slice(0, 2).map((asgn: any) => (
                      <div
                        key={asgn.id || asgn.chapterTitle}
                        className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 flex items-center justify-between gap-3"
                      >
                        <div className="overflow-hidden">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {asgn.chapterTitle || 'Chapter Practice'}
                          </p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {asgn.workbookTitle || 'Curriculum Workbook'}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                            asgn.status === 'reviewed'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                              : asgn.status === 'submitted'
                              ? 'bg-amber-100 text-amber-800 border-amber-200'
                              : 'bg-slate-200 text-slate-700 border-slate-300'
                          }`}
                        >
                          {asgn.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-3.5 text-center text-xs text-slate-500">
                    🎉 All caught up! No pending homework from your coach.
                  </div>
                )}
              </div>

              <div className="pt-4">
                <Link
                  href="/dashboard/student/homework"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                >
                  <span>OPEN HOMEWORK CENTER</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            {/* CARD B: DAILY 3-PUZZLE TACTICS */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-xs">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200/70 flex items-center justify-center text-lg text-purple-600">
                      🧩
                    </span>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Daily Tactics Challenge</h3>
                      <p className="text-[11px] text-slate-500">Solve 3 puzzles to protect your streak</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-amber-800 text-xs px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200">
                    {dailySolved}/3 Solved
                  </span>
                </div>

                <div className="space-y-2 pt-1 bg-slate-50 border border-slate-200/70 rounded-xl p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-700 font-bold">Daily Tactics Progress</span>
                    <span className="text-emerald-700 font-bold">
                      {dailySolved >= 3 ? '✅ Goal Reached!' : `${3 - dailySolved} remaining`}
                    </span>
                  </div>
                  <div className="w-full bg-slate-200/80 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-amber-500 to-yellow-400 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, (dailySolved / 3) * 100)}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Earn +25 Academy XP &amp; keep your {stats.streak}-day streak alive!
                  </p>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="button"
                  onClick={() => handleOpenSolver()}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                >
                  <span>{dailySolved >= 3 ? 'PRACTICE MORE TACTICS' : 'SOLVE TODAY’S PUZZLES'}</span>
                  <span>➔</span>
                </button>
              </div>
            </div>
          </div>

          {/* ACADEMY LEADERBOARD BANNER */}
          <div className="rounded-2xl border border-amber-200/80 bg-amber-50/70 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-xl text-amber-700 shadow-xs shrink-0">
                🏆
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded-full border border-amber-300/60">
                    Live Standings
                  </span>
                  <span className="text-xs text-slate-500">• Academy Hub</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                  Academy Student Leaderboard
                </h3>
                <p className="text-xs text-slate-600 font-medium">
                  See how you rank across Overall XP, Tactics Solved, Homework, and Rating against enrolled peers!
                </p>
              </div>
            </div>
            <Link
              href="/dashboard/student/leaderboard"
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center gap-2 shadow-xs transition-all shrink-0 self-stretch sm:self-auto justify-center"
            >
              <span>VIEW LEADERBOARD</span>
              <span>➔</span>
            </Link>
          </div>

          {/* 3. TODAY'S MISSION CHECKLIST & RECENT ACTIVITIES */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            {/* MISSION CHECKLIST */}
            <div className="lg:col-span-2 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Daily Mission Checklist</h3>
                  <p className="text-xs text-slate-500">Complete all 3 tasks to maximize your daily XP</p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-bold">
                  {completedMissionsCount}/3 Completed
                </span>
              </div>

              <div className="space-y-2 pt-1">
                {missionTasks.map((task) => (
                  <div
                    key={task.id}
                    className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-all ${
                      task.isCompleted
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-900'
                        : 'bg-slate-50 border-slate-200/80 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">
                        {task.isCompleted ? '✅' : '⚪'}
                      </span>
                      <div>
                        <p className={`text-xs font-bold ${task.isCompleted ? 'line-through text-slate-400' : 'text-slate-900'}`}>
                          {task.title}
                        </p>
                        <p className="text-[10px] text-slate-500">{task.status}</p>
                      </div>
                    </div>

                    <div>
                      {task.actionHref ? (
                        <Link
                          href={task.actionHref}
                          className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-[11px] font-bold shadow-xs transition-all"
                        >
                          {task.actionLabel}
                        </Link>
                      ) : (
                        <button
                          type="button"
                          onClick={task.onClick}
                          className="px-3 py-1 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-800 text-[11px] font-bold shadow-xs transition-all"
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
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
              <ActivityFeed items={activities} />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ♟️ TAB 2: PRACTICE & GAMES (LIGHT & AIRY)                                 */}
      {/* ========================================================================= */}
      {activeTab === 'practice' && (
        <div className="space-y-5 animate-fadeIn">
          {/* 3 FEATURED PRACTICE CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* CARD 1: BOT TRAINING */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-xs hover:border-purple-300 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Sparring Bots
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-purple-100 border border-purple-200 text-purple-800 text-[10px] font-extrabold uppercase">
                    Tier {stats.botTierInfo?.level || 1}
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-11 h-11 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center text-xl shrink-0 shadow-xs">
                    {stats.botTierInfo?.avatarIcon || '♟️'}
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      {stats.botTierInfo?.name || 'Level 1 — Pawn'}
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      {stats.botTierInfo?.rating || 400} ELO • {stats.botTierInfo?.pointsToNext || 400} pts to next tier
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/dashboard/student/bot-training"
                  className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                >
                  <span>CHALLENGE BOT</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            {/* CARD 2: AI OPENING TEACHER */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-xs hover:border-emerald-300 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Repertoire Training
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-emerald-100 border border-emerald-200 text-emerald-800 text-[10px] font-extrabold uppercase">
                    AI Coach
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-xl shrink-0 shadow-xs">
                    🧠
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      AI Opening Teacher
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      Master opening variations with step-by-step guidance
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/dashboard/student/openings"
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                >
                  <span>TRAIN OPENINGS</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>

            {/* CARD 3: KIDS CHESS PLAYGROUND ARCADE */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 flex flex-col justify-between shadow-xs hover:border-amber-300 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Minigames Arcade
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 border border-amber-200 text-amber-800 text-[10px] font-extrabold uppercase">
                    Hero Quests
                  </span>
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <div className="w-11 h-11 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-xl shrink-0 shadow-xs">
                    🎮
                  </div>
                  <div className="overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-900 truncate">
                      Kids Chess Playground
                    </h3>
                    <p className="text-xs text-slate-500 truncate">
                      Knight Maze, Pawn Sprint &amp; earn companion gear
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4">
                <Link
                  href="/dashboard/student/playground"
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl shadow-xs flex items-center justify-center gap-2 uppercase tracking-wider transition-all"
                >
                  <span>PLAY MINIGAMES</span>
                  <span>➔</span>
                </Link>
              </div>
            </div>
          </div>

          {/* AI BLUNDER RADAR & 1V1 SPEED DUEL */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <AiBlunderRadarWidget
              weakMotifs={stats.weakMotifs || []}
              onStartRetry={(motifName) => handleOpenSolver(motifName)}
            />
            <StudentBattleArena studentName={user?.firstName || 'Champion'} />
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 📊 TAB 3: MY PROGRESS & VAULT (LIGHT & AIRY)                              */}
      {/* ========================================================================= */}
      {activeTab === 'progress' && (
        <div className="space-y-5 animate-fadeIn">
          {/* STANDINGS OVERVIEW CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Attendance Rate</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.attendanceRate || 100}%</p>
              <span className="text-[10px] text-emerald-700 font-semibold mt-0.5 block">Excellent consistency</span>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Sessions Completed</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.completedClasses || 0}</p>
              <span className="text-[10px] text-indigo-700 font-semibold mt-0.5 block">Classroom lectures</span>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Tactics Solve Rate</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.puzzleStats?.solveRate || 85}%</p>
              <span className="text-[10px] text-amber-700 font-semibold mt-0.5 block">Based on solved puzzles</span>
            </div>
            <div className="rounded-2xl bg-white border border-slate-200/90 p-4 shadow-xs">
              <span className="text-[11px] text-slate-500 font-bold block uppercase">Certificates Earned</span>
              <p className="text-2xl font-black text-slate-900 mt-1">{stats.certificates || 0}</p>
              <span className="text-[10px] text-cyan-700 font-semibold mt-0.5 block">Academy milestones</span>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
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
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs">
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
