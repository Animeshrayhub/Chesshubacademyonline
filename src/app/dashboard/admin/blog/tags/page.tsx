import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Tag Name' },
  { key: 'posts', label: 'Tagged Posts' },
];

export default function BlogTagsPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <TableSearchBar placeholder="Search tags..." className="max-w-md flex-1" />
        <button
          type="button"
          className="px-4 py-2 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Add New Tag
        </button>
      </div>
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Tags Created"
        emptyDescription="Create tags to cross-reference articles across different categories and courses."
      />
    </div>
  );
}
