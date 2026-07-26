export default function CoachSecuritySettingsPage() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
      <h3 className="text-base font-bold text-text-primary mb-4">Coach Security Settings</h3>
      <p className="text-xs text-text-secondary leading-relaxed mb-4">
        To maintain portal integrity, password resets and account security protocols must be coordinated through the main administrator desk.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Current Password</label>
          <input
            type="password"
            placeholder="••••••••••••"
            disabled
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">New Password</label>
          <input
            type="password"
            placeholder="••••••••••••"
            disabled
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors duration-150"
          >
            Update Password
          </button>
        </div>
      </div>
    </div>
  );
}
