import React from 'react';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getCurrentUser } from '@/lib/supabase/auth';
import { createSupabaseAdmin } from '@/lib/supabase/admin';
import { getStudentSavedGames } from '@/lib/games';
import GameRepositoryView from '@/components/dashboard/ui/GameRepositoryView';
import DashboardIcon from '@/components/dashboard/ui/DashboardIcon';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function StudentGamesPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirectTo=/dashboard/student/games');
  }

  const admin = createSupabaseAdmin();

  // Resolve student profile or auto-provision
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

  // Fetch student saved games
  const gamesRes = await getStudentSavedGames(studentProfile.id);
  const games = gamesRes.success && gamesRes.data ? gamesRes.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Personal Game Repository"
          subtitle="Import PGN games, save Lichess logs, and analyze positions in your personal workspace."
        />
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-primary font-semibold transition-colors"
        >
          <DashboardIcon iconKey="arrowLeft" className="w-3.5 h-3.5" />
          Back to Overview
        </Link>
      </div>

      <GameRepositoryView initialGames={games} />
    </div>
  );
}
