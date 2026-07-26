import React from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import { getHomeworkReportRows } from '@/lib/reports';
import type { TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const COLUMNS: TableColumn[] = [
  { key: 'workbook', label: 'Workbook Title' },
  { key: 'chapter', label: 'Syllabus Chapter' },
  { key: 'assigned', label: 'Students Assigned' },
  { key: 'submitted', label: 'Tasks Completed' },
  { key: 'rate', label: 'Completion Rate' },
];

export default async function ReportsHomeworkPage() {
  const homeworkData = await getHomeworkReportRows();

  const rows = homeworkData.map((h) => ({
    workbook: <span className="font-semibold text-text-primary text-xs">{h.workbookTitle}</span>,
    chapter: <span className="text-text-secondary text-xs">{h.chapterTitle}</span>,
    assigned: <span className="text-text-secondary text-xs">{h.assignedCount} students</span>,
    submitted: <span className="text-text-secondary text-xs">{h.submittedCount} submissions</span>,
    rate: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
        {h.completionRate}
      </span>
    ),
  }));

  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter homework tasks..." className="max-w-md" />
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <DashboardTable
          columns={COLUMNS}
          rows={rows}
          emptyTitle="No Homework Metrics Calculated"
          emptyDescription="Homework completion trends and chapter drill scores will populate as assignments are reviewed."
          caption="Homework Completion Analytics"
        />
      </div>
    </div>
  );
}
