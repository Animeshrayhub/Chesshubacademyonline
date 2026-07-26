import React from 'react';
import StudentHomeworkRegistry from '@/features/student/StudentHomeworkRegistry';
import { getStudentHomework } from '@/lib/students';

export const dynamic = 'force-dynamic';

export default async function StudentHomeworkOverviewPage() {
  const homeworkRes = await getStudentHomework();
  const assignments = homeworkRes.success && homeworkRes.data ? homeworkRes.data : [];

  return (
    <div className="space-y-4">
      <StudentHomeworkRegistry assignments={assignments} />
    </div>
  );
}
