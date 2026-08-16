import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getOpeningsWithProgress } from '@/lib/openings';
import OpeningLibraryClient from '@/app/dashboard/student/openings/OpeningLibraryClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'AI Opening Teacher | Admin Portal',
  description: 'Manage and review chess openings with AI coaching engine.',
};

export default async function AdminOpeningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const result = await getOpeningsWithProgress(user.id);
  const openings = result.success ? result.data : [];

  const inProgress = openings.filter(o => o.progress?.status === 'in_progress');
  const beginner = openings.filter(o => o.difficulty === 'Beginner');
  const intermediate = openings.filter(o => o.difficulty === 'Intermediate');
  const advanced = openings.filter(o => o.difficulty === 'Advanced');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-text-primary">♟ AI Opening Teacher</h1>
          <p className="text-sm text-text-secondary">Interactive opening repertoire engine & AI master coach</p>
        </div>
      </div>
      <OpeningLibraryClient
        openings={openings}
        inProgress={inProgress}
        beginner={beginner}
        intermediate={intermediate}
        advanced={advanced}
        studentName={user.firstName ?? 'Administrator'}
      />
    </div>
  );
}
