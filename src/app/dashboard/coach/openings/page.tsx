import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { listOpenings } from '@/lib/openings';
import CoachOpeningsClient from './CoachOpeningsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Opening Assignments | Coach Dashboard',
  description: 'Manage assigned student opening progress, difficulty overrides, and chapter locks.',
};

export default async function CoachOpeningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'COACH' && user.role !== 'ADMIN') redirect('/dashboard');

  const openingsRes = await listOpenings();
  const openings = openingsRes.success ? openingsRes.data : [];

  return <CoachOpeningsClient initialOpenings={openings} />;
}
