import React from 'react';
import StatCard from '@/components/dashboard/ui/StatCard';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import type { StatCardData } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

async function fetchReportStats() {
  const admin = createSupabaseAdmin();

  // Run queries in parallel
  const [
    studentsRes,
    attendanceRes,
    homeworkRes,
    classesRes,
  ] = await Promise.all([
    // 1. Total active students
    admin.from('users').select('*', { count: 'exact', head: true }).eq('role', 'STUDENT').is('archived_at', null),
    // 2. Class attendance
    admin.from('class_attendance').select('status'),
    // 3. Homework assignments status
    admin.from('homework_assignments').select('status'),
    // 4. Classes duration sum
    admin.from('classes').select('duration_minutes').in('status', ['COMPLETED', 'RECORDING_AVAILABLE']).is('archived_at', null),
  ]);

  // Calculations
  const studentCount = studentsRes.count ?? 0;

  // Attendance rate
  const attendanceRecords = attendanceRes.data ?? [];
  const presentCount = attendanceRecords.filter((r: any) => r.status === 'PRESENT').length;
  const attendanceRate = attendanceRecords.length > 0 
    ? Math.round((presentCount / attendanceRecords.length) * 100) 
    : 0;

  // Homework completion rate
  const homeworkRecords = homeworkRes.data ?? [];
  const completedHomework = homeworkRecords.filter((r: any) => r.status === 'submitted' || r.status === 'reviewed').length;
  const homeworkRate = homeworkRecords.length > 0 
    ? Math.round((completedHomework / homeworkRecords.length) * 100) 
    : 0;

  // Coach hours logged
  const completedClasses = classesRes.data ?? [];
  const totalMinutes = completedClasses.reduce((sum: number, c: any) => sum + (c.duration_minutes ?? 0), 0);
  const totalHours = Math.round(totalMinutes / 60);

  return {
    studentCount,
    attendanceRate,
    homeworkRate,
    totalHours,
  };
}

export default async function ReportsOverviewPage() {
  const stats = await fetchReportStats();

  const statCards: StatCardData[] = [
    {
      label: 'Active Students Count',
      value: String(stats.studentCount),
      iconKey: 'users',
      trend: 'neutral',
      trendValue: 'Active learners',
      colorScheme: 'blue',
    },
    {
      label: 'Average Attendance Rate',
      value: `${stats.attendanceRate}%`,
      iconKey: 'checkSquare',
      trend: 'neutral',
      trendValue: 'All-time classes',
      colorScheme: 'green',
    },
    {
      label: 'Homework Completion Rate',
      value: `${stats.homeworkRate}%`,
      iconKey: 'bookOpen',
      trend: 'neutral',
      trendValue: 'Submitted tasks',
      colorScheme: 'purple',
    },
    {
      label: 'Coach Hours Logged',
      value: `${stats.totalHours}h`,
      iconKey: 'graduationCap',
      trend: 'neutral',
      trendValue: 'Completed classes',
      colorScheme: 'blue',
    },
  ];

  return (
    <div className="space-y-6">
      <h3 className="text-base font-bold text-text-primary">Monthly Performance Highlights</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, index) => (
          <StatCard key={index} data={stat} />
        ))}
      </dl>
      <div className="bg-white rounded-2xl border border-border p-6 shadow-card text-center text-text-secondary py-16">
        <p className="text-sm font-semibold">Performance Charts & Trends Coming Soon</p>
        <p className="text-xs mt-1">Detailed growth charts and student cohort metrics will populate when the database sync is enabled.</p>
      </div>
    </div>
  );
}
