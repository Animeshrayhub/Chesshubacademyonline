import React from 'react';
import Link from 'next/link';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import DashboardIcon from '@/components/dashboard/ui/DashboardIcon';
import { getCoachCohort } from '@/lib/coaches';
import type { TableColumn } from '@/types/dashboard';

export const dynamic = 'force-dynamic';

const COLUMNS: TableColumn[] = [
  { key: 'name', label: 'Student Name' },
  { key: 'email', label: 'Student Email' },
  { key: 'age', label: 'Age' },
  { key: 'track', label: 'Course Track' },
  { key: 'actions', label: 'Actions' },
];

export default async function CoachStudentsPage() {
  const cohortRes = await getCoachCohort();
  const cohort = cohortRes.success && cohortRes.data ? cohortRes.data : [];

  const rows = cohort.map((student) => ({
    name: <span className="font-semibold text-text-primary">{student.firstName} {student.lastName}</span>,
    email: <span className="text-text-secondary text-xs">{student.email}</span>,
    age: <span className="text-text-primary text-xs">{student.age} yrs</span>,
    track: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100 uppercase">
        {student.level}
      </span>
    ),
    actions: (
      <Link
        href={`/dashboard/coach/students/${student.profileId}`}
        className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-primary hover:text-white text-text-secondary text-xs font-semibold rounded-lg transition-all"
      >
        <DashboardIcon iconKey="eye" className="w-3.5 h-3.5" />
        Stats
      </Link>
    ),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Students"
        subtitle="View details, tactical weaknesses, rating history, and progress logs for assigned students."
      />

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <TableSearchBar placeholder="Filter my student cohort..." className="max-w-md" />
      </div>

      <DashboardTable
        columns={COLUMNS}
        rows={rows}
        emptyTitle="No Students Assigned"
        emptyDescription="Your student list is managed by the administrator. Contact support if this is unexpected."
        caption="Coach Student Cohort List"
      />
    </div>
  );
}
