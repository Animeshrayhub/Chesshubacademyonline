'use client';

import React, { useState } from 'react';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';

const FOLDER_ID = '1AvSHNysv8fda_6b4M6FliRi0aU4aSNLg';
const GOOGLE_DRIVE_FOLDER_URL = `https://drive.google.com/drive/folders/${FOLDER_ID}`;
const EMBEDDED_DRIVE_GRID_URL = `https://drive.google.com/embeddedfolderview?id=${FOLDER_ID}#grid`;
const EMBEDDED_DRIVE_LIST_URL = `https://drive.google.com/embeddedfolderview?id=${FOLDER_ID}#list`;

export default function StudentSuccessSection() {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  return (
    <section
      className="section-py bg-gradient-to-br from-surface-dark via-[#0d1f4f] to-surface-dark relative overflow-hidden"
      aria-label="Academy Photo Gallery"
    >
      <div className="absolute inset-0 chess-bg opacity-50" aria-hidden="true" />

      <Container className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4 border-b border-white/10 pb-6">
          <SectionTitle
            eyebrow="Academy Gallery"
            title="Live Google Drive"
            titleHighlight="Photo Sync"
            subtitle="Every photo added or updated in our Google Drive folder syncs automatically right here in real-time."
            light
          />

          <div className="flex items-center gap-3 self-start md:self-auto flex-wrap">
            <div className="bg-slate-900/80 border border-slate-700/80 p-1 rounded-xl flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'grid'
                    ? 'bg-amber-500 text-slate-950 shadow-gold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ⬛ Grid View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  viewMode === 'list'
                    ? 'bg-amber-500 text-slate-950 shadow-gold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                ☰ List View
              </button>
            </div>

            <a
              href={GOOGLE_DRIVE_FOLDER_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all duration-200 active:scale-95 flex items-center gap-2 whitespace-nowrap"
            >
              <span>📁 Open Drive Folder ↗</span>
            </a>
          </div>
        </div>

        {/* 📁 Direct Embedded Google Drive Folder Frame */}
        <div className="w-full h-[650px] bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
          <iframe
            key={viewMode}
            src={viewMode === 'grid' ? EMBEDDED_DRIVE_GRID_URL : EMBEDDED_DRIVE_LIST_URL}
            className="w-full h-full border-0 rounded-3xl bg-white"
            title="ChessHub Academy Live Embedded Google Drive Gallery"
            allow="autoplay"
          />
        </div>
      </Container>
    </section>
  );
}
