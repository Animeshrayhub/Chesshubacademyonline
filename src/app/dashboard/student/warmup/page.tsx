import React from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import StudentPuzzleTrainer from '@/features/student/StudentPuzzleTrainer';

export const dynamic = 'force-dynamic';

export default function StudentWarmupPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="3-Min Warmup & Mistake Review Bank"
        subtitle="Curated tactical warmup puzzles to prepare before live sessions, plus mistake review."
      />

      <StudentPuzzleTrainer />
    </div>
  );
}
