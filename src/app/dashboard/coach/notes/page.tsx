import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import NotesRegistry from '@/features/coach/NotesRegistry';
import { getCoachCohort } from '@/lib/coaches';

export const dynamic = 'force-dynamic';

export default async function CoachNotesPage() {
  const cohortRes = await getCoachCohort();
  const cohort = cohortRes.success && cohortRes.data ? cohortRes.data : [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Student Study Notes"
        subtitle="Write progress reviews, note tactical highlights, and track specific opening theories students need to study."
      />

      <NotesRegistry students={cohort} />
    </div>
  );
}
