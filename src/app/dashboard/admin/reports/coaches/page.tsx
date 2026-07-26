import React from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import { getCoachPerformanceReportRows } from '@/lib/reports';
import type { TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const COLUMNS: TableColumn[] = [
  { key: 'coach', label: 'Coach Name' },
  { key: 'email', label: 'Email Address' },
  { key: 'classes', label: 'Classes Conducted' },
  { key: 'hours', label: 'Hours Logged' },
  { key: 'students', label: 'Active Students' },
  { key: 'attendance', label: 'Avg Attendance' },
];

export default async function ReportsCoachesPage() {
  const coachesData = await getCoachPerformanceReportRows();

  const rows = coachesData.map((c) => ({
    coach: <span className="font-semibold text-text-primary text-xs">{c.coachName}</span>,
    email: <span className="text-text-secondary text-xs">{c.email}</span>,
    classes: <span className="text-text-secondary text-xs">{c.classesConducted} sessions</span>,
    hours: <span className="text-text-secondary text-xs">{c.totalHours} hrs</span>,
    students: <span className="text-text-secondary text-xs">{c.studentsTaught} learners</span>,
    attendance: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
        {c.avgAttendance}
      </span>
    ),
  }));

  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter coach performance..." className="max-w-md" />
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <DashboardTable
          columns={COLUMNS}
          rows={rows}
          emptyTitle="No Coach Performance Logs"
          emptyDescription="Coach teaching hours and student feedback ratings will compile here."
          caption="Coach Performance Metrics"
        />
      </div>
    </div>
  );
}
