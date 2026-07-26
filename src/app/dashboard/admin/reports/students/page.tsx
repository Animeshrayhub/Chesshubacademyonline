import React from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import { getStudentReportRows } from '@/lib/reports';
import type { TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Student Name' },
  { key: 'email', label: 'Email Address' },
  { key: 'rating', label: 'Chess Rating (FIDE / Lichess)' },
  { key: 'classes', label: 'Classes Attended' },
  { key: 'homework', label: 'Homework Completed' },
  { key: 'puzzles', label: 'Puzzles Solved' },
  { key: 'status', label: 'Account Status' },
];

export default async function ReportsStudentsPage() {
  const studentsData = await getStudentReportRows();

  const rows = studentsData.map((s) => ({
    name: <span className="font-semibold text-text-primary text-xs">{s.name}</span>,
    email: <span className="text-text-secondary text-xs">{s.email}</span>,
    rating: (
      <span className="inline-flex items-center px-2 py-0.5 rounded bg-amber-50 text-amber-700 font-mono text-xs font-bold border border-amber-200">
        ⚡ {s.rating} ELO
      </span>
    ),
    classes: <span className="text-text-secondary text-xs">{s.classesAttended} sessions</span>,
    homework: <span className="text-text-secondary text-xs">{s.homeworkCompleted} tasks</span>,
    puzzles: <span className="text-text-secondary text-xs">{s.puzzlesSolved} solved</span>,
    status: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-green-50 text-green-700 border border-green-200">
        {s.status}
      </span>
    ),
  }));

  return (
    <div className="space-y-4">
      <TableSearchBar placeholder="Filter student reports..." className="max-w-md" />
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <DashboardTable
          columns={COLUMNS}
          rows={rows}
          emptyTitle="No Student Performance Records"
          emptyDescription="Individual student progress benchmarks, puzzle accuracies, and attendance records will calculate here."
          caption="Student Performance & Engagement Report"
        />
      </div>
    </div>
  );
}
