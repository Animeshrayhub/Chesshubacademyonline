'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import type { TableColumn } from '@/types/dashboard';

const COLUMNS: TableColumn[] = [
  { key: 'title', label: 'Post Title' },
  { key: 'category', label: 'Category' },
  { key: 'status', label: 'Status' },
  { key: 'date', label: 'Publish Date' },
  { key: 'actions', label: 'Actions' },
];

export default function AllPostsPage() {
  const [posts, setPosts] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/blog');
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts || []);
      }
    } catch (err) {
      console.error('Failed to fetch blog posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this blog post?')) return;
    try {
      const res = await fetch(`/api/blog?id=${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setPosts((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert(data.error || 'Failed to delete post');
      }
    } catch (err) {
      alert('Error deleting post');
    }
  };

  const filteredPosts = posts.filter((p) =>
    p.title?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const rows = filteredPosts.map((post) => ({
    id: post.id,
    title: (
      <div>
        <div className="font-semibold text-text-primary text-sm">{post.title}</div>
        <div className="text-xs text-text-secondary truncate max-w-xs">{post.slug}</div>
      </div>
    ),
    category: (
      <span className="px-2.5 py-1 bg-surface-light border border-border text-text-primary text-xs font-semibold rounded-lg">
        {post.category || 'General'}
      </span>
    ),
    status: (
      <span
        className={`px-2.5 py-1 text-xs font-bold rounded-full ${
          post.status === 'published'
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
            : 'bg-amber-100 text-amber-800 border border-amber-200'
        }`}
      >
        {post.status === 'published' ? 'Published' : 'Draft'}
      </span>
    ),
    date: (
      <span className="text-xs text-text-secondary">
        {post.published_at ? new Date(post.published_at).toLocaleDateString() : 'Not published'}
      </span>
    ),
    actions: (
      <div className="flex items-center gap-2">
        {post.status === 'published' && (
          <a
            href={`/blog/${post.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-semibold rounded-lg transition-colors"
          >
            View Live ↗
          </a>
        )}
        <button
          type="button"
          onClick={() => handleDelete(post.id)}
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
          placeholder="Search published articles..."
          className="max-w-md"
        />
        <Link
          href="/dashboard/admin/blog/create"
          className="px-4 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-bold rounded-xl transition-all shadow-sm flex items-center gap-1.5"
        >
          <span>+ Create New Article</span>
        </Link>
      </div>

      <DashboardTable
        columns={COLUMNS}
        rows={rows}
        emptyTitle={loading ? 'Loading Articles...' : 'No Blog Articles Found'}
        emptyDescription="Drafted articles will show up in the Drafts tab. Write and publish your first article to see it here."
      />
    </div>
  );
}
