import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Tournament Prep Video' },
  { key: 'date', label: 'Publish Date' },
];

export default function StudentTournamentRecordingsPage() {
  return (
    <div className="space-y-4">
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Tournament Prep Videos"
        emptyDescription="Tournament preparation lessons and match audits will display here."
      />
    </div>
  );
}
