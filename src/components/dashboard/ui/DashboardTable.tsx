import EmptyState from './EmptyState';
import type { TableColumn } from '@/types/dashboard';

interface DashboardTableProps {
  columns: TableColumn[];
  rows?: Record<string, React.ReactNode>[];
  caption?: string;
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function DashboardTable({
  columns,
  rows = [],
  caption,
  emptyTitle = 'No data yet',
  emptyDescription = 'Data will appear here once available.',
}: DashboardTableProps) {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-border bg-surface-light">
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  className={`px-5 py-3.5 text-left text-xs font-semibold text-text-secondary uppercase tracking-wide whitespace-nowrap ${col.width ?? ''}`}
                >
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    iconKey="folder"
                    title={emptyTitle}
                    description={emptyDescription}
                  />
                </td>
              </tr>
            ) : (
              rows.map((row, i) => (
                <tr key={i} className="hover:bg-surface-light/60 transition-colors">
                  {columns.map((col) => (
                    <td key={col.key} className="px-5 py-4 text-text-primary">
                      {row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
