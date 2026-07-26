import React from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import { getRevenueReportRows } from '@/lib/reports';
import type { TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const COLUMNS: TableColumn[] = [
  { key: 'track', label: 'Program Cohort Track' },
  { key: 'students', label: 'Active Enrolled Learners' },
  { key: 'price', label: 'Price Per Lesson' },
  { key: 'revenue', label: 'Est. Monthly Recurring Revenue' },
];

export default async function ReportsRevenuePage() {
  const revenueData = await getRevenueReportRows();

  const rows = revenueData.map((r) => ({
    track: <span className="font-semibold text-text-primary text-xs">{r.programTrack}</span>,
    students: <span className="text-text-secondary text-xs">{r.activeStudents} active</span>,
    price: <span className="text-text-secondary text-xs">{r.pricePerLesson}</span>,
    revenue: (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
        {r.estMonthlyRevenue}
      </span>
    ),
  }));

  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter revenue tracks..." className="max-w-md" />
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <DashboardTable
          columns={COLUMNS}
          rows={rows}
          emptyTitle="No Revenue Data Logged"
          emptyDescription="Paid student subscription records and monthly recurring revenue (MRR) will compile here."
          caption="Revenue Breakdown by Program Track"
        />
      </div>
    </div>
  );
}
