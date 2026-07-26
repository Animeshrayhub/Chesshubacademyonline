export default function SystemSettingsPage() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
      <h3 className="text-base font-bold text-text-primary mb-4">System Utilities</h3>

      <div className="space-y-4">
        <div className="flex items-start justify-between gap-4 p-4 border border-border rounded-xl">
          <div>
            <h4 className="text-sm font-semibold text-text-primary">Maintenance Mode</h4>
            <p className="text-xs text-text-secondary mt-0.5">Toggle maintenance overlay screen across all portal login paths.</p>
          </div>
          <input type="checkbox" disabled className="w-4.5 h-4.5 rounded border-border" />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors duration-150"
          >
            Apply Utility changes
          </button>
        </div>
      </div>
    </div>
  );
}
