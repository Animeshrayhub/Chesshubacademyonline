import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import AdminRecordingsArchiveClient from './AdminRecordingsArchiveClient';
import { listClasses } from '@/lib/classes';
import { listCoaches } from '@/lib/coaches';
import { listStudents } from '@/lib/students';

export const dynamic = 'force-dynamic';

export default async function AdminMasterRecordingsPage() {
  const [classesRes, coachesRes, studentsRes] = await Promise.all([
    listClasses(),
    listCoaches(),
    listStudents(),
  ]);

  const classes = classesRes.success && classesRes.data ? classesRes.data : [];
  const coaches = coachesRes.success && coachesRes.data ? coachesRes.data : [];
  const students = studentsRes.success && studentsRes.data ? studentsRes.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Class Recordings Archive"
        subtitle="Audit, view, edit, and play all live session video recordings published across ChessHub Academy."
      />

      <AdminRecordingsArchiveClient
        classes={classes}
        coaches={coaches}
        students={students}
      />
    </div>
  );
}
