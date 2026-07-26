import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Post Title' },
  { key: 'author', label: 'Author' },
  { key: 'category', label: 'Category' },
  { key: 'date', label: 'Publish Date' },
];

export default function AllPostsPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Search published articles..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Blog Articles Published"
        emptyDescription="Drafted articles will show up in the Drafts tab. Write and publish your first article to see it here."
      />
    </div>
  );
}
