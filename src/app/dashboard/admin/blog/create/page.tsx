export default function CreatePostPage() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6 max-w-3xl">
      <h3 className="text-base font-bold text-text-primary mb-4">Draft New Blog Article</h3>

      <div className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Title</label>
          <input
            type="text"
            placeholder="e.g. 5 Opening Mistakes Every Beginner Makes"
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">Category</label>
            <select className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary">
              <option>Parent Guide</option>
              <option>Chess Strategy</option>
              <option>Tournament Prep</option>
              <option>Academy News</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-text-primary mb-2">Estimated Read Time (Minutes)</label>
            <input
              type="number"
              defaultValue={5}
              className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Excerpt</label>
          <textarea
            rows={2}
            placeholder="Provide a short summary of the article..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-text-primary mb-2">Content Body</label>
          <textarea
            rows={8}
            placeholder="Write article content using markdown formatting..."
            className="w-full px-4 py-3 rounded-xl border border-border bg-white text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary font-mono"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="px-4 py-2.5 border border-border bg-white text-text-primary hover:bg-surface-light rounded-xl text-sm font-semibold transition-colors duration-150"
          >
            Save Draft
          </button>
          <button
            type="button"
            className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-semibold transition-colors duration-150"
          >
            Publish Article
          </button>
        </div>
      </div>
    </div>
  );
}
