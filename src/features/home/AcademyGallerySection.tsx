'use client';

import React, { useState, useEffect } from 'react';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import { fetchGalleryPhotosAction } from '@/actions/gallery';
import type { GalleryPhoto } from '@/lib/gallery';

export default function AcademyGallerySection() {
  const [items, setItems] = useState<GalleryPhoto[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  const [selectedPhoto, setSelectedPhoto] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    fetchGalleryPhotosAction().then((res: any) => {
      if (res.success && res.photos) {
        setItems(res.photos);
      }
    });
  }, []);

  const categories = ['ALL', 'Tournaments', 'Classes', 'Events', 'Certificates'];

  const filteredItems = items.filter((item) => {
    if (activeCategory === 'ALL') return true;
    return item.category === activeCategory;
  });

  return (
    <section
      id="gallery"
      className="section-py bg-gradient-to-br from-surface-dark via-[#0b193d] to-surface-dark relative overflow-hidden text-white"
      aria-label="Academy Photo Gallery"
    >
      <div className="absolute inset-0 chess-bg opacity-40" aria-hidden="true" />

      <Container className="relative z-10">
        <SectionTitle
          eyebrow="Academy Highlights"
          title="Live Moments &"
          titleHighlight="Photo Gallery"
          subtitle="Real moments from our live masterclasses, competitive tournaments, and student achievements."
          light
        />

        {/* Category Filter Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-10">
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
              {cat === 'ALL' ? '🌟 All Highlights' : cat}
            </button>
          ))}
        </div>

        {/* Responsive Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredItems.map((item) => (
            <article
              key={item.id}
              onClick={() => setSelectedPhoto(item)}
              className="group bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-sm hover:border-amber-400/50 hover:bg-white/10 transition-all duration-300 cursor-pointer shadow-2xl flex flex-col"
            >
              {/* Photo */}
              <div className="relative h-64 overflow-hidden bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.imageUrl}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    // Fallback to default chess photo if drive URL fails
                    (e.target as HTMLImageElement).src =
                      'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=600&fit=crop&q=85';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity" />

                {/* Category Badge */}
                <div className="absolute top-3 left-3 bg-surface-dark/80 backdrop-blur-md border border-white/20 text-amber-300 text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full">
                  {item.category}
                </div>

                {/* Zoom Icon Overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                  <span className="w-12 h-12 rounded-full bg-amber-500/90 text-slate-950 flex items-center justify-center text-xl shadow-gold font-bold">
                    🔍
                  </span>
                </div>
              </div>

              {/* Title & Footer */}
              <div className="p-5 flex-1 flex flex-col justify-between">
                <h3 className="font-heading font-bold text-sm text-white group-hover:text-amber-300 transition-colors leading-snug">
                  {item.title}
                </h3>
                <span className="text-[10px] text-slate-400 font-semibold mt-3 block">
                  📸 Click to view full image
                </span>
              </div>
            </article>
          ))}
        </div>

        {/* 🔍 Full Screen Lightbox Modal */}
        {selectedPhoto && (
          <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 md:p-6 w-full max-w-4xl space-y-4 shadow-2xl relative text-white">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 bg-amber-500/20 border border-amber-500/40 text-amber-300 rounded-full text-xs font-bold">
                    {selectedPhoto.category}
                  </span>
                  <h3 className="font-heading font-bold text-base text-white truncate max-w-md">
                    {selectedPhoto.title}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
                >
                  ✕
                </button>
              </div>

              {/* Full Image */}
              <div className="relative max-h-[70vh] min-h-[300px] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedPhoto.imageUrl}
                  alt={selectedPhoto.title}
                  className="max-h-[70vh] w-auto max-w-full object-contain"
                />
              </div>

              <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                <span>ChessHub Academy Moments</span>
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
                >
                  Close Preview
                </button>
              </div>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
