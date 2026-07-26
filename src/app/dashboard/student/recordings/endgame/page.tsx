import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Endgame Study Video' },
  { key: 'date', label: 'Publish Date' },
];

export default function StudentEndgameRecordingsPage() {
  return (
    <div className="space-y-4">
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Endgame Studies Found"
        emptyDescription="Interactive endgame lecture archives will display here."
      />
    </div>
  );
}
