'use client';

import React from 'react';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';

const FOLDER_ID = '1AvSHNysv8fda_6b4M6FliRi0aU4aSNLg';
const EMBEDDED_DRIVE_GRID_URL = `https://drive.google.com/embeddedfolderview?id=${FOLDER_ID}#grid`;

export default function StudentSuccessSection() {
  return (
    <section
      className="section-py bg-gradient-to-br from-surface-dark via-[#0d1f4f] to-surface-dark relative overflow-hidden select-none"
      aria-label="Academy Photo Gallery"
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
        </div>

        {/* Embedded Google Drive Gallery View */}
        <div className="w-full h-[650px] bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
          <iframe
            src={EMBEDDED_DRIVE_GRID_URL}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0 rounded-3xl bg-white select-none pointer-events-auto"
            title="ChessHub Academy Live Embedded Google Drive Gallery"
            allow="autoplay"
          />
        </div>
      </Container>
    </section>
  );
}
