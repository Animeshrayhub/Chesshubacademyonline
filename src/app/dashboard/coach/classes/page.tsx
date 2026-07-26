import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import CoachClassesList from '@/features/coach/CoachClassesList';
import { getCoachClasses } from '@/lib/coaches';

export const dynamic = 'force-dynamic';

export default async function CoachClassesPage() {
  const classesRes = await getCoachClasses();
  const classes = classesRes.success && classesRes.data ? classesRes.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Classes & History Reports"
        subtitle="View details of scheduled classes and search past class history records."
      />

      <CoachClassesList classes={classes} />
    </div>
  );
}
