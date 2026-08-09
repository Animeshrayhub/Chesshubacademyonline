import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import StatCard from '@/components/dashboard/ui/StatCard';
import QuickActionCard from '@/components/dashboard/ui/QuickActionCard';
import ActivityFeed from '@/components/dashboard/ui/ActivityFeed';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import { getStudentDashboardStats, getStudentHomework } from '@/lib/students';
import { getCurrentUser } from '@/lib/supabase/auth';
import type { StatCardData, QuickAction, ActivityItem, TableColumn } from '@/types/dashboard';

import LichessTournamentsCard from '@/components/dashboard/ui/LichessTournamentsCard';
import StudentGreeting from '@/components/dashboard/ui/StudentGreeting';
import LichessSyncTime from '@/components/dashboard/ui/LichessSyncTime';
import DashboardIcon from '@/components/dashboard/ui/DashboardIcon';
import DailyStreakWidget from '@/components/dashboard/ui/DailyStreakWidget';
import StudentBattleArena from '@/components/dashboard/ui/StudentBattleArena';
import AcademyAnnouncementBanner from '@/components/dashboard/ui/AcademyAnnouncementBanner';
import LichessTournamentManager from '@/components/dashboard/ui/LichessTournamentManager';
import { getLatestPublishedAnnouncement } from '@/lib/announcements';
import { getAcademyTournaments } from '@/lib/tournaments';
import StudentXpBadge from '@/components/dashboard/ui/StudentXpBadge';
import AiBlunderRadarWidget from '@/features/student/AiBlunderRadarWidget';
import DailyPuzzleChallengeWidget from '@/features/student/DailyPuzzleChallengeWidget';
import StudentReferralWidget from '@/features/student/StudentReferralWidget';

export const dynamic = 'force-dynamic';

export default async function StudentOverviewPage() {
  const user = await getCurrentUser();
  const [statsRes, homeworkRes, activeAnnouncement, tournaments] = await Promise.all([
    getStudentDashboardStats(),
    getStudentHomework(),
    getLatestPublishedAnnouncement(),
    getAcademyTournaments(),
  ]);

  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    completedHomework: 0,
    classesToday: 0,
    activeAssignments: 0,
    certificates: 0,
    completedClasses: 0,
    totalEnrolledClasses: 0,
    attendanceRate: 100,
    level: 'Beginner',
    lichess: null,
    nextClass: 'None',
    puzzleStats: null,
  };

  const STATS_CARDS: StatCardData[] = [
    {
      label: 'Level Track',
      value: stats.level,
      iconKey: 'activity',
      trend: 'neutral',
      trendValue: 'Assigned course track',
      colorScheme: 'blue',
    },
    {
      label: 'Completed Classes',
      value: `${stats.completedClasses || 0} Sessions`,
      iconKey: 'video',
      trend: 'up',
      trendValue: `${stats.attendanceRate || 100}% Attendance Rate`,
      colorScheme: 'purple',
    },
    {
      label: 'Active Homework Tasks',
      value: String(stats.activeAssignments),
      iconKey: 'puzzle',
      trend: 'neutral',
      trendValue: 'Pending submissions',
      colorScheme: 'gold',
    },
    {
      label: 'Next Class',
      value: stats.nextClass || 'None',
      iconKey: 'calendarDays',
      trend: 'neutral',
      trendValue: 'Upcoming session',
      colorScheme: 'green',
    },
  ];


  const QUICK_ACTIONS: QuickAction[] = [
    {
      label: 'Enter Classroom',
      description: 'Join live board session',
      href: '/dashboard/student/classes',
      iconKey: 'video',
      colorScheme: 'blue',
    },
    {
      label: 'Solve Daily Puzzles',
      description: 'Complete tactical exercises',
      href: '/dashboard/student/homework/puzzles',
      iconKey: 'puzzle',
      colorScheme: 'purple',
    },
    {
      label: 'Open Study Workbook',
      description: 'Read curriculum chapters',
      href: '/dashboard/student/homework/workbooks',
      iconKey: 'bookOpen',
      colorScheme: 'gold',
    },
    {
      label: 'Recordings Library',
      description: 'Review past session videos',
      href: '/dashboard/student/recordings',
      iconKey: 'playCircle',
      colorScheme: 'green',
    },
  ];

  const ACTIVITIES: ActivityItem[] = [
    {
      id: 'act-1',
      type: 'system',
      description: 'Student Portal workspace activated successfully.',
      timestamp: 'Just now',
      iconKey: 'settings',
    },
  ];

  const COLUMNS: TableColumn[] = [
    { key: 'category', label: 'Curriculum Focus' },
    { key: 'status', label: 'Progress Track' },
  ];

  const assignments = homeworkRes.success && homeworkRes.data ? homeworkRes.data : [];

  const ROWS = assignments.slice(0, 6).map((asgn: any) => ({
    category: (
      <div>
        <span className="font-semibold text-text-primary text-xs block">{asgn.workbookTitle || 'Untitled Workbook'}</span>
        <span className="text-[10px] text-text-secondary uppercase font-bold tracking-wide">{asgn.chapterTitle}</span>
      </div>
    ),
    status: (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
        asgn.status === 'reviewed'
          ? 'bg-green-50 text-green-700 border-green-100'
          : asgn.status === 'submitted'
          ? 'bg-amber-50 text-amber-700 border-amber-100'
          : 'bg-slate-50 text-slate-600 border-slate-100'
      }`}>
        {asgn.status}
      </span>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={<StudentGreeting name={user?.firstName || 'Student'} />}
        subtitle="Access scheduled live interactive classes, daily tactical assignments, and curriculum libraries."
      />

      {/* 🚀 PROMINENT TOP ENTER CLASSROOM HERO BANNER */}
      <div className="relative overflow-hidden bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 rounded-2xl p-6 border-2 border-indigo-500/40 shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6 group hover:border-indigo-400 transition-all">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-all pointer-events-none" />
        <div className="space-y-1.5 z-10 text-center md:text-left">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-extrabold rounded-full tracking-wide uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>Interactive Live Board</span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Ready to Join Your Live Session?
          </h2>
          <p className="text-xs md:text-sm text-slate-300 max-w-xl font-medium">
            Connect directly with your GM/Coach, solve interactive puzzles on the live board, and practice moves in real-time.
          </p>
        </div>

        <a
          href="/dashboard/student/classes"
          className="z-10 px-6 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white text-sm font-black rounded-xl shadow-lg shadow-emerald-900/50 hover:shadow-emerald-900/80 transform hover:-translate-y-0.5 transition-all flex items-center gap-2.5 whitespace-nowrap uppercase tracking-wider group"
        >
          <span className="text-base group-hover:scale-125 transition-transform">📹</span>
          <span>ENTER CLASSROOM</span>
          <span className="text-base group-hover:translate-x-1 transition-transform">➔</span>
        </a>
      </div>

      {/* 📣 Broadcast Announcement Banner (Only rendered if published by Admin) */}
      {activeAnnouncement && (
        <AcademyAnnouncementBanner
          title={activeAnnouncement.title}
          message={activeAnnouncement.body}
          date={activeAnnouncement.published_at ? new Date(activeAnnouncement.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : undefined}
        />
      )}

      {/* 🧩 Pending Homework Action Card */}
      {stats.activeAssignments > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center text-xl font-bold flex-shrink-0">
              🧩
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-white">
                {stats.activeAssignments} Pending Tactical Homework Assignment{stats.activeAssignments > 1 ? 's' : ''}
              </h3>
              <p className="text-xs text-slate-300 font-medium">
                Complete your assigned tactics & chapters before your next class session.
              </p>
            </div>
          </div>
          <a
            href="/dashboard/student/homework/puzzles"
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl transition-all shadow-md whitespace-nowrap uppercase tracking-wider"
          >
            SOLVE NOW ➔
          </a>
        </div>
      )}


      {/* Lichess Rating Widget */}
      {stats.lichess && (
        <div className="bg-white rounded-2xl border border-border shadow-card p-6">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <div>
              <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse"></span>
                Lichess Player Profile
              </h3>
              <a
                href={`https://lichess.org/@/${stats.lichess.username}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary font-semibold hover:underline"
              >
                @{stats.lichess.username}
              </a>
            </div>
            <LichessSyncTime dateString={stats.lichess.syncedAt} />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            <div className="bg-slate-55 bg-slate-50 border border-border/80 p-3 rounded-xl text-center">
              <span className="text-[10px] text-text-secondary uppercase font-semibold block">Tactics / Puzzle</span>
              <span className="text-sm font-bold text-text-primary font-mono">{stats.lichess.ratings.puzzle}</span>
            </div>
            <div className="bg-slate-50 border border-border/80 p-3 rounded-xl text-center">
              <span className="text-[10px] text-text-secondary uppercase font-semibold block">Rapid Rating</span>
              <span className="text-sm font-bold text-text-primary font-mono">{stats.lichess.ratings.rapid}</span>
            </div>
            <div className="bg-slate-50 border border-border/80 p-3 rounded-xl text-center">
              <span className="text-[10px] text-text-secondary uppercase font-semibold block">Blitz Rating</span>
              <span className="text-sm font-bold text-text-primary font-mono">{stats.lichess.ratings.blitz}</span>
            </div>
            <div className="bg-slate-50 border border-border/80 p-3 rounded-xl text-center">
              <span className="text-[10px] text-text-secondary uppercase font-semibold block">Classical</span>
              <span className="text-sm font-bold text-text-primary font-mono">{stats.lichess.ratings.classical}</span>
            </div>
            <div className="bg-slate-50 border border-border/80 p-3 rounded-xl text-center col-span-2 sm:col-span-1">
              <span className="text-[10px] text-text-secondary uppercase font-semibold block">Total Games</span>
              <span className="text-sm font-bold text-text-primary font-mono">{stats.lichess.gamesCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* 🏆 Student Level XP Progress Badge */}
      <StudentXpBadge totalXp={750} streakDays={stats.puzzleStats?.streak || 5} />

      {/* 🔥 Daily 3-Puzzle Challenge Streak */}
      <DailyPuzzleChallengeWidget />

      {/* KPI Stats */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STATS_CARDS.map((stat, index) => (
          <StatCard key={index} data={stat} />
        ))}
      </dl>

      {/* 🎯 AI Tactical Blunder Radar & 🎁 Refer-a-Friend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AiBlunderRadarWidget />
        <StudentReferralWidget />
      </div>

      {/* 🏆 Daily Streak Habit Tracker & ⚔️ 1v1 Speed Duel Arena Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <DailyStreakWidget currentStreak={stats.puzzleStats?.streak || 5} />
        <StudentBattleArena studentName={user?.firstName || 'Student'} />
      </div>

      {/* 🏆 Lichess Custom Tournament Join Manager */}
      <LichessTournamentManager
        initialTournaments={tournaments}
        userRole={user?.role === 'ADMIN' ? 'admin' : user?.role === 'COACH' ? 'coach' : 'student'}
      />

      {/* Shortcuts */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Study Center Shortcuts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action, index) => (
            <QuickActionCard key={index} action={action} />
          ))}
        </div>
      </div>

      {/* Tables & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pb-2">
        <div className="lg:col-span-2">
          <DashboardTable
            columns={COLUMNS}
            rows={ROWS}
            emptyTitle="No Assignments Yet"
            emptyDescription="Your coach will assign workbooks and homework chapters to your account. Check back after your next class."
            caption="Overview of active study tracks"
          />
        </div>
        <div className="space-y-6">
          <LichessTournamentsCard />
          <ActivityFeed items={ACTIVITIES} />
        </div>
      </div>
    </div>
  );
}
