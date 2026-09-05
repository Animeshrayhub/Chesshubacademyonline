import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import KidsChessPlayground from '@/features/student/KidsChessPlayground';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Kids Chess Playground & Hero Academy | ChessHub Academy',
  description: 'Interactive chess minigames: Knight’s Star Maze, Pawn Sprint, King’s Castle Escape, and Superhero Quests.',
};

export default async function KidsPlaygroundPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  return (
    <div className="space-y-6">
      <KidsChessPlayground />
    </div>
  );
}
