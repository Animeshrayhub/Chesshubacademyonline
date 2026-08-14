import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Opening Repertoire Video' },
  { key: 'theme', label: 'Opening System' },
  { key: 'date', label: 'Publish Date' },
  { key: 'action', label: 'Watch Video' },
];

const OPENINGS_RECORDINGS = [
  {
    title: <span className="font-bold text-text-primary text-xs">Sicilian Defense Najdorf & Pawn Storm Secrets</span>,
    theme: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
        Sicilian Najdorf (1.e4 c5)
      </span>
    ),
    date: <span className="text-text-secondary text-xs">Aug 08, 2026</span>,
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

export default function OpeningsRecordingsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter opening guides..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={OPENINGS_RECORDINGS}
        emptyTitle="No Opening Library Recordings"
        emptyDescription="Opening preparation videos will appear here."
        caption="Opening Repertoire Library"
      />
    </div>
  );
}
