import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import PGNAnalyzerClient from './PGNAnalyzerClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'PGN Opening Analyzer | ChessHub AI Opening Teacher',
  description: 'Paste any PGN game to analyze opening theory match and pinpoint theory deviations.',
};

export default async function PGNAnalyzerPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'STUDENT') redirect('/dashboard');

  return <PGNAnalyzerClient />;
}
