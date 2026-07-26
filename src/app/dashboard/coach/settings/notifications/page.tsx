export default function CoachNotificationsSettingsPage() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
      <h3 className="text-base font-bold text-text-primary mb-4">Coach Notifications Preferences</h3>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 p-4 border border-border rounded-xl">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Email for Class Bookings</h4>
            <p className="text-xs text-text-secondary mt-0.5">Receive notifications when the admin books a student session with you.</p>
          </div>
          <input type="checkbox" defaultChecked disabled className="w-4.5 h-4.5 rounded border-border" />
        </div>

        <div className="flex items-start justify-between gap-4 p-4 border border-border rounded-xl">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Homework Submissions Alert</h4>
            <p className="text-xs text-text-secondary mt-0.5">Receive alert flags when an assigned student finishes a workbook study chapter.</p>
          </div>
          <input type="checkbox" defaultChecked disabled className="w-4.5 h-4.5 rounded border-border" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors duration-150"
          >
            Save Notification Prefs
          </button>
        </div>
      </div>
    </div>
  );
}
