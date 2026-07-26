import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'assignment', label: 'Workbook / Chapter' },
  { key: 'submission', label: 'Submissions' },
  { key: 'review', label: 'Reviews Completed' },
  { key: 'average', label: 'Average Score' },
];

export default function ReportsHomeworkPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter homework summaries..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Homework Metrics Calculated"
        emptyDescription="Homework completion cohorts and score distributions will compile when lessons begin."
      />
    </div>
  );
}
