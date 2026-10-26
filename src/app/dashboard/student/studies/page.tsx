import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default function StudentStudiesPage() {
  redirect('/dashboard/student/learning');
}

