import EmptyState from '@/components/dashboard/ui/EmptyState';

export default function BlogMediaPage() {
  return (
    <div className="bg-white rounded-2xl border border-border shadow-card p-6">
      <div className="flex items-center justify-between gap-4 mb-6">
        <h3 className="text-sm font-bold text-text-primary">Media Library</h3>
        <button
          type="button"
          className="px-4 py-2 bg-primary text-white font-semibold rounded-xl text-sm hover:bg-primary-dark transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Upload Image
        </button>
      </div>

      <EmptyState
        iconKey="image"
        title="No Media Assets Found"
        description="Upload banner photos, diagrams, or coach avatars to use inside blog posts and announcements."
      />
    </div>
  );
}
