'use client';

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import { approveReviewAction, deleteReviewAction, fetchAdminReviewsAction } from '@/actions/reviews';
import type { ReviewItem } from '@/lib/reviews';
import type { TableColumn } from '@/types/dashboard';

export default function ReviewsModerationRegistry() {
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [actionMessage, setActionMessage] = useState('');

  const loadReviews = async () => {
    setLoading(true);
    const res = await fetchAdminReviewsAction();
    if (res.success && res.reviews) {
      setReviews(res.reviews);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadReviews();
  }, []);

  const handleApprove = async (id: string) => {
    setActionMessage('');
    const res = await approveReviewAction(id);
    if (res.success) {
      setActionMessage('✓ Review approved and published to website!');
      loadReviews();
    } else {
      setActionMessage('❌ Failed to approve review.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to reject/delete this review?')) return;
    setActionMessage('');
    const res = await deleteReviewAction(id);
    if (res.success) {
      setActionMessage('✓ Review deleted.');
      loadReviews();
    } else {
      setActionMessage('❌ Failed to delete review.');
    }
  };

  const filteredReviews = reviews.filter((r) => {
    const matchesText =
      r.name.toLowerCase().includes(filterText.toLowerCase()) ||
      r.quote.toLowerCase().includes(filterText.toLowerCase()) ||
      (r.location && r.location.toLowerCase().includes(filterText.toLowerCase()));

    if (!matchesText) return false;

    if (statusFilter === 'PENDING') return !r.isApproved;
    if (statusFilter === 'APPROVED') return r.isApproved;
    return true;
  });

  const columns: TableColumn[] = [
    { key: 'author', label: 'Reviewer Name & Role' },
    { key: 'rating', label: 'Rating' },
    { key: 'quote', label: 'Review Message' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Moderation Actions' },
  ];

  const rows = filteredReviews.map((r) => ({
    author: (
      <div>
        <span className="font-bold text-text-primary text-xs block">{r.name}</span>
        <span className="text-[10px] text-text-secondary font-semibold">
          {r.role} · {r.location || 'Global'}
        </span>
      </div>
    ),
    rating: (
      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
        ⭐ {r.rating} / 5
      </span>
    ),
    quote: (
      <p className="text-xs text-text-secondary italic max-w-sm line-clamp-3 leading-relaxed">
        &ldquo;{r.quote}&rdquo;
      </p>
    ),
    status: (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
          r.isApproved
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
        }`}
      >
        {r.isApproved ? '🟢 Published on Website' : '⏳ Pending Admin Approval'}
      </span>
    ),
    actions: (
      <div className="flex items-center gap-2">
        {!r.isApproved && (
          <button
            type="button"
            onClick={() => handleApprove(r.id)}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95 whitespace-nowrap"
          >
            ✓ Accept &amp; Publish
          </button>
        )}
        <button
          type="button"
          onClick={() => handleDelete(r.id)}
          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors whitespace-nowrap"
        >
          🗑️ Reject / Delete
        </button>
      </div>
    ),
  }));

  const pendingCount = reviews.filter((r) => !r.isApproved).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Parents & Students Reviews Moderation"
        subtitle="Review and approve parent/student testimonials before they appear live on the public website."
      />

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-border p-4 shadow-card">
          <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Total Submitted</span>
          <span className="text-xl font-extrabold text-text-primary font-mono">{reviews.length}</span>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 shadow-card">
          <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Pending Approval</span>
          <span className="text-xl font-extrabold text-amber-900 font-mono">⏳ {pendingCount}</span>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 shadow-card">
          <span className="text-[10px] font-bold text-green-800 uppercase tracking-wider block">Published Live</span>
          <span className="text-xl font-extrabold text-green-900 font-mono">🟢 {reviews.filter((r) => r.isApproved).length}</span>
        </div>
      </div>

      {actionMessage && (
        <div className="p-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md">
          {actionMessage}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-border shadow-card">
        <TableSearchBar
          placeholder="Filter reviews by name, keyword or location..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="max-w-md w-full"
        />

        <div className="flex items-center gap-2">
          <span className="text-xs text-text-secondary font-semibold">Filter:</span>
          {(['ALL', 'PENDING', 'APPROVED'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                statusFilter === st
                  ? 'bg-primary text-white border-primary shadow-sm'
                  : 'bg-slate-50 text-text-secondary border-border hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <DashboardTable
          columns={columns}
          rows={rows}
          emptyTitle="No Submitted Reviews"
          emptyDescription="When parents or students submit reviews via the website, they will populate here for your approval."
          caption="Parent & Student Website Testimonial Submissions"
        />
      </div>
    </div>
  );
}
