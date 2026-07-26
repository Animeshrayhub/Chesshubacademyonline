import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'class', label: 'Class Track' },
  { key: 'expected', label: 'Expected Count' },
  { key: 'actual', label: 'Actual Present' },
  { key: 'ratio', label: 'Attendance Rate' },
];

export default function ReportsAttendancePage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter attendance logs..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Attendance Records"
        emptyDescription="Weekly attendance ratios and classroom sign-in reports will calculate here."
      />
    </div>
  );
}
