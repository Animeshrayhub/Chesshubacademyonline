import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'month', label: 'Period' },
  { key: 'gross', label: 'Gross Revenue' },
  { key: 'refunds', label: 'Refunds / Adjustments' },
  { key: 'net', label: 'Net Monthly Earnings' },
];

export default function ReportsRevenuePage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter billing cycles..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Financial Summaries Found"
        emptyDescription="Revenue trends and payment portal reports will aggregate here when payment gates are integrated."
      />
    </div>
  );
}
