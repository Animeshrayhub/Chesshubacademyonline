'use client';

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { listChessStudiesAction } from '@/actions/studies';
import type { ChessStudy } from '@/lib/studies/studyLibraryService';

export default function StudentStudiesPage() {
  const [studies, setStudies] = useState<ChessStudy[]>([]);
  const [selectedStudy, setSelectedStudy] = useState<ChessStudy | null>(null);

  useEffect(() => {
    async function load() {
      const res = await listChessStudiesAction();
      if (res.success && res.data) {
        setStudies(res.data);
        if (res.data.length > 0) setSelectedStudy(res.data[0]);
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Interactive PGN Study Library"
        subtitle="Explore coach-annotated master games, opening guides, and endgame theory studies."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Study List */}
        <div className="space-y-3">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
            Available Studies ({studies.length})
          </h3>

          <div className="space-y-2">
            {studies.map((study) => (
              <button
                key={study.id}
                type="button"
                onClick={() => setSelectedStudy(study)}
                className={`w-full text-left p-4 rounded-2xl border transition-all ${
                  selectedStudy?.id === study.id
                    ? 'bg-slate-900 border-amber-400 shadow-gold'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold">
                    {study.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">{study.difficulty}</span>
                </div>

                <h4 className="font-heading font-bold text-sm text-white mb-1">
                  {study.title}
                </h4>

                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  {study.description}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Study Interactive Viewer */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl text-white">
          {selectedStudy ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                <div>
                  <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                    {selectedStudy.category} • {selectedStudy.author}
                  </span>
                  <h3 className="font-heading font-extrabold text-lg text-white">
                    {selectedStudy.title}
                  </h3>
                </div>

                <span className="px-3 py-1 bg-slate-950 border border-slate-800 font-mono text-xs font-bold text-slate-300 rounded-xl self-start sm:self-auto">
                  {selectedStudy.movesCount} Moves
                </span>
              </div>

              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <span className="text-xs font-bold text-slate-300 block">PGN Move Notation:</span>
                <div className="font-mono text-xs text-amber-300/90 leading-relaxed bg-slate-900 p-3 rounded-xl border border-slate-800 select-all">
                  {selectedStudy.pgn}
                </div>
              </div>

              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs text-amber-200 leading-relaxed">
                💡 <strong className="text-white">Coach Note:</strong> Step through these moves to understand pawn structure control and piece development in the early game!
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-slate-400 text-xs">
              Select a study from the library to begin reading.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
