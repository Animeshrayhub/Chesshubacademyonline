export default function StudentNotificationsSettingsPage() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
      <h3 className="text-base font-bold text-text-primary mb-4">Student Notifications Preferences</h3>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 p-4 border border-border rounded-xl">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Email for Live Classes</h4>
            <p className="text-xs text-text-secondary mt-0.5">Receive email reminders 1 hour before scheduled Zoom classes start.</p>
          </div>
          <input type="checkbox" defaultChecked disabled className="w-4.5 h-4.5 rounded border-border" />
        </div>

        <div className="flex items-start justify-between gap-4 p-4 border border-border rounded-xl">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Homework Assign Alerts</h4>
            <p className="text-xs text-text-secondary mt-0.5">Show notifications when a new workbook chapter or puzzle sheet is assigned.</p>
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
