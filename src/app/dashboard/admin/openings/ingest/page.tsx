import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import IngestOpeningsClient from './IngestOpeningsClient';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Lichess Opening Database Ingestion | Admin Dashboard',
  description: 'Ingest 3,000+ master chess openings from official Lichess open-source TSV repository.',
};

export default async function IngestOpeningsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  if (user.role !== 'ADMIN') redirect('/dashboard');

  return <IngestOpeningsClient />;
}
