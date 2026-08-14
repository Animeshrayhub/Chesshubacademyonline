import React from 'react';
import StudentProfileDetail from '@/features/admin/StudentProfileDetail';
import { getStudentDetails } from '@/lib/students';
import { listCoaches } from '@/lib/coaches';
import { getStudentEnrollmentsById, listHomework } from '@/lib/homework';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function AdminStudentDetailPage({ params }: PageProps) {
  const [studentRes, coachesRes] = await Promise.all([
    getStudentDetails(params.id),
    listCoaches(),
  ]);

  if (!studentRes.success || !studentRes.data) {
    redirect('/dashboard/admin/students');
  }

  const student = studentRes.data;
  const coaches = coachesRes.success ? (coachesRes.data ?? []) : [];

  // Fetch enrollments and all available courses (workbooks)
  const studentProfileId = student.profile?.id || '';
  const [enrollmentsRes, coursesRes] = await Promise.all([
    studentProfileId ? getStudentEnrollmentsById(studentProfileId) : { success: true, data: [] },
    listHomework(),
  ]);

  const enrollments = enrollmentsRes.success ? (enrollmentsRes.data ?? []) : [];
  const courses = coursesRes.success ? (coursesRes.data ?? []) : [];

  return (
    <StudentProfileDetail
      student={student}
      coaches={coaches}
      enrollments={enrollments}
      courses={courses}
    />
  );
}
