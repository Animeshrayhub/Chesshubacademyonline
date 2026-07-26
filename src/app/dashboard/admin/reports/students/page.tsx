import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'student', label: 'Student Name' },
  { key: 'improvement', label: 'Rating Gain' },
  { key: 'hours', label: 'Hours Studied' },
  { key: 'efficiency', label: 'Tactics Accuracy' },
];

export default function ReportsStudentsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter student metrics..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Student Metrics Calculated"
        emptyDescription="Performance matrices, tactics accuracy, and puzzle metrics will calculate automatically based on submissions."
      />
    </div>
  );
}
