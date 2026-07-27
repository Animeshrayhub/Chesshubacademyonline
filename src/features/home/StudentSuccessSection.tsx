'use client';

import React, { useState, useEffect } from 'react';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import ProtectionGuard from '@/components/ui/ProtectionGuard';
import { fetchGalleryPhotosAction } from '@/actions/gallery';
import type { GalleryPhoto } from '@/lib/gallery';

const FOLDER_ID = '1AvSHNysv8fda_6b4M6FliRi0aU4aSNLg';
const EMBEDDED_DRIVE_GRID_URL = `https://drive.google.com/embeddedfolderview?id=${FOLDER_ID}#grid`;

export default function StudentSuccessSection() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);
  const [displayMode, setDisplayMode] = useState<'grid' | 'embed'>('grid');

  useEffect(() => {
    fetchGalleryPhotosAction().then((res) => {
      if (res.success && res.photos) {
        setPhotos(res.photos);
      }
    });
  }, []);

  const categories = ['ALL', 'Tournaments', 'Masterclasses', 'Awards', 'Events'];

  const filteredPhotos = photos.filter((p) => {
    if (activeCategory === 'ALL') return true;
    return (p.category || 'Events').toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <ProtectionGuard>
      <section
        className="section-py bg-gradient-to-br from-surface-dark via-[#0d1f4f] to-surface-dark relative overflow-hidden select-none"
        aria-label="Academy Photo Gallery"
        onContextMenu={(e) => e.preventDefault()}
      >
        <div className="absolute inset-0 chess-bg opacity-50" aria-hidden="true" />

        <Container className="relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-white/10 pb-6">
            <SectionTitle
              eyebrow="Academy Gallery"
              title="Life at"
              titleHighlight="ChessHub Academy"
              subtitle="Real photos from our tournaments, live masterclasses, and student moments."
              light
            />

            <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
              {/* Display Mode Toggle */}
              <div className="bg-slate-900/90 border border-slate-700/80 p-1 rounded-xl flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setDisplayMode('grid')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    displayMode === 'grid'
                      ? 'bg-amber-500 text-slate-950 shadow-gold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  🖼️ Protected Cards
                </button>
                <button
                  type="button"
                  onClick={() => setDisplayMode('embed')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    displayMode === 'embed'
                      ? 'bg-amber-500 text-slate-950 shadow-gold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  📁 Drive Folder
                </button>
              </div>

              <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-amber-300 shadow-md">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>🔒 Protected · No External Redirects</span>
              </div>
            </div>
          </div>

          {/* Category Filter Pills (For Protected Cards Mode) */}
          {displayMode === 'grid' && (
            <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                    activeCategory === cat
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-gold scale-105'
                      : 'bg-white/10 text-slate-300 border-white/15 hover:bg-white/20'
                  }`}
                >
                  {cat === 'ALL' ? '🌟 All Moments' : cat}
                </button>
              ))}
            </div>
          )}

          {/* 🖼️ Mode A: Protected Native Image Cards Grid */}
          {displayMode === 'grid' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {filteredPhotos.map((photo) => (
                <div
                  key={photo.id}
                  onClick={() => setActivePhoto(photo)}
                  className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm hover:border-amber-400/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1 relative protect-media"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <div className="relative h-60 w-full overflow-hidden bg-slate-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.imageUrl}
                      alt={photo.title}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 pointer-events-none select-none"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=600&fit=crop&q=85';
                      }}
                    />

                    {/* Anti-Theft Watermark Overlay */}
                    <div className="absolute top-2 right-2 bg-slate-950/70 border border-white/10 text-white/50 text-[9px] font-bold px-2 py-0.5 rounded backdrop-blur-sm pointer-events-none">
                      ChessHub ©
                    </div>

                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                    <div className="absolute bottom-3 left-3 right-3">
                      <span className="text-xs font-bold text-white block truncate drop-shadow-md">
                        {photo.title}
                      </span>
                      <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                        <span>🔍 Click to View</span>
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* 📁 Mode B: Sandboxed Embedded Google Drive Folder (Strict No-Redirects) */}
          {displayMode === 'embed' && (
            <div
              className="w-full h-[650px] bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative protect-media"
              onContextMenu={(e) => e.preventDefault()}
            >
              <iframe
                src={EMBEDDED_DRIVE_GRID_URL}
                /* sandbox without allow-popups or allow-top-navigation prevents opening outside links */
                sandbox="allow-scripts allow-same-origin"
                className="w-full h-full border-0 rounded-3xl bg-white select-none pointer-events-auto"
                title="ChessHub Academy Live Embedded Google Drive Gallery"
                allow="autoplay"
              />
            </div>
          )}

          {/* 🔍 Full Screen Protected Lightbox Modal */}
          {activePhoto && (
            <div
              className="fixed inset-0 bg-slate-950/95 backdrop-blur-xl z-50 flex items-center justify-center p-4 select-none"
              onClick={() => setActivePhoto(null)}
              onContextMenu={(e) => e.preventDefault()}
            >
              <div
                className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 w-full max-w-3xl space-y-4 shadow-2xl relative text-white max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                  <h3 className="font-heading font-bold text-sm md:text-base text-amber-400 flex items-center gap-2">
                    <span>📸</span>
                    <span>{activePhoto.title}</span>
                  </h3>
                  <button
                    type="button"
                    onClick={() => setActivePhoto(null)}
                    className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="relative w-full max-h-[65vh] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={activePhoto.imageUrl}
                    alt={activePhoto.title}
                    className="max-h-[65vh] w-auto max-w-full object-contain rounded-2xl pointer-events-none select-none"
                  />

                  {/* Watermark across photo modal */}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
                    <span className="font-heading font-extrabold text-2xl md:text-4xl text-white tracking-widest uppercase rotate-[-20deg]">
                      ChessHub Academy Official
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                  <span>🔒 Media Protection Enabled</span>
                  <button
                    type="button"
                    onClick={() => setActivePhoto(null)}
                    className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs"
                  >
                    Close Window
                  </button>
                </div>
              </div>
            </div>
          )}
        </Container>
      </section>
    </ProtectionGuard>
  );
}
