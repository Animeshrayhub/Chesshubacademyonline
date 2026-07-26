import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Category Name' },
  { key: 'slug', label: 'Slug' },
  { key: 'posts', label: 'Posts Count' },
];

export default function BlogCategoriesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <TableSearchBar placeholder="Search categories..." className="max-w-md flex-1" />
        <button
          type="button"
          className="px-4 py-2 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Create Category
        </button>
      </div>
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Categories Created"
        emptyDescription="Create categories to organize blog articles and improve search engine crawlability."
      />
    </div>
  );
}
