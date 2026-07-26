import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Lesson Video' },
  { key: 'date', label: 'Session Date' },
];

export default function StudentLessonsRecordingsPage() {
  return (
    <div className="space-y-4">
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Private Lesson Recordings"
        emptyDescription="Archives of your private coach sessions will populate here."
      />
    </div>
  );
}
