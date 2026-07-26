export default function StudentAppearanceSettingsPage() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
      <h3 className="text-base font-bold text-text-primary mb-4">Student Theme Preferences</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Interface Theme</label>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 border-2 border-primary rounded-xl bg-surface-light text-center cursor-pointer">
              <span className="text-sm font-bold text-text-primary">Default Light Mode</span>
            </div>
            <div className="p-4 border border-border rounded-xl bg-surface-dark text-center opacity-65 cursor-not-allowed">
              <span className="text-sm font-bold text-white">Dark Theme (Future)</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors duration-150"
          >
            Apply Theme Changes
          </button>
        </div>
      </div>
    </div>
  );
}
