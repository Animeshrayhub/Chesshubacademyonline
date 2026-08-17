import React from 'react';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import CoachPuzzleManager from '@/features/coach/CoachPuzzleManager';

import { getCoachCohort } from '@/lib/coaches';

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

  // Fetch comprehensive coach student cohort
  const cohortRes = await getCoachCohort();
  const cohort = cohortRes.success && cohortRes.data ? cohortRes.data : [];

  const assignedStudents = cohort.map((s) => ({
    id: s.profileId,
    name: `${s.firstName} ${s.lastName}`.trim() || 'Academy Student',
    email: s.email,
  }));

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
