'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Draft Title' },
  { key: 'category', label: 'Category' },
  { key: 'lastSaved', label: 'Last Saved' },
  { key: 'actions', label: 'Actions' },
];

export default function BlogDraftsPage() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchDrafts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/blog?status=draft');
      const data = await res.json();
      if (data.success) {
        setDrafts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch drafts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, []);

  const handlePublishNow = async (draft: any) => {
    try {
      const res = await fetch('/api/blog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          title: draft.title,
          category: draft.category || 'Parent Guide',
          readingTimeMinutes: draft.reading_time_minutes || 5,
          excerpt: draft.excerpt || '',
          content: draft.content,
          imageUrl: draft.featured_image_url,
          status: 'published',
        }),
      });

      const data = await res.json();
      if (data.success) {
        alert('🎉 Article published successfully!');
        fetchDrafts();
      } else {
        alert(data.error || 'Failed to publish article');
      }
    } catch (err) {
      alert('Error publishing article');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this draft?')) return;
    try {
      const res = await fetch(`/api/blog?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDrafts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert(data.error || 'Failed to delete draft');
      }
    } catch (err) {
      alert('Error deleting draft');
    }
  };

  const filteredDrafts = drafts.filter((p) =>
    p.title?.toLowerCase().includes(search.toLowerCase())
  );

  const rows = filteredDrafts.map((draft) => ({
    id: draft.id,
    title: (
      <div>
        <div className="font-semibold text-text-primary text-sm">{draft.title}</div>
        <div className="text-xs text-text-secondary truncate max-w-xs">{draft.excerpt || 'No excerpt'}</div>
      </div>
    ),
    category: (
      <span className="px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold rounded-lg">
        {draft.category || 'Draft'}
      </span>
    ),
    lastSaved: (
      <span className="text-xs text-text-secondary">
        {draft.updated_at ? new Date(draft.updated_at).toLocaleString() : 'N/A'}
      </span>
    ),
    actions: (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handlePublishNow(draft)}
          className="px-3 py-1 bg-primary hover:bg-primary-dark text-white text-xs font-semibold rounded-lg transition-colors shadow-sm"
        >
          🚀 Publish Now
        </button>
        <button
          type="button"
          onClick={() => handleDelete(draft.id)}
          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors border border-rose-200"
        >
          Delete
        </button>
      </div>
    ),
  }));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <TableSearchBar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search draft articles..."
          className="max-w-md"
        />
        <Link
          href="/dashboard/admin/blog/create"
          className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition-all shadow-sm"
        >
          + Create New Draft
        </Link>
      </div>

      <DashboardTable
        columns={COLUMNS}
        rows={rows}
        emptyTitle={loading ? 'Loading Drafts...' : 'No Drafts Available'}
        emptyDescription="Drafted articles that are not yet published will appear here."
      />
    </div>
  );
}
