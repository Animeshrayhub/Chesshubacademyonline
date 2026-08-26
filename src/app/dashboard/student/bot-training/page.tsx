import React from 'react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/supabase/auth';
import StudentBotTrainingView from '@/components/dashboard/ui/StudentBotTrainingView';

export const dynamic = 'force-dynamic';

export default async function StudentBotTrainingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect('/login?redirectTo=/dashboard/student/bot-training');
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <StudentBotTrainingView />
    </div>
  );
}
