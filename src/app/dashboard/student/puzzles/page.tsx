import React from 'react';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import StudentPuzzleTrainer from '@/features/student/StudentPuzzleTrainer';

export const dynamic = 'force-dynamic';

export default async function StudentPuzzlesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirectTo=/dashboard/student/puzzles');
  }

  const admin = createSupabaseAdmin();
  const { data: dbUser } = await admin
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (dbUser?.role !== 'STUDENT' && dbUser?.role !== 'ADMIN') {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tactical Puzzle Practice Hub"
        subtitle="Train tactical calculation, pattern recognition, checkmate combinations, and endgame puzzles."
      />
      <StudentPuzzleTrainer />
    </div>
  );
}
