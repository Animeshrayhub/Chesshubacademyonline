import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getOpeningsWithProgress } from '@/lib/openings';
import CoachOpeningsClient from '@/app/dashboard/coach/openings/CoachOpeningsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Opening Assignments & Progress | Admin Portal',
  description: 'Inspect assigned student opening performance, adjust difficulty tracks, and override chapter locks.',
};

export default async function AdminOpeningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const result = await getOpeningsWithProgress(user.id);
  const openings = result.success ? result.data : [];

  return (
    <CoachOpeningsClient initialOpenings={openings} isAdminView={true} />
  );
}
