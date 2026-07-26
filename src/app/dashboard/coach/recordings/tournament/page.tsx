import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Tournament Analysis Video' },
  { key: 'duration', label: 'Duration' },
  { key: 'date', label: 'Publish Date' },
];

export default function TournamentRecordingsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter tournament analyses..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Tournament Analysis Recordings"
        emptyDescription="Upload records analyzing recent FIDE tournaments or student matches to see them here."
      />
    </div>
  );
}
