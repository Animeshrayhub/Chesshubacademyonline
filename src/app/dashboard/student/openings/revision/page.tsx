import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import { getStudentMistakes } from '@/lib/openings';
import RevisionClient from './RevisionClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Weakness Revision Mode | ChessHub AI Opening Teacher',
  description: 'Replay and fix your past opening blunders with your AI Coach.',
};

export default async function RevisionPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'STUDENT') redirect('/dashboard');

  const result = await getStudentMistakes(user.id, undefined, false);
  const mistakes = result.success ? result.data : [];

  return <RevisionClient initialMistakes={mistakes} />;
}
