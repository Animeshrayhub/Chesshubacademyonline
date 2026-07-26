import React from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import { getAttendanceReportRows } from '@/lib/reports';
import type { TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const COLUMNS: TableColumn[] = [
  { key: 'class', label: 'Class Track' },
  { key: 'coach', label: 'Assigned Coach' },
  { key: 'date', label: 'Session Date' },
  { key: 'expected', label: 'Expected Count' },
  { key: 'actual', label: 'Actual Present' },
  { key: 'ratio', label: 'Attendance Rate' },
];

export default async function ReportsAttendancePage() {
  const attendanceList = await getAttendanceReportRows();

  const rows = attendanceList.map((a) => ({
    class: <span className="font-semibold text-text-primary text-xs">{a.classTitle}</span>,
    coach: <span className="text-text-secondary text-xs">{a.coachName}</span>,
    date: <span className="text-text-secondary text-xs">{a.date}</span>,
    expected: <span className="text-text-secondary text-xs">{a.expectedCount} students</span>,
    actual: <span className="text-text-secondary text-xs">{a.actualCount} present</span>,
    ratio: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
        {a.rate}
      </span>
    ),
  }));

  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter attendance logs..." className="max-w-md" />
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <DashboardTable
          columns={COLUMNS}
          rows={rows}
          emptyTitle="No Attendance Records"
          emptyDescription="Weekly attendance ratios and classroom sign-in reports will calculate here."
          caption="Attendance Metrics Log"
        />
      </div>
    </div>
  );
}
