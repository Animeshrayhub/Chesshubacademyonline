import React from 'react';
import { getMyStudentProfile } from '@/lib/students';
import StudentProfileForm from './StudentProfileForm';

export const dynamic = 'force-dynamic';

export default async function StudentProfileSettingsPage() {
  const result = await getMyStudentProfile();
  const profile = result.success ? result.data : null;

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl text-center">
        <h3 className="text-base font-bold text-text-primary mb-2">Profile Configuration</h3>
        <p className="text-sm text-text-secondary">
          Unable to load your student profile. Please contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-text-primary">Profile Customizations</h3>
        <p className="text-xs text-text-secondary mt-1">
          Customize your dashboard preferences, timezone settings, and parent contact details.
        </p>
      </div>

      <StudentProfileForm
        initialData={{
          avatarUrl: profile.avatarUrl,
          timezone: profile.timezone,
          parentWhatsapp: profile.parentWhatsapp,
        }}
      />
    </div>
  );
}
