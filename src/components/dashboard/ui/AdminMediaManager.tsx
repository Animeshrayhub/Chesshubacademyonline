'use client';

import React, { useState } from 'react';
import PageHeader from './PageHeader';
import Button from '@/components/ui/Button';

interface MediaItem {
  id: string;
  category: 'Coaches' | 'Landing & Hero' | 'Programs & Courses' | 'Branding';
  title: string;
  location: string;
  url: string;
  defaultUrl: string;
}

const INITIAL_MEDIA_ITEMS: MediaItem[] = [
  {
    id: 'coach-animesh',
    category: 'Coaches',
    title: 'Coach Profile: Animesh Ray (DI)',
    location: 'Public Landing Page & About Team Section',
    url: '/coaches/animesh-ray.jpg',
    defaultUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=400&fit=crop&q=80',
  },
  {
    id: 'coach-manoj',
    category: 'Coaches',
    title: 'Coach Profile: Manoj Kumar Rai (NI)',
    location: 'Public Landing Page & About Team Section',
    url: '/coaches/manoj-kumar-rai.jpg',
    defaultUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop&q=80',
  },
  {
    id: 'coach-ayush',
    category: 'Coaches',
    title: 'Coach Profile: Ayush Pattanaik (NI)',
    location: 'Public Landing Page & About Team Section',
    url: '/coaches/ayush-pattanaik.jpg',
    defaultUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&h=400&fit=crop&q=80',
  },
  {
    id: 'coach-pradipta',
    category: 'Coaches',
    title: 'Coach Profile: Pradipta Patnaik',
    location: 'Public Landing Page & About Team Section',
    url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80',
    defaultUrl: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400&h=400&fit=crop&q=80',
  },
  {
    id: 'about-hero',
    category: 'Landing & Hero',
    title: 'About Page Hero Banner',
    location: 'src/app/(public)/about/page.tsx',
    url: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=700&h=500&fit=crop&q=85',
    defaultUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=700&h=500&fit=crop&q=85',
  },
  {
    id: 'site-og',
    category: 'Branding',
    title: 'Social Media Share OG Image',
    location: 'Social Media Previews (WhatsApp, Facebook, Twitter)',
    url: '/og-image.jpg',
    defaultUrl: '/og-image.jpg',
  },
];

export default function AdminMediaManager() {
  const [mediaList, setMediaList] = useState<MediaItem[]>(INITIAL_MEDIA_ITEMS);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [newUrlInput, setNewUrlInput] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [successMsg, setSuccessMsg] = useState<string>('');

  // Converts Google Drive share links into direct web image URLs
  const convertGoogleDriveUrl = (rawUrl: string): string => {
    if (!rawUrl) return '';
    const trimmed = rawUrl.trim();
    const driveMatch = trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) || trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    if (driveMatch && driveMatch[1]) {
      return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
    }
    return trimmed;
  };

  const handleEditClick = (item: MediaItem) => {
    setEditingItem(item);
    setNewUrlInput(item.url);
    setPreviewUrl(item.url);
  };

  const handleUrlChange = (val: string) => {
    setNewUrlInput(val);
    setPreviewUrl(convertGoogleDriveUrl(val));
  };

  const handleSaveMedia = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const finalUrl = convertGoogleDriveUrl(newUrlInput);
    setMediaList((prev) =>
      prev.map((m) => (m.id === editingItem.id ? { ...m, url: finalUrl } : m))
    );

    setSuccessMsg(`Updated image for ${editingItem.title}`);
    setEditingItem(null);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleDeleteReset = (item: MediaItem) => {
    setMediaList((prev) =>
      prev.map((m) => (m.id === item.id ? { ...m, url: item.defaultUrl } : m))
    );
    setSuccessMsg(`Reset image for ${item.title} back to default placeholder.`);
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const categories = ['ALL', 'Coaches', 'Landing & Hero', 'Programs & Courses', 'Branding'];

  const filteredMedia = mediaList.filter(
    (m) => selectedCategory === 'ALL' || m.category === selectedCategory
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin Site Media & Image Manager"
        subtitle="View, replace, or reset images across the public website, coach profiles, and hero sections."
      />

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-xs rounded-2xl flex items-center gap-2">
          <span>🎉 {successMsg}</span>
        </div>
      )}

      {/* Category Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            {cat === 'ALL' ? 'All Website Images' : cat}
          </button>
        ))}
      </div>

      {/* Media Catalog Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredMedia.map((item) => (
          <div
            key={item.id}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4 flex flex-col justify-between hover:border-amber-500/40 transition-all text-white"
          >
            <div className="space-y-3">
              {/* Category Pill */}
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold bg-amber-500/10 text-amber-400 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase">
                  {item.category}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">ID: {item.id}</span>
              </div>

              {/* Title & Location */}
              <div>
                <h4 className="text-sm font-bold text-white leading-snug">{item.title}</h4>
                <p className="text-[11px] text-slate-400 font-mono mt-0.5">{item.location}</p>
              </div>

              {/* Image Preview Box */}
              <div className="relative h-44 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 flex items-center justify-center group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  onError={(e) => {
                    (e.target as HTMLElement).setAttribute('src', item.defaultUrl);
                  }}
                />
              </div>

              <div className="bg-slate-950 p-2 rounded-xl border border-slate-850 font-mono text-[10px] text-slate-400 truncate">
                {item.url}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handleEditClick(item)}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
              >
                <span>🖼️ Change Image</span>
              </button>

              <button
                type="button"
                onClick={() => handleDeleteReset(item)}
                className="px-3 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 font-bold text-xs rounded-xl transition-all"
                title="Reset/Remove custom image back to default placeholder"
              >
                🗑️ Reset
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Edit Image Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative text-white">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
                  🖼️
                </div>
                <div>
                  <h3 className="font-heading font-bold text-base text-amber-400">
                    Change Website Image
                  </h3>
                  <p className="text-xs text-slate-400">{editingItem.title}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMedia} className="space-y-4">
              {/* Preview */}
              <div className="flex flex-col items-center justify-center p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="w-full h-36 rounded-xl overflow-hidden border border-amber-400/50 bg-slate-900 flex items-center justify-center">
                  {previewUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={previewUrl}
                      alt="Preview"
                      className="w-full h-full object-cover"
                      onError={() => setPreviewUrl(editingItem.defaultUrl)}
                    />
                  ) : (
                    <span className="text-slate-500 text-xs">Invalid Image Link</span>
                  )}
                </div>
                <span className="text-[10px] text-slate-400 font-bold uppercase">
                  Live Preview
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Paste Image URL or Google Drive Link
                </label>
                <input
                  type="text"
                  required
                  placeholder="https://drive.google.com/file/d/... or https://your-domain.com/photo.jpg"
                  value={newUrlInput}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-amber-300/80 mt-1">
                  💡 <strong>Google Drive Links:</strong> Paste any shareable Google Drive link — it automatically converts to a direct image!
                </p>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  className="flex-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold py-2.5 text-xs shadow-lg"
                >
                  💾 Save & Update Image
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
