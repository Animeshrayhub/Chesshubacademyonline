'use client';

import React, { useState, useEffect } from 'react';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import { fetchGalleryPhotosAction } from '@/actions/gallery';
import type { GalleryPhoto } from '@/lib/gallery';

const GOOGLE_DRIVE_FOLDER_ID = '1AvSHNysv8fda_6b4M6FliRi0aU4aSNLg';
const PUBLIC_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${GOOGLE_DRIVE_FOLDER_ID}`;

export default function StudentSuccessSection() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    fetchGalleryPhotosAction().then((res: any) => {
      if (res.success && res.photos && res.photos.length > 0) {
        setPhotos(res.photos);
      } else {
        // Default Google Drive hosted showcase images
        setPhotos([
          {
            id: 'p-1',
            title: 'National Junior Chess Championship 2026',
            category: 'Tournaments',
            imageUrl: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=600&fit=crop&q=85',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'p-2',
            title: 'Grandmaster Live Tactical Workshop',
            category: 'Classes',
            imageUrl: 'https://images.unsplash.com/photo-1580541832626-2a7131ee809f?w=800&h=600&fit=crop&q=85',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'p-3',
            title: 'Academy Annual Trophy & Certificate Ceremony',
            category: 'Certificates',
            imageUrl: 'https://images.unsplash.com/photo-1560174038-da43ac74f01b?w=800&h=600&fit=crop&q=85',
            createdAt: new Date().toISOString(),
          },
          {
            id: 'p-4',
            title: 'Endgame Mastery Masterclass',
            category: 'Classes',
            imageUrl: 'https://images.unsplash.com/photo-1610890716171-6b1bb98ffd09?w=800&h=600&fit=crop&q=85',
            createdAt: new Date().toISOString(),
          },
        ]);
      }
    });
  }, []);

  const categories = ['ALL', 'Tournaments', 'Classes', 'Certificates'];

  const filteredPhotos = photos.filter((p) => {
    if (activeCategory === 'ALL') return true;
    return (p.category || '').toLowerCase() === activeCategory.toLowerCase();
  });

  return (
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
            subtitle="Real photos from our tournaments, live masterclasses, and student moments. (View-Only Protected)"
            light
          />

          <a
            href={PUBLIC_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-amber-300 text-xs font-bold hover:bg-amber-500/20 transition-all shadow-gold"
          >
            <span>📁 Upload / View on Google Drive</span>
            <span className="text-sm">↗</span>
          </a>
        </div>

        {/* Category Filter Pills */}
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
              {cat === 'ALL' ? '🌟 All Photos' : cat}
            </button>
          ))}
        </div>

        {/* Protected View-Only Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPhotos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              className="group relative bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl cursor-pointer hover:border-amber-400/50 transition-all duration-300"
            >
              {/* Image Container with Transparent Protection Shield */}
              <div className="relative h-64 overflow-hidden bg-slate-950 select-none">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  draggable={false}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 pointer-events-none select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=600&fit=crop&q=85';
                  }}
                />

                {/* Protection Transparent Layer preventing right-click & save */}
                <div
                  className="absolute inset-0 z-10 bg-transparent"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />

                {/* Badge Overlay */}
                <div className="absolute top-3 left-3 z-20 bg-slate-950/80 backdrop-blur-md border border-white/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  🔒 View Only • {photo.category || 'Academy'}
                </div>

                {/* Hover Zoom Icon */}
                <div className="absolute inset-0 z-20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-slate-950/40">
                  <span className="w-12 h-12 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-bold text-lg shadow-gold">
                    🔍
                  </span>
                </div>
              </div>

              {/* Photo Title Footer */}
              <div className="p-4 bg-slate-900/90 border-t border-slate-800/80">
                <h4 className="text-sm font-semibold text-white truncate">{photo.title}</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">ChessHub Academy Protected Gallery</p>
              </div>
            </div>
          ))}
        </div>

        {/* View-Only Lightbox Preview Modal */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4 select-none"
            onClick={() => setSelectedPhoto(null)}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              className="relative max-w-4xl w-full bg-slate-900 border border-amber-400/30 rounded-3xl overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
                <div>
                  <h3 className="text-base font-bold text-amber-300">{selectedPhoto.title}</h3>
                  <span className="text-[10px] text-slate-400">🔒 View Only Mode • Downloads Disabled</span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white font-bold flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Protected High-Res Image View */}
              <div className="relative h-[500px] bg-slate-950 flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.title}
                  draggable={false}
                  className="max-w-full max-h-full object-contain pointer-events-none select-none"
                  onContextMenu={(e) => e.preventDefault()}
                />

                {/* Protection Overlay Shield */}
                <div
                  className="absolute inset-0 z-10 bg-transparent"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
              </div>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
