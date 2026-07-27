import React from 'react';
import { getMyStudentProfile } from '@/lib/students';
import { getCurrentUser } from '@/lib/supabase/auth';
import StudentGeneralSettingsForm from '@/features/student/StudentGeneralSettingsForm';

export const dynamic = 'force-dynamic';

export default async function StudentGeneralSettingsPage() {
  const profileRes = await getMyStudentProfile();
  const authUser = await getCurrentUser();

  const profile = profileRes.success ? profileRes.data : null;

  const displayName = profile
    ? `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || profile.email.split('@')[0]
    : authUser
    ? `${authUser.firstName || ''} ${authUser.lastName || ''}`.trim() || authUser.username || authUser.email
    : 'Student';

  const email = profile?.email || authUser?.email || '';
  const timezone = profile?.timezone || 'UTC+5:30 (India Standard Time)';
  const level = profile?.level || 'BEGINNER';

  return (
    <div className="bg-white rounded-3xl border border-border shadow-card p-6 max-w-2xl space-y-4">
      <div>
        <h3 className="text-lg font-bold text-text-primary">Student Profile Preferences</h3>
        <p className="text-xs text-text-secondary mt-1">
          Manage display preferences, academic email details, and local timezone updates.
        </p>
      </div>

      <StudentGeneralSettingsForm
        initialData={{
          displayName,
          email,
          timezone,
          level,
        }}
      />
    </div>
  );
}
