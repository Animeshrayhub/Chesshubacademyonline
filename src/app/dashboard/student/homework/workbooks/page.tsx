import { getStudentEnrollments } from '@/lib/students';
import StudentCourseSyllabus from '@/features/student/StudentCourseSyllabus';
import PageHeader from '@/components/dashboard/ui/PageHeader';

export const dynamic = 'force-dynamic';

export default async function StudentWorkbooksPage() {
  const enrollmentsRes = await getStudentEnrollments();
  const enrollments = enrollmentsRes.success && enrollmentsRes.data ? enrollmentsRes.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Learning Courses"
        subtitle="Access your syllabus modules, video lectures, and workbook assignments. Complete tasks sequentially to unlock subsequent chapters."
      />
      <StudentCourseSyllabus enrollments={enrollments} />
    </div>
  );
}
