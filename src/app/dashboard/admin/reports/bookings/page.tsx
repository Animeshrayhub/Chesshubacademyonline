import React from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import BookingsRegistry from '@/features/admin/BookingsRegistry';
import { getDemoBookingReportRows } from '@/lib/reports';
import { listBookings } from '@/lib/bookings';
import { listCoaches } from '@/lib/coaches';
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
  const [bookingsData, bookingsRes, coachesRes] = await Promise.all([
    getDemoBookingReportRows(),
    listBookings(),
    listCoaches(),
  ]);

  const bookings = bookingsRes.success ? (bookingsRes.data ?? []) : [];
  const coaches = coachesRes.success ? (coachesRes.data ?? []) : [];

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
    <div className="space-y-8">
      {/* 1. Monthly Conversion Statistics */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-text-primary">Demo Bookings Conversion Metrics</h4>
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

      {/* 2. Interactive Demo Bookings Management (Review, Approve, Reschedule, Onboard) */}
      <BookingsRegistry bookings={bookings} coaches={coaches} />
    </div>
  );
}
