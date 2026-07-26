import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Lesson Video' },
  { key: 'student', label: 'Student Portfolio' },
  { key: 'date', label: 'Upload Date' },
];

export default function LessonsRecordingsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter private tutorials..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Private Lesson Recordings"
        emptyDescription="Upload recorded private sessions to help students review their personalized board tutorials."
      />
    </div>
  );
}
