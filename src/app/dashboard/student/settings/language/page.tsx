export default function StudentLanguageSettingsPage() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-2xl">
      <h3 className="text-base font-bold text-text-primary mb-4">Localization & Language</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Display Language</label>
          <select className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary">
            <option>English (United States)</option>
            <option disabled>Spanish (Future Support)</option>
            <option disabled>Hindi (Future Support)</option>
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors duration-150"
          >
            Apply Language preferences
          </button>
        </div>
      </div>
    </div>
  );
}
