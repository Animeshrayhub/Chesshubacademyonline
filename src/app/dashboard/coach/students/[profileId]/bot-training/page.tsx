import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import StudentBotTrainingDetailView from '@/features/coach/StudentBotTrainingDetailView';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    profileId: string;
  };
}

export default async function CoachStudentBotTrainingPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user || (user.role !== 'COACH' && user.role !== 'ADMIN')) {
    redirect('/login');
  }

  const admin = createSupabaseAdmin();
  const { data: profile } = await admin
    .from('student_profiles')
    .select('id, user_id')
    .eq('id', params.profileId)
    .maybeSingle();

  if (!profile) {
    redirect('/dashboard/coach/students');
  }

  const { data: studentUser } = await admin
    .from('users')
    .select('first_name, last_name')
    .eq('id', profile.user_id)
    .maybeSingle();

  const studentName = studentUser ? `${studentUser.first_name} ${studentUser.last_name}` : 'Student';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <StudentBotTrainingDetailView
        studentUserId={profile.user_id}
        profileId={params.profileId}
        studentName={studentName}
      />
    </div>
  );
}
