'use client';

import React, { useState, useEffect } from 'react';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import { fetchGalleryPhotosAction } from '@/actions/gallery';
import type { GalleryPhoto } from '@/lib/gallery';

const GOOGLE_DRIVE_FOLDER_URL = 'https://drive.google.com/drive/folders/1AvSHNysv8fda_6b4M6FliRi0aU4aSNLg';

export default function StudentSuccessSection() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [activePhoto, setActivePhoto] = useState<GalleryPhoto | null>(null);

  useEffect(() => {
    fetchGalleryPhotosAction().then((res) => {
      if (res.success && res.photos) {
        setPhotos(res.photos);
      }
    });
  }, []);

  return (
    <section
      className="section-py bg-gradient-to-br from-surface-dark via-[#0d1f4f] to-surface-dark relative overflow-hidden"
      aria-label="Academy Photo Gallery"
    >
      <div className="absolute inset-0 chess-bg opacity-50" aria-hidden="true" />

      <Container className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4 border-b border-white/10 pb-6">
          <SectionTitle
            eyebrow="Academy Gallery"
            title="Life at"
            titleHighlight="ChessHub Academy"
            subtitle="Real photos from our tournaments, live masterclasses, and student moments."
            light
          />

          <a
            href={GOOGLE_DRIVE_FOLDER_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all duration-200 active:scale-95 flex items-center gap-2 self-start md:self-auto whitespace-nowrap"
          >
            <span>📁 View Live Google Drive Folder</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        {/* Gallery Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <div
              key={photo.id}
              onClick={() => setActivePhoto(photo)}
              className="group bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm hover:border-amber-400/50 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-2xl hover:-translate-y-1 relative"
            >
              <div className="relative h-60 w-full overflow-hidden bg-slate-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.imageUrl}
                  alt={photo.title}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  onError={(e) => {
                    // Fallback to placeholder if link fails
                    (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=800&h=600&fit=crop&q=85';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                <div className="absolute bottom-3 left-3 right-3">
                  <span className="text-xs font-bold text-white block truncate drop-shadow-md">
                    {photo.title}
                  </span>
                  <span className="text-[10px] text-amber-300 font-semibold uppercase tracking-wider flex items-center gap-1 mt-0.5">
                    <span>🔍 Click to Expand</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Full Screen Photo Lightbox */}
        {activePhoto && (
          <div
            className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-50 flex items-center justify-center p-4"
            onClick={() => setActivePhoto(null)}
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

              <div className="w-full max-h-[65vh] rounded-2xl overflow-hidden bg-slate-950 flex items-center justify-center border border-slate-800">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activePhoto.imageUrl}
                  alt={activePhoto.title}
                  className="max-h-[65vh] w-auto max-w-full object-contain rounded-2xl"
                />
              </div>

              <div className="flex justify-between items-center pt-2 text-xs text-slate-400">
                <span>ChessHub Academy Official Gallery</span>
                <a
                  href={GOOGLE_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:underline font-bold"
                >
                  Open in Google Drive ↗
                </a>
              </div>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
}
