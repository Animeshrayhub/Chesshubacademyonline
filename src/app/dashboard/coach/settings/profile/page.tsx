import { getMyCoachProfile } from '@/lib/coaches';
import CoachProfileForm from './CoachProfileForm';

export default async function CoachProfileSettingsPage() {
  const result = await getMyCoachProfile();
  const profile = result.success ? result.data : null;

  if (!profile) {
    return (
      <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
        <h3 className="text-base font-bold text-text-primary mb-4">Profile Customizations</h3>
        <p className="text-sm text-text-secondary italic">
          Your coach profile has not been set up yet. Please contact an administrator.
        </p>
      </div>
    );
  }

  return (
    <CoachProfileForm
      bio={profile.bio}
      languages={profile.languages}
      whatsapp={profile.whatsapp}
      experienceYears={profile.experienceYears}
    />
  );
}
