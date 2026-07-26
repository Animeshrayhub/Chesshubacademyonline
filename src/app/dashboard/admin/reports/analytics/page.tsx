import React from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import { getKPIAnalyticsRows } from '@/lib/reports';
import type { TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const COLUMNS: TableColumn[] = [
  { key: 'metric', label: 'KPI Analytics Metric' },
  { key: 'value', label: 'Metric Value' },
  { key: 'period', label: 'Quarterly Growth & Target' },
];

export default async function ReportsAnalyticsPage() {
  const kpis = await getKPIAnalyticsRows();

  const rows = kpis.map((k) => ({
    metric: <span className="font-semibold text-text-primary text-xs">{k.metric}</span>,
    value: (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
        {k.value}
      </span>
    ),
    period: <span className="text-xs font-medium text-emerald-600">{k.period}</span>,
  }));

  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter site analytics..." className="max-w-md" />
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <DashboardTable
          columns={COLUMNS}
          rows={rows}
          emptyTitle="No System Analytics Calculated"
          emptyDescription="Visitor analytics, page sessions, and demographic maps will display here."
          caption="System KPI Analytics"
        />
      </div>
    </div>
  );
}
