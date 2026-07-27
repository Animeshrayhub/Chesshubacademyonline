'use client';

import React from 'react';
import Container from '@/components/ui/Container';
import SectionTitle from '@/components/ui/SectionTitle';
import ProtectionGuard from '@/components/ui/ProtectionGuard';

const FOLDER_ID = '1AvSHNysv8fda_6b4M6FliRi0aU4aSNLg';
const EMBEDDED_DRIVE_GRID_URL = `https://drive.google.com/embeddedfolderview?id=${FOLDER_ID}#grid`;

export default function StudentSuccessSection() {
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

            <div className="flex items-center gap-2 bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-full text-[11px] font-bold text-amber-300 self-start md:self-auto shadow-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>🔒 Protected Media · Copy & Download Disabled</span>
            </div>
          </div>

          {/* 📁 Direct Embedded Google Drive Folder Grid Frame */}
          <div
            className="w-full h-[650px] bg-slate-900/90 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative protect-media"
            onContextMenu={(e) => e.preventDefault()}
          >
            <iframe
              src={EMBEDDED_DRIVE_GRID_URL}
              className="w-full h-full border-0 rounded-3xl bg-white select-none pointer-events-auto"
              title="ChessHub Academy Live Embedded Google Drive Gallery"
              allow="autoplay"
            />
          </div>
        </Container>
      </section>
    </ProtectionGuard>
  );
}
