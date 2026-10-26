import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getStudentHomework, getStudentEnrollments, getStudentDashboardStats } from '@/lib/students';
import { listChessStudiesAction } from '@/actions/studies';
import StudentMyLearningHub from '@/features/student/StudentMyLearningHub';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My Learning & Curriculum | ChessHub Academy',
  description: 'Access assigned curriculum workbooks, tactical chapters, PGN studies, and coach feedback.',
};

export default async function StudentMyLearningPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirectTo=/dashboard/student/learning');
  }

  const [homeworkRes, enrollmentsRes, statsRes, studiesRes] = await Promise.all([
    getStudentHomework(),
    getStudentEnrollments(),
    getStudentDashboardStats(),
    listChessStudiesAction(),
  ]);

  const assignments = homeworkRes.success && homeworkRes.data ? homeworkRes.data : [];
  const enrollments = enrollmentsRes.success && enrollmentsRes.data ? enrollmentsRes.data : [];
  const stats = statsRes.success && statsRes.data ? statsRes.data : null;
  const studies = studiesRes.success && studiesRes.data ? studiesRes.data : [];

  return (
    <StudentMyLearningHub
      user={{
        id: user.id,
        firstName: user.firstName || 'Champion',
        email: user.email || '',
      }}
      assignments={assignments}
      enrollments={enrollments}
      studies={studies}
      nextClass={stats?.nextClass}
      liveClass={stats?.liveClass}
    />
  );
}
