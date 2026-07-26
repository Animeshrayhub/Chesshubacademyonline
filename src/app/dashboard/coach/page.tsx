import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import StatCard from '@/components/dashboard/ui/StatCard';
import QuickActionCard from '@/components/dashboard/ui/QuickActionCard';
import ActivityFeed from '@/components/dashboard/ui/ActivityFeed';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import { getCoachDashboardStats, getCoachCohort } from '@/lib/coaches';
import type { StatCardData, QuickAction, ActivityItem, TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

export default async function CoachOverviewPage() {
  const statsRes = await getCoachDashboardStats();
  const cohortRes = await getCoachCohort();

  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    activeStudents: 0,
    classesToday: 0,
    pendingHomework: 0,
    weeklySessions: 0,
    nextClass: 'None',
  };

  const cohort = cohortRes.success && cohortRes.data ? cohortRes.data : [];

  const STATS_CARDS: StatCardData[] = [
    {
      label: 'My Active Students',
      value: String(stats.activeStudents),
      iconKey: 'users',
      trend: 'neutral',
      trendValue: 'Assigned cohort',
      colorScheme: 'blue',
    },
    {
      label: 'Classes Scheduled Today',
      value: String(stats.classesToday),
      iconKey: 'video',
      trend: 'neutral',
      trendValue: 'Scheduled today',
      colorScheme: 'purple',
    },
    {
      label: 'Pending Homework Reviews',
      value: String(stats.pendingHomework),
      iconKey: 'bookOpen',
      trend: 'neutral',
      trendValue: 'Unchecked workbooks',
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
      label: 'Start Private Session',
      description: 'Open live Zoom class space',
      href: '/dashboard/coach/classes',
      iconKey: 'video',
      colorScheme: 'blue',
    },
    {
      label: 'Grade Homework',
      description: 'Review student workbooks',
      href: '/dashboard/coach/homework',
      iconKey: 'bookOpen',
      colorScheme: 'purple',
    },
    {
      label: 'Add Student Study Note',
      description: 'Record lesson observations',
      href: '/dashboard/coach/notes',
      iconKey: 'fileText',
      colorScheme: 'gold',
    },
    {
      label: 'Upload Video Lesson',
      description: 'Save a recording to library',
      href: '/dashboard/coach/recordings',
      iconKey: 'playCircle',
      colorScheme: 'green',
    },
  ];

  const ACTIVITIES: ActivityItem[] = [
    {
      id: 'act-1',
      type: 'homework',
      description: 'Overview synchronized with FIDE instructor profiles.',
      timestamp: 'Just now',
      iconKey: 'checkSquare',
    },
  ];

  const COLUMNS: TableColumn[] = [
    { key: 'student', label: 'Student Profile' },
    { key: 'level', label: 'Course Track' },
    { key: 'email', label: 'Parent Email' },
  ];

  const rows = cohort.map((student) => ({
    student: <span className="font-semibold text-text-primary">{student.firstName} {student.lastName}</span>,
    level: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
        {student.level}
      </span>
    ),
    email: <span className="text-text-secondary text-xs">{student.email}</span>,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coach Dashboard"
        subtitle="Manage assigned students, schedule interactive Zoom classes, review tactical puzzles, and grade workbooks."
      />

      {/* KPI Metrics */}
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {STATS_CARDS.map((stat, index) => (
          <StatCard key={index} data={stat} />
        ))}
      </dl>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-text-primary mb-3">Teaching Shortcuts</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action, index) => (
            <QuickActionCard key={index} action={action} />
          ))}
        </div>
      </div>

      {/* Cohort Table & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <DashboardTable
            columns={COLUMNS}
            rows={rows}
            emptyTitle="No Students Assigned Yet"
            emptyDescription="Student accounts are registered and assigned to coaches by the administrator desk."
            caption="Assigned Student Cohort Overview"
          />
        </div>
        <div>
          <ActivityFeed items={ACTIVITIES} />
        </div>
      </div>
    </div>
  );
}
