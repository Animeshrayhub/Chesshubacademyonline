import React from 'react';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentTemplateAssignments } from '@/lib/homework';
import StudentAssignmentsView from '@/features/student/StudentAssignmentsView';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My Assignments | ChessHub Academy' };

export default async function StudentAssignmentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const admin = createSupabaseAdmin();
  let studentProfile = null;
  const { data: existingProfile } = await admin
    .from('student_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existingProfile) {
    studentProfile = existingProfile;
  } else {
    const { data: newProfile } = await admin
      .from('student_profiles')
      .insert({ user_id: user.id, rating: 1200 })
      .select('id')
      .single();
    studentProfile = newProfile || { id: user.id };
  }

  const assignmentsRes = await getStudentTemplateAssignments(studentProfile.id);
  const assignments = assignmentsRes.success && assignmentsRes.data ? assignmentsRes.data : [];

  return <StudentAssignmentsView assignments={assignments} />;
}
