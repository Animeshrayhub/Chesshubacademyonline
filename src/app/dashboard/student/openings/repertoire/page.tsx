import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { SEED_OPENINGS } from '@/data/openings/seed-openings';
import RepertoireClient from './RepertoireClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'My Repertoire | ChessHub AI Opening Teacher',
  description: 'Build your custom White & Black opening repertoire and practice memory drills.',
};

export default async function RepertoirePage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'STUDENT') redirect('/dashboard');

  return <RepertoireClient allOpenings={SEED_OPENINGS} />;
}
