import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Post Title' },
  { key: 'author', label: 'Author' },
  { key: 'lastSaved', label: 'Last Saved' },
];

export default function BlogDraftsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Search draft articles..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Drafts Available"
        emptyDescription="Drafted articles that are not yet published will appear here."
      />
    </div>
  );
}
