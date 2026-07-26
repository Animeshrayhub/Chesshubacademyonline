import React from 'react';
import ClassesRegistry from '@/features/admin/ClassesRegistry';
import { listClasses } from '@/lib/classes';
import { listCoaches } from '@/lib/coaches';
import { listStudents } from '@/lib/students';

export const dynamic = 'force-dynamic';

export default async function AdminClassesPage() {
  const [classesRes, coachesRes, studentsRes] = await Promise.all([
    listClasses(),
    listCoaches(),
    listStudents(),
  ]);

  const classes = classesRes.success ? (classesRes.data ?? []) : [];
  const coaches = coachesRes.success ? (coachesRes.data ?? []) : [];
  const students = studentsRes.success ? (studentsRes.data ?? []) : [];

  return <ClassesRegistry classes={classes} coaches={coaches} students={students} />;
}
