'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Chess } from 'chess.js';
import PageHeader from '@/components/dashboard/ui/PageHeader';
import MiniChessBoard from '@/components/dashboard/ui/MiniChessBoard';
import {
  fetchCurriculumHierarchyAction,
  createProgramAction,
  updateProgramAction,
  createCourseAction,
  createChapterAction,
  createLessonAction,
  saveTeachingPositionAction,
  duplicateLessonAction,
  reorderPositionsAction,
  bulkImportPositionsAction,
  addLessonMediaAction,
  deleteLessonMediaAction,
  fetchTeachingTagsAction,
  createTeachingTagAction,
  archiveEntityAction,
  clearAllFakeDataAction,
  saveVersionSnapshotAction,
  fetchVersionHistoryAction,
} from '@/actions/curriculum';
import type {
  CurriculumProgram,
  CurriculumCourse,
  CurriculumChapter,
  CurriculumLesson,
  TeachingPosition,
  LessonMedia,
  TeachingTag,
  CurriculumVersionHistory,
  DifficultyLevel,
} from '@/types/curriculum.types';

type AdminTab =
  | 'hierarchy'
  | 'programs'
  | 'courses'
  | 'chapters'
  | 'lessons'
  | 'positions'
  | 'media'
  | 'tags'
  | 'import_pgn'
  | 'import_fen'
  | 'import_csv';

export default function AdminCurriculumPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('hierarchy');
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]);
  const [tags, setTags] = useState<TeachingTag[]>([]);
  const [loading, setLoading] = useState(true);

  // Selection states
  const [selectedProgram, setSelectedProgram] = useState<CurriculumProgram | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<CurriculumCourse | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<CurriculumChapter | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<CurriculumLesson | null>(null);
  const [selectedPosition, setSelectedPosition] = useState<TeachingPosition | null>(null);

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('');

  // Modals
  const [showAddProgramModal, setShowAddProgramModal] = useState(false);
  const [progTitle, setProgTitle] = useState('');
  const [progDesc, setProgDesc] = useState('');
  const [progLevel, setProgLevel] = useState<DifficultyLevel>('Beginner');

  const [showAddCourseModal, setShowAddCourseModal] = useState(false);
  const [courseTitle, setCourseTitle] = useState('');
  const [courseDesc, setCourseDesc] = useState('');

  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [chapterTitle, setChapterTitle] = useState('');
  const [chapterDesc, setChapterDesc] = useState('');

  const [showAddLessonModal, setShowAddLessonModal] = useState(false);
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonObjectives, setLessonObjectives] = useState('');
  const [lessonCoachNotes, setLessonCoachNotes] = useState('');
  const [lessonDuration, setLessonDuration] = useState<number>(30);
  const [lessonDifficulty, setLessonDifficulty] = useState<DifficultyLevel>('Beginner');

  const [showAddPosModal, setShowAddPosModal] = useState(false);
  const [posTitle, setPosTitle] = useState('');
  const [posFen, setPosFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [posSolution, setPosSolution] = useState('');
  const [posAltSolution, setPosAltSolution] = useState('');
  const [posHint, setPosHint] = useState('');
  const [posExplanation, setPosExplanation] = useState('');
  const [posDifficulty, setPosDifficulty] = useState<DifficultyLevel>('Beginner');
  const [posTheme, setPosTheme] = useState('Tactics');
  const [posTags, setPosTags] = useState('Tactics, Fork');
  const [posOrientation, setPosOrientation] = useState<'white' | 'black'>('white');
  const [posBoardLock, setPosBoardLock] = useState(true);
  const [posStockfishEval, setPosStockfishEval] = useState('');
  const [posCoachNotes, setPosCoachNotes] = useState('');

  // Media attachment modal
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [mediaType, setMediaType] = useState<'pdf' | 'video' | 'image'>('pdf');
  const [mediaTitle, setMediaTitle] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');

  // Tag creation modal
  const [showTagModal, setShowTagModal] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3B82F6');

  // Import text states
  const [importPgnText, setImportPgnText] = useState('');
  const [importFenText, setImportFenText] = useState('');
  const [importCsvText, setImportCsvText] = useState('');
  const [importSuccessMsg, setImportSuccessMsg] = useState('');
  const [importErrorMsg, setImportErrorMsg] = useState('');

  // Version History Modal
  const [showVersionModal, setShowVersionModal] = useState(false);
  const [versionHistory, setVersionHistory] = useState<CurriculumVersionHistory[]>([]);

  // Preview Modal
  const [previewPosition, setPreviewPosition] = useState<TeachingPosition | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    const res = await fetchCurriculumHierarchyAction(true);
    if (res.success && res.data) {
      setPrograms(res.data);
      if (res.data.length > 0 && !selectedProgram) {
        const p0 = res.data[0];
        setSelectedProgram(p0);
        if (p0.courses?.[0]) {
          const c0 = p0.courses[0];
          setSelectedCourse(c0);
          if (c0.chapters?.[0]) {
            const ch0 = c0.chapters[0];
            setSelectedChapter(ch0);
            if (ch0.lessons?.[0]) {
              setSelectedLesson(ch0.lessons[0]);
            }
          }
        }
      }
    }
    const tagsRes = await fetchTeachingTagsAction();
    if (tagsRes.success && tagsRes.data) setTags(tagsRes.data);
    setLoading(false);
  }, [selectedProgram]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateProgram = async () => {
    if (!progTitle.trim()) return;
    await createProgramAction(progTitle, progDesc, progLevel);
    setProgTitle('');
    setProgDesc('');
    setShowAddProgramModal(false);
    loadData();
  };

  const handleCreateCourse = async () => {
    if (!selectedProgram || !courseTitle.trim()) return;
    await createCourseAction(selectedProgram.id, courseTitle, courseDesc);
    setCourseTitle('');
    setCourseDesc('');
    setShowAddCourseModal(false);
    loadData();
  };

  const handleCreateChapter = async () => {
    if (!selectedCourse || !chapterTitle.trim()) return;
    await createChapterAction(selectedCourse.id, chapterTitle, chapterDesc);
    setChapterTitle('');
    setChapterDesc('');
    setShowAddChapterModal(false);
    loadData();
  };

  const handleCreateLesson = async () => {
    if (!selectedChapter || !lessonTitle.trim()) return;
    await createLessonAction(selectedChapter.id, lessonTitle, lessonDesc, {
      objectives: lessonObjectives,
      coachNotes: lessonCoachNotes,
      estimatedDuration: lessonDuration,
      difficulty: lessonDifficulty,
    });
    setLessonTitle('');
    setLessonDesc('');
    setShowAddLessonModal(false);
    loadData();
  };

  const handleSavePosition = async () => {
    if (!selectedLesson || !posTitle.trim()) return;
    const tagList = posTags.split(',').map((t) => t.trim()).filter(Boolean);
    const saved = await saveTeachingPositionAction(selectedLesson.id, {
      id: selectedPosition ? selectedPosition.id : undefined,
      title: posTitle,
      fen: posFen,
      solution: posSolution,
      alternativeSolution: posAltSolution,
      hint: posHint,
      explanation: posExplanation,
      difficulty: posDifficulty,
      theme: posTheme,
      tags: tagList,
      boardOrientation: posOrientation,
      defaultBoardLock: posBoardLock,
      stockfishEval: posStockfishEval,
      coachNotes: posCoachNotes,
    });

    if (saved.success && saved.data) {
      await saveVersionSnapshotAction('position', saved.data.id, saved.data);
    }

    setPosTitle('');
    setPosSolution('');
    setPosAltSolution('');
    setPosHint('');
    setPosExplanation('');
    setSelectedPosition(null);
    setShowAddPosModal(false);
    loadData();
  };

  const handleDuplicateLesson = async (lessonId: string) => {
    await duplicateLessonAction(lessonId);
    loadData();
  };

  const handleArchiveEntity = async (type: 'program' | 'course' | 'chapter' | 'lesson' | 'position', id: string) => {
    if (confirm(`Are you sure you want to delete this ${type}?`)) {
      await archiveEntityAction(type, id);
      if (type === 'position' && selectedPosition?.id === id) {
        setSelectedPosition(null);
      } else if (type === 'lesson' && selectedLesson?.id === id) {
        setSelectedLesson(null);
      } else if (type === 'chapter' && selectedChapter?.id === id) {
        setSelectedChapter(null);
        setSelectedLesson(null);
      } else if (type === 'course' && selectedCourse?.id === id) {
        setSelectedCourse(null);
        setSelectedChapter(null);
        setSelectedLesson(null);
      } else if (type === 'program' && selectedProgram?.id === id) {
        setSelectedProgram(null);
        setSelectedCourse(null);
        setSelectedChapter(null);
        setSelectedLesson(null);
      }
      loadData();
    }
  };

  const handleClearAllFakeData = async () => {
    if (confirm('Are you sure you want to clear all fake/demo data? This will empty the curriculum database so you can import real PGNs and create clean curriculum tracks.')) {
      await clearAllFakeDataAction();
      setSelectedProgram(null);
      setSelectedCourse(null);
      setSelectedChapter(null);
      setSelectedLesson(null);
      setSelectedPosition(null);
      loadData();
    }
  };

  const handlePgnFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        setImportPgnText(text);
        setImportSuccessMsg(`📄 Loaded file "${file.name}" (${(file.size / 1024).toFixed(1)} KB). Click "Execute PGN Bulk Import" below to import into selected lesson.`);
        setImportErrorMsg('');
      }
    };
    reader.readAsText(file);
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

  const handleAddMedia = async () => {
    if (!selectedLesson || !mediaTitle.trim() || !mediaUrl.trim()) return;
    await addLessonMediaAction(selectedLesson.id, {
      type: mediaType,
      title: mediaTitle,
      url: mediaUrl,
    });
    setMediaTitle('');
    setMediaUrl('');
    setShowMediaModal(false);
    loadData();
  };

  const handleDeleteMedia = async (mediaId: string) => {
    await deleteLessonMediaAction(mediaId);
    loadData();
  };

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return;
    await createTeachingTagAction(newTagName, newTagColor);
    setNewTagName('');
    setShowTagModal(false);
    const tagsRes = await fetchTeachingTagsAction();
    if (tagsRes.success && tagsRes.data) setTags(tagsRes.data);
  };

  const handleRunBulkImport = async (type: 'pgn' | 'fen' | 'csv') => {
    if (!selectedLesson) {
      alert('Please select a target lesson before running bulk import.');
      return;
    }
    const text = type === 'pgn' ? importPgnText : type === 'fen' ? importFenText : importCsvText;
    if (!text.trim()) return;

    setImportSuccessMsg('');
    setImportErrorMsg('');

    const res = await bulkImportPositionsAction(selectedLesson.id, type, text);
    if (res.success) {
      setImportSuccessMsg(`✅ Successfully imported ${res.count} positions into "${selectedLesson.title}"!`);
      if (type === 'pgn') setImportPgnText('');
      else if (type === 'fen') setImportFenText('');
      else setImportCsvText('');
      loadData();
    } else {
      setImportErrorMsg(res.error || 'Import failed.');
    }
  };

  const handleViewVersionHistory = async (entityId: string) => {
    const res = await fetchVersionHistoryAction(entityId);
    if (res.success && res.data) {
      setVersionHistory(res.data);
      setShowVersionModal(true);
    }
  };

  return (
    <div className="space-y-6 select-none pb-12">
      <PageHeader
        title="Teaching Curriculum Admin Console"
        subtitle="Permanent classroom teaching database used directly inside live classrooms by coaches."
      />

      {/* Top Navigation Tabs */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-2 flex flex-wrap items-center justify-between gap-2 shadow-lg text-xs font-bold">
        <div className="flex flex-wrap gap-1">
          {[
            { id: 'hierarchy' as AdminTab, label: '📚 Hierarchy Explorer', emoji: '🌳' },
            { id: 'programs' as AdminTab, label: 'Programs Track', emoji: '🏆' },
            { id: 'courses' as AdminTab, label: 'Courses', emoji: '📘' },
            { id: 'chapters' as AdminTab, label: 'Chapters', emoji: '📖' },
            { id: 'lessons' as AdminTab, label: 'Lessons', emoji: '♟️' },
            { id: 'positions' as AdminTab, label: 'Positions Bank', emoji: '🧩' },
            { id: 'media' as AdminTab, label: 'Media Library', emoji: '📁' },
            { id: 'tags' as AdminTab, label: 'Tags Manager', emoji: '🏷️' },
            { id: 'import_pgn' as AdminTab, label: 'Import PGN', emoji: '📜' },
            { id: 'import_fen' as AdminTab, label: 'Import FEN', emoji: '🧩' },
            { id: 'import_csv' as AdminTab, label: 'Import CSV', emoji: '📊' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
                activeTab === tab.id
                  ? 'bg-amber-500 text-slate-950 shadow-gold font-extrabold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{tab.emoji}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleClearAllFakeData}
          className="px-3.5 py-2 bg-red-950/70 hover:bg-red-900 border border-red-500/40 text-red-300 font-extrabold rounded-xl transition-all flex items-center gap-1.5 shadow-md shrink-0"
          title="Delete all initial demo/fake data to start with a clean database"
        >
          <span>🧹</span>
          <span>Clear Fake Data</span>
        </button>
      </div>

      {/* Main View Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Column: Hierarchy Selector */}
        <div className="space-y-4 bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl text-white">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-heading font-bold text-xs uppercase tracking-wider text-amber-400">
              Curriculum Explorer
            </h3>
            <button
              type="button"
              onClick={() => setShowAddProgramModal(true)}
              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs transition-all shadow-gold"
            >
              + Program
            </button>
          </div>

          <div className="space-y-3 max-h-[650px] overflow-y-auto pr-1">
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
                    <span className="truncate pr-1">{prog.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 shrink-0">
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

        {/* Right Column: Tab Content */}
        <div className="lg:col-span-3 space-y-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-white min-h-[600px]">
          {/* TAB 1: Hierarchy / Selected Lesson View */}
          {activeTab === 'hierarchy' && (
            <div>
              {selectedLesson ? (
                <div className="space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                    <div>
                      <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider block">
                        {selectedProgram?.title} &bull; {selectedCourse?.title} &bull; {selectedChapter?.title}
                      </span>
                      <h3 className="font-heading font-extrabold text-xl text-white">
                        {selectedLesson.title}
                      </h3>
                      {selectedLesson.description && (
                        <p className="text-xs text-slate-400 mt-1">{selectedLesson.description}</p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDuplicateLesson(selectedLesson.id)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold rounded-xl text-xs transition-all"
                      >
                        👯 Duplicate
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMediaModal(true)}
                        className="px-3 py-1.5 bg-blue-600/30 hover:bg-blue-600/50 border border-blue-500/40 text-blue-300 font-bold rounded-xl text-xs transition-all"
                      >
                        📁 Add Media
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPosition(null);
                          setPosTitle('');
                          setPosFen('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
                          setPosSolution('');
                          setShowAddPosModal(true);
                        }}
                        className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shadow-gold"
                      >
                        + Add Position
                      </button>
                    </div>
                  </div>

                  {/* Lesson Details Card */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-950 border border-slate-800 rounded-2xl text-xs">
                    <div>
                      <span className="text-slate-400 block font-bold text-[10px] uppercase">Duration</span>
                      <span className="font-extrabold text-amber-300">⏱️ {selectedLesson.estimatedDuration} mins</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold text-[10px] uppercase">Difficulty</span>
                      <span className="font-extrabold text-emerald-400">🎯 {selectedLesson.difficulty}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-bold text-[10px] uppercase">Positions</span>
                      <span className="font-extrabold text-blue-400">♟️ {selectedLesson.positions?.length || 0} Positions</span>
                    </div>
                  </div>

                  {/* Attached Media List */}
                  {selectedLesson.media && selectedLesson.media.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">Attached Media & Resources</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {selectedLesson.media.map((med) => (
                          <div key={med.id} className="flex items-center justify-between p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs">
                            <div className="flex items-center gap-2 truncate">
                              <span>{med.type === 'pdf' ? '📄' : med.type === 'video' ? '🎬' : '🖼️'}</span>
                              <a href={med.url} target="_blank" rel="noreferrer" className="font-bold text-amber-400 hover:underline truncate">
                                {med.title}
                              </a>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleDeleteMedia(med.id)}
                              className="text-red-400 hover:text-red-300 font-bold px-2 py-0.5"
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Positions List View */}
                  <div className="space-y-3">
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                      Teaching Positions ({selectedLesson.positions?.length || 0})
                    </h4>

                    {selectedLesson.positions && selectedLesson.positions.length > 0 ? (
                      <div className="space-y-3">
                        {selectedLesson.positions.map((pos, idx) => (
                          <div
                            key={pos.id}
                            className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-slate-700 transition-all"
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
                                {pos.stockfishEval && (
                                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/30">
                                    Eval: {pos.stockfishEval}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setPreviewPosition(pos)}
                                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg"
                                >
                                  🔍 Preview
                                </button>
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
                                <button
                                  type="button"
                                  onClick={() => handleArchiveEntity('position', pos.id)}
                                  className="px-2 py-1 bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded-lg text-xs font-bold"
                                >
                                  🗑️
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
                        No teaching positions added yet. Click &quot;+ Add Position&quot; or use bulk import tabs above.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-16 text-slate-400 text-xs">
                  Select a lesson from the left panel to view and edit teaching positions.
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PGN Import */}
          {activeTab === 'import_pgn' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-amber-400">Import PGN Games & Studies</h3>
                  <p className="text-xs text-slate-400">
                    Upload a PGN file or paste PGN text. FEN headers, event titles, and solution moves will be parsed automatically into Teaching Positions for lesson: <strong className="text-amber-300">{selectedLesson?.title || '⚠️ None Selected'}</strong>.
                  </p>
                </div>
                <label className="cursor-pointer px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 shrink-0">
                  <span>📂</span>
                  <span>Upload .PGN File</span>
                  <input type="file" accept=".pgn,.txt" onChange={handlePgnFileUpload} className="hidden" />
                </label>
              </div>

              {!selectedLesson && (
                <div className="p-3 bg-amber-950/50 border border-amber-500/40 text-amber-300 rounded-xl text-xs font-bold flex items-center gap-2">
                  <span>⚠️</span>
                  <span>Please select a target lesson from the left Curriculum Explorer panel before importing PGNs.</span>
                </div>
              )}

              <textarea
                value={importPgnText}
                onChange={(e) => setImportPgnText(e.target.value)}
                rows={9}
                placeholder="[Event &quot;Sicilian Defense - Najdorf Variation&quot;]&#10;[FEN &quot;rnbqk2r/1p1pbppp/p3pn2/6B1/3NP3/2N5/PPP2PPP/R2QKB1R w KQkq - 2 7&quot;]&#10;1. f4 d6 2. Qf3..."
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 font-mono text-xs text-amber-300"
              />

              {importSuccessMsg && <div className="p-3 bg-emerald-950 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold">{importSuccessMsg}</div>}
              {importErrorMsg && <div className="p-3 bg-red-950 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold">{importErrorMsg}</div>}

              <button
                type="button"
                onClick={() => handleRunBulkImport('pgn')}
                disabled={!selectedLesson || !importPgnText.trim()}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl text-xs shadow-gold transition-all"
              >
                ⚡ Execute PGN Bulk Import
              </button>
            </div>
          )}

          {/* TAB 3: FEN Import */}
          {activeTab === 'import_fen' && (
            <div className="space-y-4">
              <h3 className="font-heading font-extrabold text-lg text-amber-400">Import FEN Notation Batch</h3>
              <p className="text-xs text-slate-400">
                Paste single FEN notation or multiple line-separated FEN strings to generate Teaching Positions directly.
              </p>

              <textarea
                value={importFenText}
                onChange={(e) => setImportFenText(e.target.value)}
                rows={8}
                placeholder="r1bqkb1r/pppp1ppp/2n5/4p3/4n3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4&#10;6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 font-mono text-xs text-amber-300"
              />

              {importSuccessMsg && <div className="p-3 bg-emerald-950 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold">{importSuccessMsg}</div>}
              {importErrorMsg && <div className="p-3 bg-red-950 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold">{importErrorMsg}</div>}

              <button
                type="button"
                onClick={() => handleRunBulkImport('fen')}
                disabled={!selectedLesson}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl text-xs shadow-gold transition-all"
              >
                ⚡ Execute FEN Batch Import
              </button>
            </div>
          )}

          {/* TAB 4: CSV Import */}
          {activeTab === 'import_csv' && (
            <div className="space-y-4">
              <h3 className="font-heading font-extrabold text-lg text-amber-400">Import CSV Spreadsheet</h3>
              <p className="text-xs text-slate-400">
                Paste CSV text with headers: <code>Title, FEN, Solution, Hint, Explanation, Difficulty, Theme, Tags</code>.
              </p>

              <textarea
                value={importCsvText}
                onChange={(e) => setImportCsvText(e.target.value)}
                rows={8}
                placeholder="Title,FEN,Solution,Hint,Difficulty,Theme&#10;&quot;Royal Knight Fork&quot;,&quot;r1bqkb1r/pppp1ppp/2n5/4p3/4n3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4&quot;,&quot;Nxe5 Nxe5 d4&quot;,&quot;Look at c7&quot;,&quot;Beginner&quot;,&quot;Fork&quot;"
                className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-3 font-mono text-xs text-amber-300"
              />

              {importSuccessMsg && <div className="p-3 bg-emerald-950 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-bold">{importSuccessMsg}</div>}
              {importErrorMsg && <div className="p-3 bg-red-950 border border-red-500/30 text-red-300 rounded-xl text-xs font-bold">{importErrorMsg}</div>}

              <button
                type="button"
                onClick={() => handleRunBulkImport('csv')}
                disabled={!selectedLesson}
                className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl text-xs shadow-gold transition-all"
              >
                ⚡ Execute CSV Bulk Import
              </button>
            </div>
          )}

          {/* TAB 5: Tags Manager */}
          {activeTab === 'tags' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-heading font-extrabold text-lg text-amber-400">Curriculum Tags Bank</h3>
                <button
                  type="button"
                  onClick={() => setShowTagModal(true)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs shadow-gold"
                >
                  + Create Tag
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {tags.map((tg) => (
                  <div key={tg.id} className="p-3 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tg.color || '#3B82F6' }} />
                      <span className="font-bold text-xs text-white">{tg.name}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Position Modal */}
      {showAddPosModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl text-white max-h-[90vh] overflow-y-auto">
            <h3 className="font-heading font-extrabold text-lg">Add / Edit Teaching Position</h3>

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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Solution SAN Moves</label>
                  <input
                    type="text"
                    value={posSolution}
                    onChange={(e) => setPosSolution(e.target.value)}
                    placeholder="e.g. 1. Nxf7 Kxf7 2. Qh5+"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-300 block mb-1">Alternative Solution</label>
                  <input
                    type="text"
                    value={posAltSolution}
                    onChange={(e) => setPosAltSolution(e.target.value)}
                    placeholder="e.g. 1. Bxf7+ Kxf7 2. Ng5+"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
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
                    <option value="Master">Master</option>
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

                <div>
                  <label className="font-bold text-slate-300 block mb-1">Stockfish Eval</label>
                  <input
                    type="text"
                    value={posStockfishEval}
                    onChange={(e) => setPosStockfishEval(e.target.value)}
                    placeholder="+3.5"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-white font-mono"
                  />
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

      {/* Position Preview Modal */}
      {previewPosition && (
        <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl text-white text-center">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3 text-left">
              <h3 className="font-heading font-extrabold text-base">{previewPosition.title}</h3>
              <button type="button" onClick={() => setPreviewPosition(null)} className="text-slate-400 hover:text-white font-bold">✕</button>
            </div>
            <div className="flex justify-center">
              <MiniChessBoard fen={previewPosition.fen} orientation={previewPosition.boardOrientation} size={280} />
            </div>
            <div className="text-xs font-mono text-amber-300 bg-slate-950 p-2 rounded-xl border border-slate-800 overflow-x-auto">
              {previewPosition.fen}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
