import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import StudentClassesList from '@/features/student/StudentClassesList';
import { getStudentClasses } from '@/lib/students';

export const dynamic = 'force-dynamic';

export default async function StudentClassesPage() {
  const classesRes = await getStudentClasses();
  const classes = classesRes.success && classesRes.data ? classesRes.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Classes & Learning Reports"
        subtitle="Track your completed live sessions, view coach feedbacks, and enter active board classrooms."
      />

      <StudentClassesList classes={classes} />
    </div>
  );
}
