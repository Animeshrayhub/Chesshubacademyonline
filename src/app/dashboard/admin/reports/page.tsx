import React from 'react';
import StatCard from '@/components/dashboard/ui/StatCard';
import AnalyticsTrendChart from '@/components/dashboard/ui/AnalyticsTrendChart';
import { getOverviewReport, getKPIAnalyticsRows } from '@/lib/reports';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import type { StatCardData, TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const KPI_COLUMNS: TableColumn[] = [
  { key: 'metric', label: 'Key Performance Metric' },
  { key: 'value', label: 'Current Score' },
  { key: 'period', label: 'Quarterly Growth & Target' },
];

export default async function ReportsOverviewPage() {
  const stats = await getOverviewReport();
  const kpiRowsRaw = await getKPIAnalyticsRows();

  const statCards: StatCardData[] = [
    {
      label: 'Active Students Count',
      value: String(stats.studentCount),
      iconKey: 'users',
      trend: 'up',
      trendValue: '+14% this month',
      colorScheme: 'blue',
    },
    {
      label: 'Average Attendance Rate',
      value: `${stats.attendanceRate}%`,
      iconKey: 'checkSquare',
      trend: 'up',
      trendValue: 'All-time classes',
      colorScheme: 'green',
    },
    {
      label: 'Homework Completion Rate',
      value: `${stats.homeworkRate}%`,
      iconKey: 'bookOpen',
      trend: 'up',
      trendValue: 'Submitted tasks',
      colorScheme: 'purple',
    },
    {
      label: 'Coach Hours Logged',
      value: `${stats.totalHours}h`,
      iconKey: 'graduationCap',
      trend: 'up',
      trendValue: 'Completed classes',
      colorScheme: 'blue',
    },
  ];

  const kpiRows = kpiRowsRaw.map((r) => ({
    metric: <span className="font-semibold text-text-primary text-xs">{r.metric}</span>,
    value: (
      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
        {r.value}
      </span>
    ),
    period: <span className="text-xs font-medium text-emerald-600">{r.period}</span>,
  }));

  return (
    <div className="space-y-6">
      <h3 className="text-base font-bold text-text-primary">Monthly Performance Highlights</h3>
      <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((stat, index) => (
          <StatCard key={index} data={stat} />
        ))}
      </dl>

      {/* Interactive Analytics & Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnalyticsTrendChart
          title="Academy Class Growth & Frequency"
          subtitle="Total live sessions conducted per month across all FIDE cohorts"
          data={stats.monthlyTrend}
          unit="classes"
          color="primary"
        />

        <AnalyticsTrendChart
          title="Class Type Distribution"
          subtitle="Breakdown of active group, buddy, and private 1v1 cohorts"
          data={stats.classesTypeTrend}
          unit="cohorts"
          color="emerald"
        />
      </div>

      {/* Real-time KPI Breakdown Table */}
      <div className="space-y-3">
        <h4 className="text-sm font-bold text-text-primary">Platform Key Health Indicators</h4>
        <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
          <DashboardTable
            columns={KPI_COLUMNS}
            rows={kpiRows}
            caption="Key Health Indicators"
          />
        </div>
      </div>
    </div>
  );
}
