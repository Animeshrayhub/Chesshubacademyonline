import PageHeader from '@/components/dashboard/ui/PageHeader';
import { getMyCoachProfile } from '@/lib/coaches';

export default async function CoachProfilePage() {
  const result = await getMyCoachProfile();
  const profile = result.success ? result.data : null;

  const displayName = profile
    ? `${profile.title ? profile.title + ' ' : ''}${profile.firstName} ${profile.lastName}`.trim()
    : null;

  const hasProfile = profile !== null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Coach Profile"
        subtitle="View your credentials as configured by the academy administrator. Contact support to request edits to title, rating, or display name."
      />

      <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
        <h3 className="text-base font-bold text-text-primary mb-1">Official Credentials</h3>
        <p className="text-xs text-text-secondary leading-relaxed mb-6">
          To maintain credentials integrity, only administrators can modify FIDE titles, FIDE ratings,
          and official display names. Contact support to request edits.
        </p>

        {!hasProfile ? (
          <p className="text-sm text-text-secondary italic">
            Profile information has not been completed yet. Please contact an administrator to set up your
            coach profile.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Official Display Name
              </label>
              <input
                type="text"
                value={displayName ?? '—'}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                Academy Email
              </label>
              <input
                type="email"
                value={profile.email}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                FIDE Title
              </label>
              <input
                type="text"
                value={profile.title ?? 'Not set'}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none"
                readOnly
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-text-primary mb-2">
                FIDE Rating
              </label>
              <input
                type="text"
                value={profile.fideRating !== null ? String(profile.fideRating) : 'Not set'}
                disabled
                className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none"
                readOnly
              />
            </div>

            {profile.country && (
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={profile.country}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none"
                  readOnly
                />
              </div>
            )}

            {profile.fideId && (
              <div>
                <label className="block text-sm font-semibold text-text-primary mb-2">
                  FIDE ID
                </label>
                <input
                  type="text"
                  value={profile.fideId}
                  disabled
                  className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none"
                  readOnly
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
