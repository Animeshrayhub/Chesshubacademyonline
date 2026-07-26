export default function GeneralSettingsPage() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
      <h3 className="text-base font-bold text-text-primary mb-4">Academy System Settings</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Academy Site Name</label>
          <input
            type="text"
            defaultValue="ChessHub Academy"
            disabled
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">System Support Email</label>
          <input
            type="email"
            defaultValue="clubchess259@gmail.com"
            disabled
            className="w-full px-4 py-3 rounded-xl border border-border bg-surface-light text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Academic Term Target</label>
          <select className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option>Summer Term 2026</option>
            <option>Autumn Term 2026</option>
            <option>Spring Term 2027</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors duration-150"
          >
            Save General Changes
          </button>
        </div>
      </div>
    </div>
  );
}
