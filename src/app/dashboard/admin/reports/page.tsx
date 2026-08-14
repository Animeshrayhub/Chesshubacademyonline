import React from 'react';
import RealtimeAcademyAnalyticsView from '@/components/dashboard/ui/RealtimeAcademyAnalyticsView';
import { getOverviewReport, getKPIAnalyticsRows } from '@/lib/reports';

export const dynamic = 'force-dynamic';

export default async function ReportsOverviewPage() {
  const stats = await getOverviewReport();
  const kpiRowsRaw = await getKPIAnalyticsRows();

  return (
    <RealtimeAcademyAnalyticsView
      initialStats={stats}
      initialKpiRows={kpiRowsRaw}
    />
  );
}
