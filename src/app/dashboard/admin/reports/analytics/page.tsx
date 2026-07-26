import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'metric', label: 'KPI Analytics Name' },
  { key: 'value', label: 'Metric Value' },
  { key: 'period', label: 'Average Growth' },
];

export default function ReportsAnalyticsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter site analytics..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No System Analytics Calculated"
        emptyDescription="Visitor analytics, page sessions, and demographic maps will display here."
      />
    </div>
  );
}
