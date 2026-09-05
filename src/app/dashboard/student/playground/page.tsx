import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getStudentDashboardStats } from '@/lib/students';
import KidsChessPlayground from '@/features/student/KidsChessPlayground';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Kids Chess Playground & Hero Academy | ChessHub Academy',
  description: 'Interactive chess minigames: Knight’s Star Maze, Pawn Sprint, King’s Castle Escape, and Superhero Quests.',
};

export default async function KidsPlaygroundPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const statsRes = await getStudentDashboardStats();
  const xp = statsRes.success && statsRes.data?.xp != null ? statsRes.data.xp : 0;

  return (
    <div className="space-y-6">
      <KidsChessPlayground
        initialXp={xp}
        studentName={user.firstName || 'Champion'}
      />
    </div>
  );
}
