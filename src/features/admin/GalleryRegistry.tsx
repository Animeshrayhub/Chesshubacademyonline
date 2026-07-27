'use client';

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import { fetchGalleryPhotosAction, addGalleryPhotoAction, deleteGalleryPhotoAction } from '@/actions/gallery';
import { convertGoogleDriveUrl, DEFAULT_DRIVE_FOLDER_ID } from '@/lib/gallery';
import type { GalleryPhoto } from '@/lib/gallery';

const GOOGLE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${DEFAULT_DRIVE_FOLDER_ID}`;

export default function GalleryRegistry() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  // Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadPhotos = async () => {
    setLoading(true);
    const res = await fetchGalleryPhotosAction();
    if (res.success && res.photos) {
      setPhotos(res.photos);
    }
    setLoading(false);
  };

  useEffect(() => {
    loadPhotos();
  }, []);

  const handleUrlChange = (val: string) => {
    setUrlInput(val);
    const converted = convertGoogleDriveUrl(val);
    setPreviewUrl(converted);
  };

  const handleAddPhoto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput) return;

    setIsSubmitting(true);
    setActionMessage('');

    const res = await addGalleryPhotoAction(title || 'Academy Event Moment', urlInput);

    setIsSubmitting(false);
    if (res.success) {
      setActionMessage('✓ Gallery photo added successfully!');
      setTitle('');
      setUrlInput('');
      setPreviewUrl('');
      setShowAddModal(false);
      loadPhotos();
    } else {
      setActionMessage('❌ Failed to add photo to gallery.');
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm('Are you sure you want to delete this photo from the gallery?')) return;
    setActionMessage('');
    const res = await deleteGalleryPhotoAction(id);
    if (res.success) {
      setActionMessage('✓ Photo deleted.');
      loadPhotos();
    } else {
      setActionMessage('❌ Failed to delete photo.');
    }
  };

  const filteredPhotos = photos.filter((p) =>
    p.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Academy Photo Gallery Manager"
        subtitle="Upload and sync photos from your Google Drive folder directly onto the public website."
        action={
          <div className="flex items-center gap-3">
            <a
              href={GOOGLE_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs border border-slate-700 transition-all flex items-center gap-2"
            >
              <span>📁 Open Drive Folder</span>
            </a>
            <button
              type="button"
              onClick={() => {
                setShowAddModal(true);
                setActionMessage('');
              }}
              className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl text-xs transition-all shadow-gold flex items-center gap-2"
            >
              <span>➕ Add Drive Photo</span>
            </button>
          </div>
        }
      />

      {/* Info Card */}
      <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/30 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <span className="text-2xl">📁</span>
          <div>
            <h4 className="font-bold text-amber-800 dark:text-amber-300">Connected Google Drive Folder</h4>
            <p className="text-text-secondary text-[11px]">
              Folder ID: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">{DEFAULT_DRIVE_FOLDER_ID}</code> — Photos added here or via individual Drive share links automatically format for the website!
            </p>
          </div>
        </div>
        <a
          href={GOOGLE_DRIVE_FOLDER_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-[11px] shrink-0"
        >
          View Folder Content ↗
        </a>
      </div>

      {actionMessage && (
        <div className="p-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md">
          {actionMessage}
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-border shadow-card flex items-center justify-between">
        <TableSearchBar
          placeholder="Filter photos by title..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md w-full"
        />
        <span className="text-xs font-semibold text-text-secondary">
          Showing {filteredPhotos.length} Photos
        </span>
      </div>

      {/* Photos Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
        {filteredPhotos.map((photo) => (
          <div
            key={photo.id}
            className="bg-white rounded-2xl border border-border overflow-hidden shadow-card group hover:shadow-card-hover transition-all flex flex-col justify-between"
          >
            <div className="relative h-48 w-full bg-slate-950 overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.imageUrl}
                alt={photo.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=600&fit=crop&q=85';
                }}
              />
            </div>
            <div className="p-3.5 space-y-2">
              <h4 className="font-bold text-text-primary text-xs truncate">{photo.title}</h4>
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <span className="text-[10px] text-text-secondary">
                  {new Date(photo.createdAt).toLocaleDateString()}
                </span>
                <button
                  type="button"
                  onClick={() => handleDeletePhoto(photo.id)}
                  className="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[10px] rounded-lg border border-red-200 transition-colors"
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ➕ Add Photo Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl relative text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
                  🖼️
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-amber-400">
                    Add Gallery Photo
                  </h3>
                  <p className="text-xs text-slate-400">Paste Google Drive image link</p>
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
              {/* Preview Box */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="w-full h-36 rounded-xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center relative">
                  {previewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setPreviewUrl('')}
                    />
                  ) : (
                    <span className="text-3xl text-slate-600">📷</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Live Drive Image Preview
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Photo Title / Caption</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. State Championship Finals 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Google Drive Link or Image URL</label>
                <input
                  type="text"
                  required
                  placeholder="https://drive.google.com/file/d/... or direct link"
                  value={urlInput}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[10px] text-amber-300 mt-1">
                  💡 Paste any shareable Google Drive link — it automatically converts to a direct image!
                </p>
              </div>

              <div className="flex justify-end gap-2.5 border-t border-slate-800 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : '🚀 Save Photo to Gallery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
