'use client';

import React, { useState, useEffect } from 'react';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import { fetchCurriculumHierarchyAction } from '@/actions/curriculum';
import type { CurriculumProgram, CurriculumLesson } from '@/types/curriculum.types';

export default function CoachCurriculumPage() {
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<CurriculumLesson | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetchCurriculumHierarchyAction();
      if (res.success && res.data) {
        setPrograms(res.data);
        if (res.data[0]?.courses?.[0]?.chapters?.[0]?.lessons?.[0]) {
          setSelectedLesson(res.data[0].courses[0].chapters[0].lessons[0]);
        }
      }
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Teaching Curriculum Library (Coach Explorer)"
        subtitle="Browse permanent academy teaching tracks and prepare position materials for live classrooms."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-white">
          <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-400 border-b border-slate-800 pb-2">
            Academy Curriculum Tracks
          </h3>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {programs.map((prog) => (
              <div key={prog.id} className="space-y-2">
                <span className="text-xs font-bold text-slate-300 block">{prog.title}</span>
                {prog.courses?.map((crs) => (
                  <div key={crs.id} className="pl-2 space-y-1">
                    <span className="text-[11px] font-semibold text-amber-300 block">📚 {crs.title}</span>
                    {crs.chapters?.map((chp) => (
                      <div key={chp.id} className="pl-2 space-y-1">
                        {chp.lessons?.map((les) => (
                          <button
                            key={les.id}
                            type="button"
                            onClick={() => setSelectedLesson(les)}
                            className={`w-full text-left p-2 rounded-xl text-xs font-medium transition-all ${
                              selectedLesson?.id === les.id
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-gold'
                                : 'bg-slate-950/40 border border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            ♟️ {les.title}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-xl text-white">
          {selectedLesson ? (
            <div className="space-y-4">
              <div className="border-b border-slate-800 pb-3">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                  Lesson Positions Overview
                </span>
                <h3 className="font-heading font-extrabold text-lg text-white">
                  {selectedLesson.title}
                </h3>
              </div>

              <div className="space-y-3">
                {selectedLesson.positions?.map((pos, idx) => (
                  <div
                    key={pos.id}
                    className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-amber-400">Position #{idx + 1}: {pos.title}</span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-[10px]">
                        {pos.difficulty}
                      </span>
                    </div>

                    <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-amber-300">
                      {pos.fen}
                    </div>

                    {pos.explanation && (
                      <p className="text-xs text-slate-400 leading-relaxed">
                        💡 {pos.explanation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-500 text-xs">
              Select a lesson from the left panel to explore teaching positions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
