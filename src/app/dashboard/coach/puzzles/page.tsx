import React from 'react';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import CoachPuzzleManager from '@/features/coach/CoachPuzzleManager';

export const dynamic = 'force-dynamic';

export default async function CoachPuzzlesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirectTo=/dashboard/coach/puzzles');
  }

  const admin = createSupabaseAdmin();
  const { data: dbUser } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (dbUser?.role !== 'COACH' && dbUser?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  // Fetch coach's assigned students
  const { data: coachProfile } = await admin
    .from('coach_profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();

  let assignedStudents: Array<{ id: string; name: string; email: string }> = [];

  if (coachProfile) {
    const { data: studentsData } = await admin
      .from('student_profiles')
      .select('id, user_id, users(first_name, last_name, email)')
      .eq('assigned_coach_id', coachProfile.id);

    if (studentsData) {
      assignedStudents = studentsData.map((s: any) => ({
        id: s.id,
        name: s.users ? `${s.users.first_name} ${s.users.last_name}` : 'Student',
        email: s.users?.email || '',
      }));
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Coach Tactical Puzzle Hub"
        subtitle="Explore tactical positions, test-solve combinations, and assign custom puzzle sets to your assigned chess students."
      />
      <CoachPuzzleManager students={assignedStudents} />
    </div>
  );
}
