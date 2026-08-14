import React from 'react';
import CoachProfileDetail from '@/features/admin/CoachProfileDetail';
import { getCoachDetails } from '@/lib/coaches';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function AdminCoachDetailPage({ params }: PageProps) {
  const result = await getCoachDetails(params.id);

  if (!result.success || !result.data) {
    redirect('/dashboard/admin/coaches');
  }

  const coach = result.data;

  return <CoachProfileDetail coach={coach} />;
}
