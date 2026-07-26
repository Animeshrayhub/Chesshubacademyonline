import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'coach', label: 'Coach Profile' },
  { key: 'students', label: 'Students Assigned' },
  { key: 'hours', label: 'Coaching Hours' },
  { key: 'feedback', label: 'Parent Rating' },
];

export default function ReportsCoachesPage() {
  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter coach performance..." className="max-w-md" />
      <DashboardTable
        columns={COLUMNS}
        rows={[]}
        emptyTitle="No Performance Audits Found"
        emptyDescription="Feedback surveys and private lesson hours logged per FIDE coach will aggregate here."
      />
    </div>
  );
}
