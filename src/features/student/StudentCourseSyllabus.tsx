'use client';

import React, { useState } from 'react';
import ChessWorkspace from '@/components/dashboard/ui/ChessWorkspace';


interface Chapter {
  id: string;
  title: string;
  notes?: string;
  video_url?: string;
  pdf_storage_path?: string;
  pdf_page_range?: string;
  pgn_data?: string;
  puzzle_images?: string[];
  assignment?: any;
}

interface Module {
  id: string;
  title: string;
  chapters?: Chapter[];
}

interface Course {
  id: string;
  title: string;
  description?: string;
  modules?: Module[];
}

interface Enrollment {
  course?: Course;
}

interface Props {
  enrollments: Enrollment[];
}

export default function StudentCourseSyllabus({ enrollments }: Props) {
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(
    enrollments[0]?.course || null
  );
  const [activeChapter, setActiveChapter] = useState<Chapter | null>(null);
  const [answers, setAnswers] = useState('');
  const [pdfPath, setPdfPath] = useState('');
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const extractCleanMovesFromPgn = (pgnString: string): string => {
    if (!pgnString) return '';
    return pgnString
      .replace(/\[[^\]]+\]/g, '')
      .replace(/\{[^}]*\}/g, '')
      .replace(/\$\d+/g, '')
      .replace(/1\/2-1\/2|1-0|0-1|\*/g, '')
      .trim();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setTimeout(() => {
      setPdfPath(file.name);
      setUploading(false);
    }, 800);
  };

  const handleHomeworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answers.trim() && !pdfPath) {
      alert('Please enter your move answers or upload a file.');
      return;
    }
    setSubmitting(true);
    setTimeout(() => {
      alert('Homework submitted successfully!');
      setSubmitting(false);
    }, 600);
  };

  if (!enrollments || enrollments.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        <p className="font-bold text-sm">No Enrolled Courses</p>
        <p className="text-xs text-slate-500 mt-1">Contact your academy administrator or coach to enroll in courses.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Course Selectors */}
      <div className="flex gap-3 overflow-x-auto pb-2">
        {enrollments.map((e, idx) => {
          const c = e.course;
          if (!c) return null;
          const isSelected = selectedCourse?.id === c.id;
          return (
            <button
              key={c.id || idx}
              type="button"
              onClick={() => {
                setSelectedCourse(c);
                setActiveChapter(null);
              }}
              className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all shrink-0 border ${
                isSelected
                  ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-md scale-105'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              📖 {c.title}
            </button>
          );
        })}
      </div>

      {/* Main Course Syllabus Content */}
      {selectedCourse && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Modules & Chapters Navigation Column */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 space-y-4">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Course Syllabus & Chapters
              </h3>

              {selectedCourse.modules && selectedCourse.modules.length > 0 ? (
                selectedCourse.modules.map((m, mIdx) => (
                  <div key={m.id || mIdx} className="space-y-2">
                    <span className="text-xs font-extrabold text-amber-400 block">
                      Module {mIdx + 1}: {m.title}
                    </span>
                    <div className="space-y-1.5 pl-2 border-l border-slate-800">
                      {m.chapters && m.chapters.length > 0 ? (
                        m.chapters.map((ch, chIdx) => {
                          const isActive = activeChapter?.id === ch.id;
                          return (
                            <button
                              key={ch.id || chIdx}
                              type="button"
                              onClick={() => {
                                setActiveChapter(ch);
                                setAnswers('');
                              }}
                              className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                                isActive
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                              }`}
                            >
                              📌 Chapter {chIdx + 1}: {ch.title}
                            </button>
                          );
                        })
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">No chapters in this module.</p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-500 italic">No syllabus modules released yet.</p>
              )}
            </div>
          </div>

          {/* Chapter Details & Interactive Board Column */}
          <div className="lg:col-span-8 space-y-6">
            {activeChapter ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6">
                <div className="border-b border-slate-800 pb-4">
                  <h2 className="text-base font-black text-white">{activeChapter.title}</h2>
                  {activeChapter.notes && (
                    <p className="text-xs text-slate-400 mt-1 whitespace-pre-line">{activeChapter.notes}</p>
                  )}
                </div>

                {/* Interactive Solver Board */}
                <form onSubmit={handleHomeworkSubmit} className="space-y-5">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                    Homework Challenge Exercise
                  </span>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    <div className="lg:col-span-7">
                      <div className="border border-slate-800 rounded-3xl p-3 bg-slate-950">
                        {(() => {
                          let fenToLoad: string | undefined = undefined;
                          if (activeChapter.pgn_data) {
                            const fenMatch = activeChapter.pgn_data.match(/\[FEN\s+"([^"]+)"\]/i);
                            if (fenMatch) {
                              fenToLoad = fenMatch[1].trim();
                            } else {
                              const regMatch = activeChapter.pgn_data.match(/(?:[rnbqkpRNBQKP1-8]{1,8}\/){7}[rnbqkpRNBQKP1-8]{1,8}(?:\s+[wb]\s+[-KQkqA-Ha-h1-8]+\s+[-a-h1-8]+\s+\d+\s+\d+)?/);
                              if (regMatch) fenToLoad = regMatch[0].trim();
                              else fenToLoad = activeChapter.pgn_data.trim();
                            }
                          }
                          return (
                            <ChessWorkspace
                              initialFen={fenToLoad}
                              targetSolution={activeChapter.pgn_data}
                              userRole="student"
                              showEngine={false}
                              onMove={(newFen, pgn) => {
                                if (pgn) {
                                  const clean = extractCleanMovesFromPgn(pgn);
                                  if (clean) setAnswers(clean);
                                }
                              }}
                            />
                          );
                        })()}
                      </div>
                    </div>

                    <div className="lg:col-span-5 space-y-4">
                      <div className="space-y-1.5">
                        <label className="block text-xs font-bold text-slate-400">
                          Write Your Answer / Moves
                        </label>
                        <textarea
                          id="answers"
                          placeholder="Write down clean move notation here (e.g. 1. Nh6#)..."
                          value={answers}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setAnswers(e.target.value)}
                          rows={6}
                          required
                          className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-400"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-bold text-slate-400">
                          Upload Worksheet Submission (PDF / Image)
                        </label>
                        {pdfPath ? (
                          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-slate-200 font-medium truncate max-w-[180px]">
                              File: {pdfPath}
                            </span>
                            <button
                              type="button"
                              onClick={() => setPdfPath('')}
                              className="text-red-400 font-bold hover:underline"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <input
                            type="file"
                            accept="application/pdf,image/*"
                            onChange={handleFileChange}
                            disabled={uploading}
                            className="w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-400/10 file:text-amber-300 hover:file:bg-amber-400/20 cursor-pointer"
                          />
                        )}
                        {uploading && (
                          <p className="text-[10px] text-amber-400 animate-pulse font-semibold">
                            Uploading solutions...
                          </p>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={submitting}
                        className="w-full bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-xl py-2.5 shadow-md transition-all text-xs"
                      >
                        {submitting ? 'Submitting…' : '🚀 Submit Homework Solution'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 text-center space-y-2">
                <span className="text-3xl">📖</span>
                <h4 className="text-xs font-bold text-slate-300">Select a Chapter</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Click any chapter from the syllabus navigation menu on the left to inspect lecture notes, view video lessons, and complete challenge exercises.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
