'use client';

import React, { useState } from 'react';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';

const FOLDER_ID = '1AvSHNysv8fda_6b4M6FliRi0aU4aSNLg';
const DRIVE_GRID_URL = `https://drive.google.com/embeddedfolderview?id=${FOLDER_ID}#grid`;
const DRIVE_LIST_URL = `https://drive.google.com/embeddedfolderview?id=${FOLDER_ID}#list`;
const PUBLIC_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${FOLDER_ID}`;

export default function StudentSuccessSection() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [iframeKey, setIframeKey] = useState(0);

  const currentEmbedUrl = viewMode === 'grid' ? DRIVE_GRID_URL : DRIVE_LIST_URL;

  // Prevent right-click, image dragging, and text selection for DRM protection
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <section
      className="section-py bg-gradient-to-br from-surface-dark via-[#0d1f4f] to-surface-dark relative overflow-hidden select-none"
      aria-label="Academy Photo Gallery"
      onContextMenu={handleContextMenu}
      onDragStart={handleDragStart}
    >
      <div className="absolute inset-0 chess-bg opacity-50 pointer-events-none" aria-hidden="true" />

      <Container className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-white/10 pb-6">
          <SectionTitle
            eyebrow="Academy Gallery"
            title="Life at"
            titleHighlight="ChessHub Academy"
            subtitle="Real photos from our tournaments, live masterclasses, and student moments."
            light
          />

          {/* Controls & DRM Shield Header */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <span>Protected • View Only Mode</span>
            </div>

            <div className="flex items-center bg-slate-800/90 border border-slate-700/80 rounded-xl p-1 shadow-inner">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'grid'
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span>Grid View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
                <span>List View</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIframeKey((k) => k + 1)}
              className="p-2 rounded-xl bg-slate-800/90 border border-slate-700/80 text-slate-300 hover:text-white hover:bg-slate-700/80 transition-all"
              title="Refresh Live Photos"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>

            <a
              href={PUBLIC_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/90 border border-slate-700/80 text-xs font-medium text-amber-400 hover:text-amber-300 hover:border-amber-500/40 transition-all shadow-md"
            >
              <span>Open in Drive</span>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </div>

        {/* Embedded Google Drive Gallery Frame with DRM Protection */}
        <div className="w-full h-[680px] bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative group">
          <iframe
            key={iframeKey}
            src={currentEmbedUrl}
            className="w-full h-full border-0 rounded-3xl bg-white select-none pointer-events-auto"
            title="ChessHub Academy Live Google Drive Gallery"
            allow="autoplay; encrypted-media"
            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          />

          {/* Protective Watermark & DRM Overlay Badge */}
          <div className="absolute top-4 right-4 z-20 pointer-events-none bg-slate-950/80 backdrop-blur-md border border-amber-500/30 px-3 py-1.5 rounded-xl text-[11px] font-medium text-slate-300 flex items-center gap-1.5 shadow-lg">
            <svg className="w-3.5 h-3.5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span>ChessHub Protected Media — Right-click & Downloads Disabled</span>
          </div>
        </div>
      </Container>
    </section>
  );
}
