import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Endgame Lesson Video' },
  { key: 'theme', label: 'Endgame Theme' },
  { key: 'date', label: 'Publish Date' },
];

export default function EndgameRecordingsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter endgame tutorials..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Endgame Library Recordings"
        emptyDescription="Record endgame studies (e.g. King and Pawn, Rook vs Rook) to help students convert won games."
      />
    </div>
  );
}
