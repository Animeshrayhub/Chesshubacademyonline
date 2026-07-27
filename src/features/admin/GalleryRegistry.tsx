'use client';

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import {
  addGalleryPhotoAction,
  toggleGalleryPhotoAction,
  deleteGalleryPhotoAction,
  fetchAdminGalleryAction,
} from '@/actions/gallery';
import { fixGoogleDriveUrl, type GalleryItem } from '@/lib/gallery';
import type { TableColumn } from '@/types/dashboard';

export default function GalleryRegistry() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState<'Tournaments' | 'Classes' | 'Events' | 'Certificates'>('Events');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadGallery = async () => {
    setLoading(true);
    const res = await fetchAdminGalleryAction();
    if (res.success && res.gallery) {
      setItems(res.gallery);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadGallery();
  }, []);

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !imageUrl) return;

    setIsSubmitting(true);
    setActionMessage('');

    const res = await addGalleryPhotoAction({
      title,
      imageUrl,
      category,
    });

    setIsSubmitting(false);

    if (res.success) {
      setActionMessage('✓ Gallery photo added successfully!');
      setTitle('');
      setImageUrl('');
      setShowAddModal(false);
      loadGallery();
    } else {
      setActionMessage('❌ Failed to add photo.');
    }
  };

  const handleTogglePublished = async (id: string, currentStatus: boolean) => {
    setActionMessage('');
    const res = await toggleGalleryPhotoAction(id, !currentStatus);
    if (res.success) {
      setActionMessage(`✓ Photo status updated.`);
      loadGallery();
    } else {
      setActionMessage('❌ Failed to update photo status.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this photo from the gallery?')) return;
    setActionMessage('');
    const res = await deleteGalleryPhotoAction(id);
    if (res.success) {
      setActionMessage('✓ Photo deleted.');
      loadGallery();
    } else {
      setActionMessage('❌ Failed to delete photo.');
    }
  };

  const filteredItems = items.filter(
    (i) =>
      i.title.toLowerCase().includes(filterText.toLowerCase()) ||
      i.category.toLowerCase().includes(filterText.toLowerCase())
  );

  const columns: TableColumn[] = [
    { key: 'preview', label: 'Photo' },
    { key: 'title', label: 'Title / Description' },
    { key: 'category', label: 'Category' },
    { key: 'status', label: 'Status' },
    { key: 'actions', label: 'Actions' },
  ];

  const rows = filteredItems.map((item) => ({
    preview: (
      <div className="w-16 h-12 rounded-xl overflow-hidden bg-slate-900 border border-border shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
      </div>
    ),
    title: <span className="font-bold text-text-primary text-xs">{item.title}</span>,
    category: (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        {item.category}
      </span>
    ),
    status: (
      <span
        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border ${
          item.isPublished
            ? 'bg-green-50 text-green-700 border-green-200'
            : 'bg-slate-100 text-slate-600 border-slate-200'
        }`}
      >
        {item.isPublished ? '🟢 Live on Website' : '⚪ Hidden'}
      </span>
    ),
    actions: (
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => handleTogglePublished(item.id, item.isPublished)}
          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-all"
        >
          {item.isPublished ? 'Hide' : 'Publish'}
        </button>
        <button
          type="button"
          onClick={() => handleDelete(item.id)}
          className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-colors"
        >
          🗑️ Delete
        </button>
      </div>
    ),
  }));

  const previewFormattedUrl = fixGoogleDriveUrl(imageUrl);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academy Photo Gallery Manager"
        subtitle="Upload Google Drive photo links to render live moments across the public website homepage."
        action={
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold text-xs rounded-xl shadow-gold transition-all duration-200"
          >
            ➕ Add Photo from Google Drive
          </button>
        }
      />

      {actionMessage && (
        <div className="p-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md">
          {actionMessage}
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-card">
        <TableSearchBar
          placeholder="Filter photos by title or category..."
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          className="max-w-md w-full"
        />
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-border overflow-hidden shadow-card">
        <DashboardTable
          columns={columns}
          rows={rows}
          emptyTitle="No Gallery Photos Uploaded"
          emptyDescription="Add Google Drive links or image URLs to populate the public website photo gallery."
          caption="Academy Public Website Photo Gallery"
        />
      </div>

      {/* 🖼️ Add Gallery Photo Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 w-full max-w-lg space-y-5 shadow-2xl relative text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-xl shadow-md">
                  📸
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-amber-400">
                    Add Photo from Google Drive
                  </h3>
                  <p className="text-xs text-slate-400">Paste any shareable Google Drive image link</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddPhoto} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Photo Title / Caption</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maharashtra State Under-15 Championship Winners"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Google Drive Share Link or Direct Image URL
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://drive.google.com/file/d/1AvSH.../view"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-amber-300/80 mt-1">
                  💡 Paste any link from your Drive folder: <code>https://drive.google.com/drive/folders/...</code> or file link!
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as any)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Tournaments">Tournaments</option>
                  <option value="Classes">Classes</option>
                  <option value="Events">Events</option>
                  <option value="Certificates">Certificates</option>
                </select>
              </div>

              {/* Live Preview Box */}
              {imageUrl && (
                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Live Preview</span>
                  <div className="w-full h-40 rounded-xl overflow-hidden bg-slate-900 border border-slate-800">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewFormattedUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=600&fit=crop&q=85';
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs rounded-xl shadow-gold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : '🚀 Publish Photo to Website'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
