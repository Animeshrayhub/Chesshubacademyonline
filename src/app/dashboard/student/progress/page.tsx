import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getStudentDashboardStats } from '@/lib/students';
import StudentProgressClient from '@/features/student/StudentProgressClient';

export const dynamic = 'force-dynamic';

export default async function StudentProgressPage() {
  const statsRes = await getStudentDashboardStats();
  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    completedHomework: 0,
    classesToday: 0,
    activeAssignments: 0,
    certificates: 0,
    level: 'Beginner',
    lichess: null,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Learning Progress"
        subtitle="Track your curriculum milestone achievements, workbook submission history, and ratings progression."
      />

      <StudentProgressClient stats={stats} />
    </div>
  );
}
