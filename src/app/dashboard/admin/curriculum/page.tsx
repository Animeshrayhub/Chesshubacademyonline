'use client';

import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import {
  fetchCurriculumHierarchyAction,
  createProgramAction,
  createCourseAction,
  createChapterAction,
  createLessonAction,
  saveTeachingPositionAction,
  duplicateLessonAction,
  reorderPositionsAction,
} from '@/actions/curriculum';
import type {
  CurriculumProgram,
  CurriculumCourse,
  CurriculumChapter,
  CurriculumLesson,
  TeachingPosition,
} from '@/types/curriculum.types';

export default function AdminCurriculumPage() {
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection state
  const [selectedProgram, setSelectedProgram] = useState<CurriculumProgram | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CurriculumCourse | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<CurriculumChapter | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CurriculumLesson | null>(null);

  // Modal / Form states
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [newProgramTitle, setNewProgramTitle] = useState('');
  const [newProgramDesc, setNewProgramDesc] = useState('');
  const [newProgramLevel, setNewProgramLevel] = useState<'Beginner' | 'Intermediate' | 'Advanced' | 'Master'>('Beginner');

  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [newCourseTitle, setNewCourseTitle] = useState('');

  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState('');

  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [newLessonTitle, setNewLessonTitle] = useState('');

  const [showAddPosModal, setShowAddPosModal] = useState(false);
  const [posTitle, setPosTitle] = useState('');
  const [posFen, setPosFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [posSolution, setPosSolution] = useState('');
  const [posHint, setPosHint] = useState('');
  const [posExplanation, setPosExplanation] = useState('');
  const [posDifficulty, setPosDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [posTags, setPosTags] = useState('Tactics, Fork');
  const [posOrientation, setPosOrientation] = useState<'white' | 'black'>('white');
  const [posBoardLock, setPosBoardLock] = useState(true);
  const [posNotes, setPosNotes] = useState('');

  // PGN Import Mode States
  const [importMode, setImportMode] = useState<'fen' | 'pgn'>('fen');
  const [pgnText, setPgnText] = useState('');
  const [pgnError, setPgnError] = useState('');

  const handleImportPgn = () => {
    if (!pgnText.trim()) return;
    try {
      const chess = new Chess();
      chess.loadPgn(pgnText);
      const parsedFen = chess.fen();
      const historyMoves = chess.history().join(' ');
      const headers = chess.header();
      const headerOpening = headers['Opening'] || headers['Event'];

      setPosFen(parsedFen);
      if (historyMoves) setPosSolution(historyMoves);
      if (headerOpening && !posTitle) setPosTitle(headerOpening);
      setPgnError('');
      alert('✅ PGN parsed! FEN & Solution moves auto-populated.');
    } catch {
      setPgnError('Invalid PGN format. Please check move notation.');
    }
  };

  const loadData = async () => {
    setLoading(true);
    const res = await fetchCurriculumHierarchyAction();
    if (res.success && res.data) {
      setPrograms(res.data);
      if (res.data.length > 0) {
        setSelectedProgram(res.data[0]);
        if (res.data[0].courses?.[0]) {
          setSelectedCourse(res.data[0].courses[0]);
          if (res.data[0].courses[0].chapters?.[0]) {
            setSelectedChapter(res.data[0].courses[0].chapters[0]);
            if (res.data[0].courses[0].chapters[0].lessons?.[0]) {
              setSelectedLesson(res.data[0].courses[0].chapters[0].lessons[0]);
            }
          }
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProgram = async () => {
    if (!newProgramTitle.trim()) return;
    await createProgramAction(newProgramTitle, newProgramDesc, newProgramLevel);
    setNewProgramTitle('');
    setNewProgramDesc('');
    setShowAddProgramModal(false);
    loadData();
  };

  const handleCreateCourse = async () => {
    if (!selectedProgram || !newCourseTitle.trim()) return;
    await createCourseAction(selectedProgram.id, newCourseTitle);
    setNewCourseTitle('');
    setShowAddCourseModal(false);
    loadData();
  };

  const handleCreateChapter = async () => {
    if (!selectedCourse || !newChapterTitle.trim()) return;
    await createChapterAction(selectedCourse.id, newChapterTitle);
    setNewChapterTitle('');
    setShowAddChapterModal(false);
    loadData();
  };

  const handleCreateLesson = async () => {
    if (!selectedChapter || !newLessonTitle.trim()) return;
    await createLessonAction(selectedChapter.id, newLessonTitle);
    setNewLessonTitle('');
    setShowAddLessonModal(false);
    loadData();
  };

  const handleSavePosition = async () => {
    if (!selectedLesson || !posTitle.trim()) return;
    const tagList = posTags.split(',').map((t) => t.trim()).filter(Boolean);
    await saveTeachingPositionAction(selectedLesson.id, {
      title: posTitle,
      fen: posFen,
      solution: posSolution,
      hint: posHint,
      explanation: posExplanation,
      difficulty: posDifficulty,
      tags: tagList,
      boardOrientation: posOrientation,
      defaultBoardLock: posBoardLock,
      notes: posNotes,
    });
    setPosTitle('');
    setPosSolution('');
    setPosHint('');
    setPosExplanation('');
    setShowAddPosModal(false);
    loadData();
  };

  const handleDuplicateLesson = async (lessonId: string) => {
    await duplicateLessonAction(lessonId);
    loadData();
  };

  const handleMovePosition = async (posId: string, direction: 'up' | 'down') => {
    if (!selectedLesson || !selectedLesson.positions) return;
    const posList = [...selectedLesson.positions];
    const idx = posList.findIndex((p) => p.id === posId);
    if (idx < 0) return;

    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= posList.length) return;

    const temp = posList[idx];
    posList[idx] = posList[targetIdx];
    posList[targetIdx] = temp;

    await reorderPositionsAction(
      selectedLesson.id,
      posList.map((p) => p.id)
    );
    loadData();
  };

  return (
    <div className="space-y-6 select-none">
      <PageHeader
        title="Teaching Curriculum Library"
        subtitle="Permanent classroom teaching database used directly inside live classrooms by coaches."
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Navigation Column: Programs, Courses, Chapters, Lessons */}
        <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-amber-400">
              Curriculum Tracks
            </h3>
            <button
              type="button"
              onClick={() => setShowAddProgramModal(true)}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-gold"
            >
              + Program
            </button>
          </div>

          <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
            {programs.map((prog) => (
              <div key={prog.id} className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProgram(prog);
                    setSelectedCourse(prog.courses?.[0] || null);
                    setSelectedChapter(prog.courses?.[0]?.chapters?.[0] || null);
                    setSelectedLesson(prog.courses?.[0]?.chapters?.[0]?.lessons?.[0] || null);
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all ${
                    selectedProgram?.id === prog.id
                      ? 'bg-slate-950 border-amber-400 text-amber-300 font-bold shadow-md'
                      : 'bg-slate-950/40 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-center text-xs">
                    <span>{prog.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">
                      {prog.targetLevel}
                    </span>
                  </div>
                </button>

                {/* Courses inside selected program */}
                {selectedProgram?.id === prog.id && (
                  <div className="pl-3 border-l-2 border-slate-800 space-y-2 mt-2">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                      <span>Courses ({prog.courses?.length || 0})</span>
                      <button
                        type="button"
                        onClick={() => setShowAddCourseModal(true)}
                        className="text-amber-400 hover:underline"
                      >
                        + Add Course
                      </button>
                    </div>

                    {prog.courses?.map((crs) => (
                      <div key={crs.id} className="space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCourse(crs);
                            setSelectedChapter(crs.chapters?.[0] || null);
                            setSelectedLesson(crs.chapters?.[0]?.lessons?.[0] || null);
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs border ${
                            selectedCourse?.id === crs.id
                              ? 'bg-slate-800 border-amber-400 text-white font-bold'
                              : 'bg-slate-950/20 border-slate-800 text-slate-400'
                          }`}
                        >
                          📚 {crs.title}
                        </button>

                        {/* Chapters inside selected course */}
                        {selectedCourse?.id === crs.id && (
                          <div className="pl-3 border-l-2 border-amber-500/30 space-y-1.5 mt-1">
                            <div className="flex items-center justify-between text-[10px] text-slate-400">
                              <span>Chapters</span>
                              <button
                                type="button"
                                onClick={() => setShowAddChapterModal(true)}
                                className="text-amber-400 hover:underline"
                              >
                                + Add Chapter
                              </button>
                            </div>

                            {crs.chapters?.map((chp) => (
                              <div key={chp.id} className="space-y-1">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedChapter(chp);
                                    setSelectedLesson(chp.lessons?.[0] || null);
                                  }}
                                  className={`w-full text-left p-1.5 rounded-lg text-[11px] border ${
                                    selectedChapter?.id === chp.id
                                      ? 'bg-slate-900 border-amber-400 text-amber-300 font-bold'
                                      : 'bg-slate-950/10 border-slate-800 text-slate-400'
                                  }`}
                                >
                                  📖 {chp.title}
                                </button>

                                {/* Lessons inside selected chapter */}
                                {selectedChapter?.id === chp.id && (
                                  <div className="pl-3 border-l-2 border-slate-700 space-y-1 mt-1">
                                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                                      <span>Lessons</span>
                                      <button
                                        type="button"
                                        onClick={() => setShowAddLessonModal(true)}
                                        className="text-amber-400 hover:underline"
                                      >
                                        + Add Lesson
                                      </button>
                                    </div>

                                    {chp.lessons?.map((les) => (
                                      <button
                                        key={les.id}
                                        type="button"
                                        onClick={() => setSelectedLesson(les)}
                                        className={`w-full text-left p-1.5 rounded-md text-[10px] font-semibold transition-all ${
                                          selectedLesson?.id === les.id
                                            ? 'bg-amber-500 text-slate-950 font-bold'
                                            : 'text-slate-300 hover:bg-slate-800'
                                        }`}
                                      >
                                        ♟️ {les.title}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Selected Lesson & Teaching Positions Editor */}
        <div className="lg:col-span-3 space-y-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white">
          {selectedLesson ? (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                    {selectedProgram?.title} &bull; {selectedCourse?.title} &bull; {selectedChapter?.title}
                  </span>
                  <h3 className="font-heading font-extrabold text-xl text-white">
                    {selectedLesson.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDuplicateLesson(selectedLesson.id)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all"
                  >
                    👯 Duplicate Lesson
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddPosModal(true)}
                    className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-gold"
                  >
                    + Add Teaching Position
                  </button>
                </div>
              </div>

              {/* Position List */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                  Teaching Positions ({selectedLesson.positions?.length || 0})
                </h4>

                {selectedLesson.positions && selectedLesson.positions.length > 0 ? (
                  <div className="space-y-3">
                    {selectedLesson.positions.map((pos, idx) => (
                      <div
                        key={pos.id}
                        className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/30">
                              #{idx + 1}
                            </span>
                            <h5 className="font-bold text-sm text-white">{pos.title}</h5>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                              {pos.difficulty}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleMovePosition(pos.id, 'up')}
                              disabled={idx === 0}
                              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 rounded-lg text-xs"
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMovePosition(pos.id, 'down')}
                              disabled={idx === (selectedLesson.positions?.length || 0) - 1}
                              className="px-2 py-1 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border border-slate-800 text-slate-300 rounded-lg text-xs"
                            >
                              ▼
                            </button>
                          </div>
                        </div>

                        <div className="p-2.5 bg-slate-900 border border-slate-800/80 rounded-xl font-mono text-xs text-amber-300 select-all overflow-x-auto">
                          {pos.fen}
                        </div>

                        {(pos.solution || pos.hint) && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                            {pos.solution && (
                              <div className="p-2 bg-emerald-950/30 border border-emerald-500/20 text-emerald-300 rounded-xl">
                                🔑 <strong>Solution:</strong> {pos.solution}
                              </div>
                            )}
                            {pos.hint && (
                              <div className="p-2 bg-amber-950/30 border border-amber-500/20 text-amber-300 rounded-xl">
                                💡 <strong>Hint:</strong> {pos.hint}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-500 text-xs bg-slate-950 border border-slate-800 rounded-2xl">
                    No teaching positions added yet. Click &quot;+ Add Teaching Position&quot; to import FEN/PGN positions.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16 text-slate-400 text-xs">
              Select a lesson from the left panel to view and manage teaching positions.
            </div>
          )}
        </div>
      </div>

      {/* Add Program Modal */}
      {showAddProgramModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl text-white">
            <h3 className="font-heading font-extrabold text-lg">Add New Program Track</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Program Title</label>
                <input
                  type="text"
                  value={newProgramTitle}
                  onChange={(e) => setNewProgramTitle(e.target.value)}
                  placeholder="e.g. Master Opening Repertoire"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Target Level</label>
                <select
                  value={newProgramLevel}
                  onChange={(e) => setNewProgramLevel(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Master">Master</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddProgramModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateProgram}
                className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-gold"
              >
                Create Program
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Position Modal */}
      {showAddPosModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-heading font-extrabold text-lg">Add Teaching Position</h3>
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setImportMode('fen')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    importMode === 'fen'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  🧩 FEN Mode
                </button>
                <button
                  type="button"
                  onClick={() => setImportMode('pgn')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    importMode === 'pgn'
                      ? 'bg-amber-500 text-slate-950 shadow-sm'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  📜 PGN Import Mode
                </button>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-300 block mb-1">Position Name / Title</label>
                <input
                  type="text"
                  value={posTitle}
                  onChange={(e) => setPosTitle(e.target.value)}
                  placeholder="e.g. Knight Sacrifice on f7"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              {importMode === 'pgn' ? (
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                  <label className="font-bold text-amber-400 block">Paste Raw PGN Game String</label>
                  <textarea
                    value={pgnText}
                    onChange={(e) => setPgnText(e.target.value)}
                    rows={3}
                    placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6..."
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 font-mono text-amber-300 text-xs"
                  />
                  {pgnError && <p className="text-[11px] text-red-400 font-bold">{pgnError}</p>}
                  <button
                    type="button"
                    onClick={handleImportPgn}
                    className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-gold"
                  >
                    ⚡ Parse PGN to FEN & Solution
                  </button>
                </div>
              ) : (
                <div>
                  <label className="font-bold text-slate-300 block mb-1">FEN Notation String</label>
                  <input
                    type="text"
                    value={posFen}
                    onChange={(e) => setPosFen(e.target.value)}
                    placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 font-mono text-amber-300"
                  />
                </div>
              )}

              <div>
                <label className="font-bold text-slate-300 block mb-1">Solution SAN / PGN Moves</label>
                <input
                  type="text"
                  value={posSolution}
                  onChange={(e) => setPosSolution(e.target.value)}
                  placeholder="e.g. 1. Nxf7 Kxf7 2. Qh5+"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Difficulty</label>
                  <select
                    value={posDifficulty}
                    onChange={(e) => setPosDifficulty(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Board Orientation</label>
                  <select
                    value={posOrientation}
                    onChange={(e) => setPosOrientation(e.target.value as any)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                  >
                    <option value="white">White</option>
                    <option value="black">Black</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Student Hint</label>
                <input
                  type="text"
                  value={posHint}
                  onChange={(e) => setPosHint(e.target.value)}
                  placeholder="e.g. Look for the pin along the a2-g8 diagonal"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>

              <div>
                <label className="font-bold text-slate-300 block mb-1">Tactical Explanation</label>
                <textarea
                  value={posExplanation}
                  onChange={(e) => setPosExplanation(e.target.value)}
                  rows={2}
                  placeholder="Detailed tactical breakdown for coaches..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPosModal(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePosition}
                className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl text-xs font-extrabold shadow-gold"
              >
                Save Position
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
