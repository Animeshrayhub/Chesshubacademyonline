import React from 'react';
import { redirect } from 'next/navigation';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getAcademyLeaderboard } from '@/lib/students/leaderboard';
import { buildDynamicAcademyCohort } from '@/lib/students/leaderboardSimulation';
import StudentLeaderboardHub from '@/features/student/StudentLeaderboardHub';

export const dynamic = 'force-dynamic';

export default async function StudentLeaderboardPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirectTo=/dashboard/student/leaderboard');
  }

  const res = await getAcademyLeaderboard(user.id);
  const data = res.success && res.data ? res.data : (() => {
    const sim = buildDynamicAcademyCohort([], user.id);
    return {
      entries: {
        xp: [],
        tactics: [],
        homework: [],
        rating: [],
      },
      divisions: sim.divisions,
      tickerEvents: sim.tickerEvents,
      seasonInfo: sim.seasonInfo,
      yourStanding: null,
      totalStudents: 0,
      lastUpdated: new Date().toISOString(),
    };
  })();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academy Leaderboard"
        subtitle="Track your standing among fellow academy peers across XP, tactics solves, workbook completions, and chess rating."
      />

      <StudentLeaderboardHub
        initialData={data}
        currentUserId={user.id}
      />
    </div>
  );
}
