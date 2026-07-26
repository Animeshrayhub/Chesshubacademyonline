import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Class Video' },
  { key: 'date', label: 'Session Date' },
];

export default function StudentLiveClassesRecordingsPage() {
  return (
    <div className="space-y-4">
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Class Archives Found"
        emptyDescription="Archives of live classroom streams will display here."
      />
    </div>
  );
}
