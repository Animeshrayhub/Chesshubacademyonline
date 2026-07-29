'use client';

import React, { useState, useEffect } from 'react';
import { fetchCurriculumHierarchyAction } from '@/actions/curriculum';
import type { CurriculumProgram, CurriculumLesson, TeachingPosition } from '@/types/curriculum.types';

interface ClassroomLessonDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectPosition: (position: TeachingPosition, lessonPositions: TeachingPosition[], index: number) => void;
}

export default function ClassroomLessonDrawer({
  isOpen,
  onClose,
  onSelectPosition,
}: ClassroomLessonDrawerProps) {
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]);
  const [selectedLesson, setSelectedLesson] = useState<CurriculumLesson | null>(null);

  useEffect(() => {
    if (isOpen) {
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
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex justify-end">
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-md h-full p-6 space-y-4 shadow-2xl text-white flex flex-col">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <span className="text-xl">📚</span>
            <h3 className="font-heading font-extrabold text-base">Load Teaching Lesson</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white font-bold text-sm"
          >
            ✕
          </button>
        </div>

        {/* Hierarchy Navigation Picker */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
            Select Lesson Chapter
          </h4>

          <div className="space-y-2">
            {programs.map((prog) => (
              <div key={prog.id} className="space-y-1.5">
                <span className="text-xs font-bold text-slate-300 block">{prog.title}</span>
                {prog.courses?.map((crs) => (
                  <div key={crs.id} className="pl-2 space-y-1">
                    {crs.chapters?.map((chp) => (
                      <div key={chp.id} className="pl-2 space-y-1">
                        {chp.lessons?.map((les) => (
                          <button
                            key={les.id}
                            type="button"
                            onClick={() => setSelectedLesson(les)}
                            className={`w-full text-left p-2 rounded-xl text-xs font-semibold transition-all ${
                              selectedLesson?.id === les.id
                                ? 'bg-amber-500 text-slate-950 font-bold shadow-gold'
                                : 'bg-slate-950/60 border border-slate-800 text-slate-300 hover:border-slate-700'
                            }`}
                          >
                            ♟️ {les.title} ({les.positions?.length || 0} Positions)
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Position Cards inside Selected Lesson */}
          {selectedLesson && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-extrabold text-white">
                Positions in {selectedLesson.title}
              </h4>

              {selectedLesson.positions?.map((pos, idx) => (
                <div
                  key={pos.id}
                  className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 space-y-2 hover:border-amber-400/50 transition-all"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-white">
                      #{idx + 1}. {pos.title}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-900 text-amber-300 text-[10px] font-mono">
                      {pos.difficulty}
                    </span>
                  </div>

                  <p className="font-mono text-[10px] text-slate-400 truncate bg-slate-900 p-2 rounded-lg border border-slate-800">
                    {pos.fen}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      onSelectPosition(pos, selectedLesson.positions || [], idx);
                      onClose();
                    }}
                    className="w-full py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-gold"
                  >
                    🎯 Load Board
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
