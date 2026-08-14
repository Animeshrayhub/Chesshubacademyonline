import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getOpeningsWithProgress } from '@/lib/openings';
import OpeningLibraryClient from './OpeningLibraryClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'AI Opening Teacher | ChessHub Academy',
  description: 'Learn chess openings with an AI coach. Interactive lessons, adaptive difficulty, and personalized feedback.',
};

export default async function OpeningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const result = await getOpeningsWithProgress(user.id);
  const openings = result.success ? result.data : [];

  // Sort sections
  const inProgress = openings.filter(o =>
    o.progress?.status === 'in_progress'
  );
  const beginner = openings.filter(o => o.difficulty === 'Beginner');
  const intermediate = openings.filter(o => o.difficulty === 'Intermediate');
  const advanced = openings.filter(o => o.difficulty === 'Advanced');

  return (
    <OpeningLibraryClient
      openings={openings}
      inProgress={inProgress}
      beginner={beginner}
      intermediate={intermediate}
      advanced={advanced}
      studentName={user.firstName ?? 'Student'}
    />
  );
}
