import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Opening Lecture' },
  { key: 'date', label: 'Publish Date' },
];

export default function StudentOpeningsRecordingsPage() {
  return (
    <div className="space-y-4">
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Opening Lectures Found"
        emptyDescription="Opening library videos covering critical variations will show up here."
      />
    </div>
  );
}
