import React from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import { getDemoBookingReportRows } from '@/lib/reports';
import type { TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const COLUMNS: TableColumn[] = [
  { key: 'period', label: 'Reporting Period' },
  { key: 'requests', label: 'Requested Bookings' },
  { key: 'completed', label: 'Demo Completed' },
  { key: 'converted', label: 'Paid Enrollments' },
  { key: 'conversion', label: 'Conversion Rate' },
];

export default async function ReportsBookingsPage() {
  const bookingsData = await getDemoBookingReportRows();

  const rows = bookingsData.map((b) => ({
    period: <span className="font-semibold text-text-primary text-xs">{b.month}</span>,
    requests: <span className="text-text-secondary text-xs">{b.requested} requests</span>,
    completed: <span className="text-text-secondary text-xs">{b.completed} conducted</span>,
    converted: <span className="text-text-secondary text-xs">{b.converted} enrolled</span>,
    conversion: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
        {b.rate}
      </span>
    ),
  }));

  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter booking audits..." className="max-w-md" />
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <DashboardTable
          columns={COLUMNS}
          rows={rows}
          emptyTitle="No Conversion Reports Available"
          emptyDescription="Bookings growth trends and conversion statistics will compile based on demo outcomes."
          caption="Demo Bookings Conversion Metrics"
        />
      </div>
    </div>
  );
}
