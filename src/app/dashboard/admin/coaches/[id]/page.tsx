import React from 'react';
import CoachProfileDetail from '@/features/admin/CoachProfileDetail';
import { getCoachDetails } from '@/lib/coaches';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function AdminCoachDetailPage({ params }: PageProps) {
  const result = await getCoachDetails(params.id);

  if (!result.success || !result.data) {
    notFound();
  }

  const coach = result.data;

  return <CoachProfileDetail coach={coach} />;
}
