import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'period', label: 'Reporting Period' },
  { key: 'requests', label: 'Requested Bookings' },
  { key: 'completed', label: 'Demo Completed' },
  { key: 'conversion', label: 'Conversion Rate' },
];

export default function ReportsBookingsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter booking audits..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Conversion Reports Available"
        emptyDescription="Bookings growth trends and conversion statistics will compile based on demo outcomes."
      />
    </div>
  );
}
