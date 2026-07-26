import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Class Video' },
  { key: 'duration', label: 'Duration' },
  { key: 'date', label: 'Session Date' },
];

export default function LiveClassesRecordingsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter class sessions..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Class Archives Uploaded"
        emptyDescription="Archives of live classroom streams will display here."
      />
    </div>
  );
}
