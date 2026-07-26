import React from 'react';
import CoachRegistry from '@/features/admin/CoachRegistry';
import { listCoaches } from '@/lib/coaches';

export const dynamic = 'force-dynamic';

export default async function AdminCoachesPage() {
  const result = await listCoaches();
  const coaches = result.success ? (result.data ?? []) : [];

  return <CoachRegistry coaches={coaches} />;
}
