'use client';

import React, { useState, useEffect } from 'react';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';

interface GalleryImage {
  id: string;
  title: string;
  url: string;
  thumbnailUrl: string;
}

export default function StudentSuccessSection() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchGallery() {
      try {
        setLoading(true);
        const res = await fetch('/api/drive-gallery');
        const data = await res.json();
        if (isMounted) {
          if (data.success && Array.isArray(data.images)) {
            setImages(data.images);
          } else {
            setError(data.error || 'Unable to load photo gallery.');
          }
        }
      } catch (err: any) {
        if (isMounted) {
          setError('Failed to load live gallery photos.');
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchGallery();
    return () => {
      isMounted = false;
    };
  }, []);

  const openLightbox = (index: number) => {
    setSelectedIndex(index);
    document.body.style.overflow = 'hidden';
  };

  const closeLightbox = React.useCallback(() => {
    setSelectedIndex(null);
    document.body.style.overflow = '';
  }, []);

  const showNext = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedIndex((prev) => (prev !== null && images.length > 0 ? (prev + 1) % images.length : null));
    },
    [images.length]
  );

  const showPrev = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.stopPropagation();
      setSelectedIndex((prev) => (prev !== null && images.length > 0 ? (prev - 1 + images.length) % images.length : null));
    },
    [images.length]
  );

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedIndex === null) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowRight') showNext();
      if (e.key === 'ArrowLeft') showPrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, closeLightbox, showNext, showPrev]);

  return (
    <section
      className="section-py bg-gradient-to-br from-surface-dark via-[#0d1f4f] to-surface-dark relative overflow-hidden select-none"
      aria-label="Academy Photo Gallery"
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="absolute inset-0 chess-bg opacity-40 pointer-events-none" aria-hidden="true" />

      <Container className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-white/10 pb-6">
          <SectionTitle
            eyebrow="Academy Gallery"
            title="Life at"
            titleHighlight="ChessHub Academy"
            subtitle="Real photos from our tournaments, live masterclasses, and student moments."
            light
          />

          {!loading && images.length > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 py-2 rounded-full text-amber-400 text-sm font-semibold self-start md:self-auto shadow-sm">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>{images.length} Live Academy Photos</span>
            </div>
          )}
        </div>

        {/* Loading Skeletons */}
        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-64 rounded-2xl bg-slate-800/60 animate-pulse border border-slate-700/50"
              />
            ))}
          </div>
        )}

        {/* Error Fallback */}
        {!loading && error && (
          <div className="w-full py-16 text-center bg-slate-900/80 border border-slate-800 rounded-3xl p-6">
            <p className="text-slate-400 text-base mb-4">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl transition-all"
            >
              Retry Gallery Loading
            </button>
          </div>
        )}

        {/* Live Photo Grid with Anti-Download DRM Overlay */}
        {!loading && !error && images.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {images.map((img, idx) => (
              <div
                key={img.id}
                onClick={() => openLightbox(idx)}
                className="group relative h-64 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 hover:border-amber-500/50 transition-all duration-300 shadow-lg cursor-pointer transform hover:-translate-y-1"
                onContextMenu={(e) => e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              >
                {/* DRM Protected Image Element */}
                <img
                  src={img.thumbnailUrl}
                  alt={img.title}
                  loading="lazy"
                  className="w-full h-full object-cover select-none pointer-events-none transition-transform duration-500 group-hover:scale-110"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />

                {/* Anti-Download Guard & Interactive Hover Overlay */}
                <div
                  className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4 pointer-events-auto"
                  onContextMenu={(e) => e.preventDefault()}
                >
                  <span className="text-amber-400 text-xs font-bold tracking-wider uppercase mb-1">
                    ChessHub Gallery
                  </span>
                  <p className="text-white font-semibold text-sm truncate">{img.title}</p>
                  <span className="text-slate-300 text-xs mt-1 flex items-center gap-1">
                    🔍 Click to View Fullscreen
                  </span>
                </div>

                {/* Permanent Anti-Save Transparent Guard Canvas */}
                <div
                  className="absolute inset-0 z-20 bg-transparent select-none"
                  onContextMenu={(e) => e.preventDefault()}
                  onDragStart={(e) => e.preventDefault()}
                />
              </div>
            ))}
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && images.length === 0 && (
          <div className="w-full py-16 text-center bg-slate-900/60 border border-slate-800 rounded-3xl p-6">
            <p className="text-slate-400 text-base">No photos found in Google Drive gallery folder.</p>
          </div>
        )}
      </Container>

      {/* In-Page Fullscreen Modal / Lightbox (No External Redirects & Strict DRM) */}
      {selectedIndex !== null && images[selectedIndex] && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 md:p-8 select-none"
          onClick={closeLightbox}
          onContextMenu={(e) => e.preventDefault()}
          onDragStart={(e) => e.preventDefault()}
        >
          {/* Header Controls */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-3">
            <span className="text-slate-400 text-sm font-medium bg-slate-900/80 border border-slate-800 px-3 py-1.5 rounded-full">
              {selectedIndex + 1} / {images.length}
            </span>
            <button
              onClick={closeLightbox}
              className="w-10 h-10 rounded-full bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center text-xl font-bold transition-all border border-slate-700"
              aria-label="Close Preview"
            >
              ✕
            </button>
          </div>

          {/* Left Arrow */}
          <button
            onClick={showPrev}
            className="absolute left-4 z-50 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center text-2xl font-bold transition-all border border-slate-700 shadow-xl"
            aria-label="Previous Photo"
          >
            ‹
          </button>

          {/* Right Arrow */}
          <button
            onClick={showNext}
            className="absolute right-4 z-50 w-12 h-12 rounded-full bg-slate-900/80 hover:bg-amber-500 hover:text-slate-950 text-white flex items-center justify-center text-2xl font-bold transition-all border border-slate-700 shadow-xl"
            aria-label="Next Photo"
          >
            ›
          </button>

          {/* Protected Lightbox Image Container */}
          <div
            className="relative max-w-5xl max-h-[85vh] w-full h-full flex items-center justify-center overflow-hidden rounded-2xl border border-slate-800 shadow-2xl bg-slate-900/40"
            onClick={(e) => e.stopPropagation()}
            onContextMenu={(e) => e.preventDefault()}
            onDragStart={(e) => e.preventDefault()}
          >
            <img
              src={images[selectedIndex].url}
              alt={images[selectedIndex].title}
              className="max-w-full max-h-[80vh] object-contain select-none pointer-events-none rounded-lg"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />

            {/* Transparent Guard Overlay - Blocks Right Click & Save Image As */}
            <div
              className="absolute inset-0 z-30 bg-transparent select-none"
              onContextMenu={(e) => e.preventDefault()}
              onDragStart={(e) => e.preventDefault()}
            />
          </div>
        </div>
      )}
    </section>
  );
}
