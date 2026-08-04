'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchCurriculumHierarchyAction } from '@/actions/curriculum';
import { getPuzzleBankAction } from '@/actions/puzzles';
import { parsePgn, pgnToTeachingPositions } from '@/utils/pgnParser';
import type { CurriculumProgram, CurriculumLesson, TeachingPosition } from '@/types/curriculum.types';
import type { ParsedPuzzle } from '@/utils/pgnParser';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ClassroomLessonDrawerProps {
  isOpen: boolean;
  isCoach: boolean;
  onClose: () => void;
  onSelectPosition: (position: TeachingPosition, lessonPositions: TeachingPosition[], index: number) => void;
  onPushPosition: (position: TeachingPosition) => void;
}

type DrawerTab = 'curriculum' | 'pgn' | 'bank';

const DIFFICULTY_COLORS: Record<string, string> = {
  Beginner:     'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  Intermediate: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Advanced:     'bg-red-500/20 text-red-300 border-red-500/30',
};

const THEME_PILLS = [
  { label: 'All', emoji: '♟️', value: '' },
  { label: 'Endgame', emoji: '🏁', value: 'endgame' },
  { label: 'Fork', emoji: '⚡', value: 'fork' },
  { label: 'Pin', emoji: '📌', value: 'pin' },
  { label: 'Promotion', emoji: '👑', value: 'promotion' },
  { label: 'Back Rank', emoji: '🏰', value: 'back_rank' },
  { label: 'Sacrifice', emoji: '🫡', value: 'sacrifice' },
  { label: 'Tactics', emoji: '⚔️', value: 'tactics' },
  { label: 'Mate in 1', emoji: '🎯', value: 'mate_in_one' },
  { label: 'Mate in 2', emoji: '🎯', value: 'mate_in_two' },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function ClassroomLessonDrawer({
  isOpen,
  isCoach,
  onClose,
  onSelectPosition,
  onPushPosition,
}: ClassroomLessonDrawerProps) {
  // Tabs
  const [activeTab, setActiveTab] = useState<DrawerTab>('curriculum');

  // Curriculum tree state
  const [programs, setPrograms] = useState<CurriculumProgram[]>([]);
  const [loadingCurriculum, setLoadingCurriculum] = useState(false);
  const [selectedLesson, setSelectedLesson] = useState<CurriculumLesson | null>(null);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [expandedVariations, setExpandedVariations] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [themeFilter, setThemeFilter] = useState('');

  // PGN paste tab state
  const [pgnText, setPgnText] = useState('');
  const [parsedPuzzles, setParsedPuzzles] = useState<ParsedPuzzle[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  // Puzzle bank tab state
  const [bankPuzzles, setBankPuzzles] = useState<any[]>([]);
  const [loadingBank, setLoadingBank] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [bankTheme, setBankTheme] = useState('');

  // Push feedback flash state
  const [pushedId, setPushedId] = useState<string | null>(null);
  const pushTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load curriculum on open
  useEffect(() => {
    if (isOpen && programs.length === 0) {
      setLoadingCurriculum(true);
      fetchCurriculumHierarchyAction().then((res) => {
        if (res.success && res.data) {
          setPrograms(res.data);
          // Auto-expand first program/course/chapter
          const first = res.data[0];
          if (first) {
            setExpandedPrograms(new Set([first.id]));
            const firstCourse = first.courses?.[0];
            if (firstCourse) {
              setExpandedCourses(new Set([firstCourse.id]));
              const firstChapter = firstCourse.chapters?.[0];
              if (firstChapter) {
                setExpandedChapters(new Set([firstChapter.id]));
                setSelectedLesson(firstChapter.lessons?.[0] || null);
              }
            }
          }
        }
        setLoadingCurriculum(false);
      });
    }
  }, [isOpen]);

  // Load puzzle bank when tab is activated
  useEffect(() => {
    if (activeTab === 'bank' && bankPuzzles.length === 0) {
      setLoadingBank(true);
      getPuzzleBankAction({ limit: 200 }).then((res) => {
        if (res.success) setBankPuzzles(res.puzzles || []);
        setLoadingBank(false);
      });
    }
  }, [activeTab]);

  const handlePush = useCallback((pos: TeachingPosition, id: string) => {
    onPushPosition(pos);
    setPushedId(id);
    if (pushTimeoutRef.current) clearTimeout(pushTimeoutRef.current);
    pushTimeoutRef.current = setTimeout(() => setPushedId(null), 1800);
  }, [onPushPosition]);

  const handleLoad = useCallback((pos: TeachingPosition, allPositions: TeachingPosition[], idx: number) => {
    onSelectPosition(pos, allPositions, idx);
    onClose();
  }, [onSelectPosition, onClose]);

  const handleParsePgn = () => {
    if (!pgnText.trim()) {
      setParseError('Please paste a PGN before parsing.');
      return;
    }
    setIsParsing(true);
    setParseError('');
    try {
      const puzzles = parsePgn(pgnText);
      if (puzzles.length === 0) {
        setParseError('No valid puzzles found. Please check your PGN format.');
      } else {
        setParsedPuzzles(puzzles);
      }
    } catch (e: any) {
      setParseError(e.message || 'Failed to parse PGN.');
    }
    setIsParsing(false);
  };

  const toggleSet = (setter: React.Dispatch<React.SetStateAction<Set<string>>>, id: string) => {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (!isOpen) return null;

  // ─── Filtered curriculum items ─────────────────────────────────────────────
  const filteredPrograms = programs.map((prog) => ({
    ...prog,
    courses: (prog.courses || []).map((crs) => ({
      ...crs,
      chapters: (crs.chapters || []).map((chp) => ({
        ...chp,
        lessons: (chp.lessons || []).filter((les) => {
          const q = searchQuery.toLowerCase();
          const matchesQ = !q || les.title.toLowerCase().includes(q) || chp.title.toLowerCase().includes(q);
          const matchesTheme = !themeFilter || (les.positions || []).some(
            (p) => (p.tags || []).includes(themeFilter)
          );
          return matchesQ && matchesTheme;
        }),
      })).filter((chp) => chp.lessons.length > 0 || !searchQuery),
    })).filter((crs) => (crs.chapters || []).some((c) => c.lessons.length > 0) || !searchQuery),
  })).filter((prog) => (prog.courses || []).some((c) => (c.chapters || []).some((ch) => ch.lessons.length > 0)) || !searchQuery);

  const totalMatchCount = filteredPrograms.reduce(
    (sum, p) => sum + p.courses.reduce(
      (s2, c) => s2 + c.chapters.reduce((s3, ch) => s3 + ch.lessons.length, 0), 0
    ), 0
  );

  // Filtered bank puzzles
  const filteredBank = bankPuzzles.filter((p) => {
    const matchSearch = !bankSearch || p.title?.toLowerCase().includes(bankSearch.toLowerCase()) || p.theme?.toLowerCase().includes(bankSearch.toLowerCase());
    const matchTheme = !bankTheme || p.theme === bankTheme;
    return matchSearch && matchTheme;
  });

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm z-50 flex justify-end" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-slate-900 border-l border-slate-800 w-full max-w-lg h-full shadow-2xl text-white flex flex-col">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-3.5 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📚</span>
            <h3 className="font-heading font-extrabold text-sm tracking-tight">Load Teaching Lesson</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-red-500/20 hover:text-red-400 text-slate-400 font-bold text-sm transition-all"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-800 flex-shrink-0">
          {[
            { id: 'curriculum' as DrawerTab, label: '📚 Curriculum', title: 'Lesson hierarchy' },
            { id: 'pgn' as DrawerTab, label: '♟️ Paste PGN', title: 'Import from PGN' },
            { id: 'bank' as DrawerTab, label: '🏦 Puzzle Bank', title: 'Admin puzzle library' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              title={tab.title}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-2.5 text-[11px] font-bold transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'border-amber-400 text-amber-300 bg-amber-400/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* ── TAB: Curriculum ─────────────────────────────────────────────── */}
        {activeTab === 'curriculum' && (
          <div className="flex flex-col flex-1 min-h-0">
            {/* Search + Filter */}
            <div className="px-4 pt-3 pb-2 space-y-2 flex-shrink-0 border-b border-slate-800/60">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lessons, chapters..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-all"
                />
                {searchQuery && (
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-amber-400 font-bold">
                    {totalMatchCount} match{totalMatchCount !== 1 ? 'es' : ''}
                  </span>
                )}
              </div>

              {/* Theme Pills */}
              <div className="flex gap-1 flex-wrap">
                {THEME_PILLS.map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setThemeFilter(pill.value === themeFilter ? '' : pill.value)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${
                      themeFilter === pill.value
                        ? 'bg-amber-400/20 border-amber-400/50 text-amber-300'
                        : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600'
                    }`}
                  >
                    {pill.emoji} {pill.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
              {loadingCurriculum ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Loading curriculum…</p>
                </div>
              ) : filteredPrograms.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-1 text-center">
                  <span className="text-2xl">🔍</span>
                  <p className="text-xs text-slate-400">No lessons match your search.</p>
                  <button type="button" onClick={() => { setSearchQuery(''); setThemeFilter(''); }} className="text-[10px] text-amber-400 underline">Clear filters</button>
                </div>
              ) : (
                filteredPrograms.map((prog) => (
                  <div key={prog.id} className="rounded-xl overflow-hidden border border-slate-800/60">
                    {/* Program Header */}
                    <button
                      type="button"
                      onClick={() => toggleSet(setExpandedPrograms, prog.id)}
                      className="w-full flex items-center gap-2 px-3 py-2 bg-slate-800/60 hover:bg-slate-800 transition-all text-left"
                    >
                      <span className="text-[10px] text-amber-400/70 transition-transform duration-200" style={{ transform: expandedPrograms.has(prog.id) ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                      <span className="text-xs font-extrabold text-amber-300 flex-1 truncate">🎓 {prog.title}</span>
                      <span className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded font-mono">
                        {prog.courses?.reduce((s, c) => s + c.chapters.reduce((s2, ch) => s2 + ch.lessons.length, 0), 0)} lessons
                      </span>
                    </button>

                    {expandedPrograms.has(prog.id) && (prog.courses || []).map((crs) => (
                      <div key={crs.id} className="border-t border-slate-800/40">
                        {/* Course Header */}
                        <button
                          type="button"
                          onClick={() => toggleSet(setExpandedCourses, crs.id)}
                          className="w-full flex items-center gap-2 px-5 py-1.5 bg-slate-900/60 hover:bg-slate-800/40 transition-all text-left"
                        >
                          <span className="text-[10px] text-slate-500 transition-transform duration-200" style={{ transform: expandedCourses.has(crs.id) ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                          <span className="text-[11px] font-bold text-slate-200 flex-1 truncate">📖 {crs.title}</span>
                          <span className="text-[9px] text-slate-500 font-mono">{crs.chapters?.length || 0} ch.</span>
                        </button>

                        {expandedCourses.has(crs.id) && (crs.chapters || []).map((chp) => (
                          <div key={chp.id} className="border-t border-slate-800/30">
                            {/* Chapter Header */}
                            <button
                              type="button"
                              onClick={() => toggleSet(setExpandedChapters, chp.id)}
                              className="w-full flex items-center gap-2 px-7 py-1.5 bg-slate-950/40 hover:bg-slate-800/30 transition-all text-left"
                            >
                              <span className="text-[10px] text-slate-600 transition-transform duration-200" style={{ transform: expandedChapters.has(chp.id) ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</span>
                              <span className="text-[11px] font-semibold text-slate-300 flex-1 truncate">📂 {chp.title}</span>
                              <span className="text-[9px] text-slate-600 font-mono">{chp.lessons?.length || 0} lessons</span>
                            </button>

                            {expandedChapters.has(chp.id) && (chp.lessons || []).map((les) => {
                              const positions = les.positions || [];
                              const allPositions = positions;
                              return (
                                <div key={les.id} className="border-t border-slate-800/20 bg-slate-950/60">
                                  {/* Lesson Row */}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedLesson(selectedLesson?.id === les.id ? null : les)}
                                    className={`w-full flex items-center gap-2 px-9 py-2 transition-all text-left group ${
                                      selectedLesson?.id === les.id ? 'bg-amber-500/10 border-l-2 border-amber-400' : 'hover:bg-slate-800/20'
                                    }`}
                                  >
                                    <span className="text-[10px] text-slate-500">▶</span>
                                    <span className="text-[11px] font-semibold text-slate-300 group-hover:text-white flex-1 truncate">♟️ {les.title}</span>
                                    <span className="text-[9px] bg-slate-900 text-slate-500 px-1.5 py-0.5 rounded font-mono">{positions.length} pos</span>
                                  </button>

                                  {/* Expanded Lesson — Position Cards */}
                                  {selectedLesson?.id === les.id && positions.length > 0 && (
                                    <div className="px-4 pb-3 pt-1 space-y-2">
                                      {positions.map((pos, idx) => (
                                        <PositionCard
                                          key={pos.id}
                                          pos={pos}
                                          idx={idx}
                                          allPositions={allPositions}
                                          isCoach={isCoach}
                                          pushedId={pushedId}
                                          onLoad={() => handleLoad(pos, allPositions, idx)}
                                          onPush={() => handlePush(pos, pos.id)}
                                          expandedVariations={expandedVariations}
                                          onToggleVariations={() => toggleSet(setExpandedVariations, pos.id)}
                                        />
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* ── TAB: Paste PGN ─────────────────────────────────────────────── */}
        {activeTab === 'pgn' && (
          <div className="flex flex-col flex-1 min-h-0 p-4 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Paste PGN (single or multi-game, 30+ supported)
              </label>
              <textarea
                value={pgnText}
                onChange={(e) => { setPgnText(e.target.value); setParsedPuzzles([]); setParseError(''); }}
                placeholder={`[Event "Chesshub"]\n[FEN "8/8/8/8/4R3/8/8/8 w - - 0 1"]\n\n1. Rd4 (1. Ra4) *\n\n[Event "Chesshub"]\n...`}
                rows={7}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl text-[11px] font-mono text-slate-200 p-3 focus:outline-none focus:border-amber-400/60 resize-none placeholder-slate-600 transition-all"
              />
              {parseError && <p className="text-[10px] text-red-400 mt-1">{parseError}</p>}
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleParsePgn}
                disabled={isParsing || !pgnText.trim()}
                className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-lg"
              >
                {isParsing ? '⏳ Parsing...' : `♟️ Parse PGN${parsedPuzzles.length > 0 ? ` (${parsedPuzzles.length} found)` : ''}`}
              </button>
              {parsedPuzzles.length > 0 && (
                <button
                  type="button"
                  onClick={() => { setParsedPuzzles([]); setPgnText(''); }}
                  className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl transition-all"
                  title="Clear"
                >
                  ✕
                </button>
              )}
            </div>

            {parsedPuzzles.length > 0 && (
              <div className="flex-1 overflow-y-auto space-y-2">
                <p className="text-[10px] text-emerald-400 font-bold">
                  ✓ {parsedPuzzles.length} puzzle{parsedPuzzles.length !== 1 ? 's' : ''} parsed successfully
                </p>
                {parsedPuzzles.map((puzzle, idx) => {
                  const pos = puzzle.toTeachingPosition(idx);
                  return (
                    <div key={puzzle.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2 hover:border-amber-400/30 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-white leading-tight">#{idx + 1}. {puzzle.title}</p>
                          <p className="text-[10px] text-slate-500">{puzzle.date}</p>
                        </div>
                        {puzzle.variations.length > 0 && (
                          <span className="text-[9px] bg-purple-500/20 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-bold shrink-0">
                            {puzzle.variations.length} var.
                          </span>
                        )}
                      </div>

                      <p className="font-mono text-[10px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 truncate" title={puzzle.fen}>
                        {puzzle.fen}
                      </p>

                      {puzzle.mainLine.length > 0 && (
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          ▶ {puzzle.mainLine.slice(0, 6).join(' ')}{puzzle.mainLine.length > 6 ? '…' : ''}
                        </p>
                      )}

                      {/* Variations */}
                      {puzzle.variations.length > 0 && (
                        <div className="space-y-1">
                          <button
                            type="button"
                            onClick={() => toggleSet(setExpandedVariations, puzzle.id)}
                            className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold transition-all"
                          >
                            {expandedVariations.has(puzzle.id) ? '▲' : '▼'} {puzzle.variations.length} Variation{puzzle.variations.length !== 1 ? 's' : ''}
                          </button>
                          {expandedVariations.has(puzzle.id) && (
                            <div className="space-y-1 pl-2 border-l-2 border-purple-500/30">
                              {puzzle.variations.map((v, vi) => {
                                const varPos: TeachingPosition = { ...pos, id: `${pos.id}_var${vi}`, title: `${puzzle.title} — Alt ${vi + 1}`, solution: v.moves.join(' '), fen: v.fen };
                                return (
                                  <div key={vi} className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500 font-mono flex-1 truncate">Alt {vi + 1}: {v.label || v.moves.slice(0, 3).join(' ')}</span>
                                    {isCoach && (
                                      <button
                                        type="button"
                                        onClick={() => handlePush(varPos, `${puzzle.id}_var${vi}`)}
                                        className={`shrink-0 px-2 py-0.5 text-[9px] font-bold rounded-lg transition-all ${pushedId === `${puzzle.id}_var${vi}` ? 'bg-emerald-500 text-white' : 'bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30'}`}
                                      >
                                        {pushedId === `${puzzle.id}_var${vi}` ? '✓ Pushed!' : '🚀 Push'}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleLoad(pos, parsedPuzzles.map((p2, i2) => p2.toTeachingPosition(i2)), idx)}
                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] rounded-xl transition-all"
                        >
                          🎯 Load Board
                        </button>
                        {isCoach && (
                          <button
                            type="button"
                            onClick={() => handlePush(pos, puzzle.id)}
                            className={`flex-1 py-1.5 font-extrabold text-[11px] rounded-xl transition-all ${pushedId === puzzle.id ? 'bg-emerald-500 text-white shadow-lg' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'}`}
                          >
                            {pushedId === puzzle.id ? '✓ Pushed!' : '🚀 Push to Class'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {parsedPuzzles.length === 0 && !parseError && (
              <div className="flex-1 flex flex-col items-center justify-center gap-2 text-center opacity-50">
                <span className="text-3xl">♟️</span>
                <p className="text-xs text-slate-400">Paste PGN above and click Parse to load puzzles</p>
              </div>
            )}
          </div>
        )}

        {/* ── TAB: Puzzle Bank ────────────────────────────────────────────── */}
        {activeTab === 'bank' && (
          <div className="flex flex-col flex-1 min-h-0">
            <div className="px-4 pt-3 pb-2 border-b border-slate-800/60 space-y-2 flex-shrink-0">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">🔍</span>
                <input
                  type="text"
                  value={bankSearch}
                  onChange={(e) => setBankSearch(e.target.value)}
                  placeholder="Search puzzle bank..."
                  className="w-full pl-8 pr-3 py-2 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400/50 transition-all"
                />
              </div>
              <div className="flex gap-1 flex-wrap">
                {THEME_PILLS.map((pill) => (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => setBankTheme(pill.value === bankTheme ? '' : pill.value)}
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-all ${bankTheme === pill.value ? 'bg-amber-400/20 border-amber-400/50 text-amber-300' : 'bg-slate-950/50 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                  >
                    {pill.emoji} {pill.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {loadingBank ? (
                <div className="flex flex-col items-center justify-center h-40 gap-2">
                  <div className="w-8 h-8 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-xs text-slate-400">Loading puzzle bank…</p>
                </div>
              ) : filteredBank.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-1 text-center opacity-50">
                  <span className="text-2xl">🏦</span>
                  <p className="text-xs text-slate-400">{bankPuzzles.length === 0 ? 'No puzzles in bank yet.' : 'No puzzles match your filter.'}</p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] text-slate-500">{filteredBank.length} puzzle{filteredBank.length !== 1 ? 's' : ''} found</p>
                  {filteredBank.map((p, idx) => {
                    const pos: TeachingPosition = {
                      id: p.id,
                      lessonId: 'puzzle-bank',
                      title: p.title,
                      fen: p.fen,
                      solution: Array.isArray(p.solution) ? p.solution.join(' ') : p.solution || '',
                      hint: p.hint_1 || undefined,
                      explanation: p.explanation || undefined,
                      difficulty: p.difficulty || 'Intermediate',
                      tags: p.tags || [p.theme].filter(Boolean),
                      orderNumber: idx,
                      boardOrientation: 'white',
                      defaultBoardLock: false,
                      notes: undefined,
                      createdAt: p.created_at || new Date().toISOString(),
                      updatedAt: p.updated_at || new Date().toISOString(),
                    };
                    return (
                      <div key={p.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2 hover:border-amber-400/30 transition-all">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-xs font-bold text-white truncate flex-1">{p.title}</p>
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border shrink-0 ${DIFFICULTY_COLORS[p.difficulty] || DIFFICULTY_COLORS['Intermediate']}`}>
                            {p.difficulty}
                          </span>
                        </div>
                        {p.theme && (
                          <span className="text-[9px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                            {p.theme}
                          </span>
                        )}
                        <p className="font-mono text-[10px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 truncate">{p.fen}</p>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleLoad(pos, filteredBank.map((pb, i2) => ({
                              id: pb.id, lessonId: 'puzzle-bank', title: pb.title, fen: pb.fen,
                              solution: Array.isArray(pb.solution) ? pb.solution.join(' ') : pb.solution || '',
                              difficulty: pb.difficulty || 'Intermediate', tags: pb.tags || [], orderNumber: i2,
                              boardOrientation: 'white' as const, defaultBoardLock: false,
                              createdAt: pb.created_at, updatedAt: pb.updated_at,
                            })), idx)}
                            className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] rounded-xl transition-all"
                          >
                            🎯 Load Board
                          </button>
                          {isCoach && (
                            <button
                              type="button"
                              onClick={() => handlePush(pos, p.id)}
                              className={`flex-1 py-1.5 font-extrabold text-[11px] rounded-xl transition-all ${pushedId === p.id ? 'bg-emerald-500 text-white' : 'bg-amber-500 hover:bg-amber-400 text-slate-950'}`}
                            >
                              {pushedId === p.id ? '✓ Pushed!' : '🚀 Push to Class'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Position Card Sub-Component ──────────────────────────────────────────────

interface PositionCardProps {
  pos: TeachingPosition;
  idx: number;
  allPositions: TeachingPosition[];
  isCoach: boolean;
  pushedId: string | null;
  onLoad: () => void;
  onPush: () => void;
  expandedVariations: Set<string>;
  onToggleVariations: () => void;
}

function PositionCard({
  pos, idx, isCoach, pushedId, onLoad, onPush, expandedVariations, onToggleVariations,
}: PositionCardProps) {
  // Parse solution variations if solution contains parentheses
  const hasVariations = pos.hint && pos.hint.includes('variation');

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 space-y-2 hover:border-amber-400/40 transition-all">
      <div className="flex items-start gap-2 justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-white truncate">#{idx + 1}. {pos.title}</p>
          {pos.solution && (
            <p className="text-[10px] font-mono text-slate-500 truncate mt-0.5">▶ {pos.solution.slice(0, 40)}{pos.solution.length > 40 ? '…' : ''}</p>
          )}
        </div>
        <span className={`shrink-0 text-[9px] px-2 py-0.5 rounded-full font-bold border ${DIFFICULTY_COLORS[pos.difficulty] || DIFFICULTY_COLORS['Intermediate']}`}>
          {pos.difficulty}
        </span>
      </div>

      <p className="font-mono text-[10px] text-slate-400 bg-slate-900 p-2 rounded-lg border border-slate-800 truncate" title={pos.fen}>
        {pos.fen}
      </p>

      {hasVariations && pos.hint && (
        <div>
          <button type="button" onClick={onToggleVariations} className="text-[10px] text-purple-400 hover:text-purple-300 font-semibold transition-all">
            {expandedVariations.has(pos.id) ? '▲' : '▼'} {pos.hint}
          </button>
          {expandedVariations.has(pos.id) && (
            <p className="text-[10px] text-slate-500 pl-2 mt-1 border-l-2 border-purple-500/30">{pos.hint}</p>
          )}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onLoad}
          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-[11px] rounded-xl transition-all"
        >
          🎯 Load Board
        </button>
        {isCoach && (
          <button
            type="button"
            onClick={onPush}
            className={`flex-1 py-1.5 font-extrabold text-[11px] rounded-xl transition-all ${
              pushedId === pos.id
                ? 'bg-emerald-500 text-white shadow-emerald-500/20 shadow-lg'
                : 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20 shadow-md'
            }`}
          >
            {pushedId === pos.id ? '✓ Pushed!' : '🚀 Push to Class'}
          </button>
        )}
      </div>
    </div>
  );
}
