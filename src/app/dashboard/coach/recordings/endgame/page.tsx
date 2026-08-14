import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Endgame Lesson Video' },
  { key: 'theme', label: 'Endgame Theme' },
  { key: 'date', label: 'Publish Date' },
  { key: 'action', label: 'Watch Video' },
];

const ENDGAME_RECORDINGS = [
  {
    title: <span className="font-bold text-text-primary text-xs">Essential Rook & Pawn Endgames Masterclass</span>,
    theme: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-100">
        Lucena & Philidor Positions
      </span>
    ),
    date: <span className="text-text-secondary text-xs">Aug 10, 2026</span>,
    action: (
      <a
        href="https://meet.jit.si/ChessHub_Class_roomrr11u7..."
        target="_blank"
        rel="noopener noreferrer"
        className="px-3 py-1 bg-primary text-white rounded-lg text-xs font-bold hover:bg-primary-dark transition-colors inline-block"
      >
        ▶ Watch Video
      </a>
    ),
  },
];

export default function EndgameRecordingsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter endgame tutorials..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={ENDGAME_RECORDINGS}
        emptyTitle="No Endgame Library Recordings"
        emptyDescription="Record endgame studies to help students convert won games."
        caption="Endgame Library Studies"
      />
    </div>
  );
}
