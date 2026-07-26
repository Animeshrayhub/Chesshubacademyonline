import { getMyCoachProfile } from '@/lib/coaches';

export default async function CoachGeneralSettingsPage() {
  const result = await getMyCoachProfile();
  const profile = result.success ? result.data : null;

  const displayName = profile
    ? `${profile.title ? profile.title + ' ' : ''}${profile.firstName} ${profile.lastName}`.trim()
    : '—';

  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
      <h3 className="text-base font-bold text-text-primary mb-1">Coach Portal Settings</h3>
      <p className="text-xs text-text-secondary leading-relaxed mb-6">
        Your account details are managed by the academy administrator. To update your name, email, or
        credentials, please contact support.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Display Full Name
          </label>
          <input
            type="text"
            value={displayName}
            disabled
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none"
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Academic Email
          </label>
          <input
            type="email"
            value={profile?.email ?? '—'}
            disabled
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none"
            readOnly
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">
            Languages
          </label>
          <input
            type="text"
            value={profile?.languages?.length ? profile.languages.join(', ') : 'Not set'}
            disabled
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none"
            readOnly
          />
          <p className="text-xs text-text-secondary mt-1">
            Edit your languages in{' '}
            <a
              href="/dashboard/coach/settings/profile"
              className="text-primary font-semibold hover:underline"
            >
              Profile Customizations
            </a>
            .
          </p>
        </div>
      </div>
    </div>
  );
}
