import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Opening Study Video' },
  { key: 'variation', label: 'Chess Opening Variation' },
  { key: 'date', label: 'Publish Date' },
];

export default function OpeningsRecordingsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter opening lessons..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Opening Library Recordings"
        emptyDescription="Create opening preparation guides (e.g. Sicilian Defense, Queen's Gambit) to build the theory vault."
      />
    </div>
  );
}
