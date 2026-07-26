import React from 'react';
import StudentRegistry from '@/features/admin/StudentRegistry';
import { listStudents } from '@/lib/students';
import { listCoaches } from '@/lib/coaches';

export const dynamic = 'force-dynamic';

export default async function AdminStudentsPage() {
  const [studentsRes, coachesRes] = await Promise.all([
    listStudents(),
    listCoaches(),
  ]);
  
  const students = studentsRes.success ? (studentsRes.data ?? []) : [];
  const coaches = coachesRes.success ? (coachesRes.data ?? []) : [];

  return <StudentRegistry students={students} coaches={coaches} />;
}
