'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { parsePgnToStudyTree, getMainlineMoves } from '@/lib/puzzles/pgnTreeEngine';
import { sanitizeFen, extractFenFromText } from '@/utils/chessSanitizer';
import { createPuzzleAction } from '@/actions/puzzles';
import { saveTeachingPositionAction, fetchCurriculumHierarchyAction, createLessonAction } from '@/actions/curriculum';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

interface InteractivePuzzleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const QUICK_PRESETS = [
  { label: 'Standard Start', icon: '♟️', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  { label: 'Back-Rank Mate', icon: '🏰', fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1' },
  { label: 'Knight Fork', icon: '🐴', fen: 'r1bqkb1r/pppp1ppp/2n5/4p3/4n3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 4' },
  { label: 'Pin & Skewer', icon: '🎯', fen: 'r2q1rk1/ppp2ppp/2n5/3p4/3P4/2PB1Q2/P1P2PPP/R4RK1 w - - 0 1' },
  { label: 'Empty Board', icon: '🧹', fen: '8/8/8/8/8/8/8/8 w - - 0 1' },
];

const PRESET_THEMES = [
  'Tactics',
  'Fork',
  'Pin & Skewer',
  'Back Rank',
  'Checkmate',
  'Sacrifice',
  'Endgame',
  'Opening Trap',
  'Mating Net',
  '+ Custom Theme...',
];

export default function InteractivePuzzleBuilderModal({
  isOpen,
  onClose,
  onSuccess,
}: InteractivePuzzleBuilderModalProps) {
  // Board & FEN State
  const [startingFen, setStartingFen] = useState(DEFAULT_FEN);
  const [currentFen, setCurrentFen] = useState(DEFAULT_FEN);
  const [boardKey, setBoardKey] = useState(0);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [sideToMove, setSideToMove] = useState<'w' | 'b'>('w');

  // Solution Moves State
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [manualPgnText, setManualPgnText] = useState('');

  // Metadata State
  const [title, setTitle] = useState('');
  const [selectedTheme, setSelectedTheme] = useState('Tactics');
  const [customThemeInput, setCustomThemeInput] = useState('');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'master'>('beginner');
  const [hint, setHint] = useState('');
  const [explanation, setExplanation] = useState('');

  // Curriculum & Chapter Assignment State
  const [targetLessonId, setTargetLessonId] = useState<string>('custom_new');
  const [customChapterTitle, setCustomChapterTitle] = useState('');
  const [lessonsList, setLessonsList] = useState<{ id: string; title: string }[]>([]);

  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const chessRef = useRef<Chess>(new Chess(DEFAULT_FEN));

  // Force board re-render with fresh key
  const triggerBoardUpdate = (fenStr: string) => {
    setCurrentFen(fenStr);
    setBoardKey((prev) => prev + 1);
  };

  // Initialize & Reset
  const resetWorkspace = useCallback((newFen = DEFAULT_FEN) => {
    const sanitized = sanitizeFen(newFen);
    try {
      const c = new Chess(sanitized);
      chessRef.current = c;
      setStartingFen(c.fen());
      setSideToMove(c.turn());
      setOrientation(c.turn() === 'w' ? 'white' : 'black');
      setSolutionMoves([]);
      setErrorMsg('');
      setStatusMsg('');
      triggerBoardUpdate(c.fen());
    } catch {
      setStartingFen(DEFAULT_FEN);
      triggerBoardUpdate(DEFAULT_FEN);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      resetWorkspace(DEFAULT_FEN);
      setTitle('');
      setSelectedTheme('Tactics');
      setCustomThemeInput('');
      setDifficulty('beginner');
      setHint('');
      setExplanation('');
      setManualPgnText('');
      setCustomChapterTitle('');

      // Fetch lessons hierarchy for dropdown assignment
      fetchCurriculumHierarchyAction().then((res) => {
        if (res.success && res.data) {
          const list: { id: string; title: string }[] = [];
          res.data.forEach((p) => {
            p.courses?.forEach((c) => {
              c.chapters?.forEach((ch) => {
                ch.lessons?.forEach((l) => {
                  list.push({ id: l.id, title: `${ch.title} › ${l.title}` });
                });
              });
            });
          });
          setLessonsList(list);
          if (list.length > 0) setTargetLessonId(list[0].id);
        }
      });
    }
  }, [isOpen, resetWorkspace]);

  // Handle Drag & Drop move on board to record solution
  const handlePieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    try {
      const moveObj = chessRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (moveObj) {
        setSolutionMoves((prev) => [...prev, moveObj.san]);
        triggerBoardUpdate(chessRef.current.fen());
        return true;
      }
    } catch {}
    return false;
  };

  // Undo last recorded solution move
  const handleUndoMove = () => {
    if (solutionMoves.length === 0) return;
    const movesCopy = [...solutionMoves];
    movesCopy.pop();

    const c = new Chess(startingFen);
    const validMoves: string[] = [];
    movesCopy.forEach((m) => {
      try {
        const res = c.move(m);
        if (res) validMoves.push(res.san);
      } catch {}
    });

    chessRef.current = c;
    setSolutionMoves(validMoves);
    triggerBoardUpdate(c.fen());
  };

  // Handle PGN or FEN paste in auto-fill field
  const handlePgnOrFenPaste = (text: string) => {
    setManualPgnText(text);
    setErrorMsg('');
    setStatusMsg('');

    if (!text || !text.trim()) return;

    const trimmed = text.trim();
    const rawDetectedFen = extractFenFromText(trimmed);
    const startFen = sanitizeFen(rawDetectedFen);

    try {
      const c = new Chess(startFen);
      chessRef.current = c;
      setStartingFen(c.fen());
      setSideToMove(c.turn());
      setOrientation(c.turn() === 'w' ? 'white' : 'black');

      // 1. Try parsing moves from PGN Study Tree
      const studyTree = parsePgnToStudyTree(trimmed);
      let mainMoves: string[] = [];
      if (studyTree) {
        if (studyTree.title && studyTree.title !== 'PGN Tactical Study' && studyTree.title !== '?') {
          setTitle(studyTree.title);
        }
        mainMoves = getMainlineMoves(studyTree.rootNodes);
        if (studyTree.rootNodes.length > 1) {
          setHint(`${studyTree.rootNodes.length} variation branches available in study.`);
        }
      }

      setSolutionMoves(mainMoves);
      triggerBoardUpdate(c.fen());

      if (mainMoves.length > 0) {
        setStatusMsg(`✅ Successfully loaded PGN position & ${mainMoves.length} solution move(s)!`);
      } else {
        setStatusMsg('✅ Successfully loaded FEN position onto board!');
      }
    } catch (err) {
      setErrorMsg('Failed to parse PGN / FEN input. Please check syntax.');
    }
  };

  // Toggle Side to Move (White <-> Black)
  const handleToggleSideToMove = () => {
    const parts = startingFen.split(' ');
    if (parts.length >= 2) {
      const newTurn = parts[1] === 'w' ? 'b' : 'w';
      parts[1] = newTurn;
      const newFen = parts.join(' ');
      resetWorkspace(newFen);
    }
  };

  // Submit and Save Custom Position to Central Bank & Curriculum
  const handleSavePuzzle = async () => {
    if (!title.trim()) {
      setErrorMsg('Puzzle Title is required.');
      return;
    }

    const finalTheme = selectedTheme === '+ Custom Theme...' ? (customThemeInput.trim() || 'Custom Tactics') : selectedTheme;

    setSubmitting(true);
    setErrorMsg('');
    setStatusMsg('');

    // 1. Save to Central Puzzle Bank
    const puzzleBankRes = await createPuzzleAction({
      title: title.trim(),
      fen: startingFen,
      solution: solutionMoves,
      theme: finalTheme.toLowerCase(),
      difficulty: difficulty,
      rating: difficulty === 'beginner' ? 1000 : difficulty === 'intermediate' ? 1400 : difficulty === 'advanced' ? 1800 : 2200,
      track: difficulty,
      chapterId: customChapterTitle.trim() || 'Custom Studies',
      hint1: hint.trim() || undefined,
      explanation: explanation.trim() || undefined,
      source: 'custom_builder',
    });

    // 2. Save to Curriculum
    let resolvedLessonId = targetLessonId;

    if (targetLessonId === 'custom_new' && customChapterTitle.trim()) {
      // Create custom chapter/lesson on the fly if needed
      try {
        const hierarchyRes = await fetchCurriculumHierarchyAction();
        if (hierarchyRes.success && hierarchyRes.data && hierarchyRes.data.length > 0) {
          const firstProg = hierarchyRes.data[0];
          const firstCourse = firstProg.courses?.[0];
          const firstChapter = firstCourse?.chapters?.[0];
          if (firstChapter) {
            const lessonRes = await createLessonAction(firstChapter.id, customChapterTitle.trim(), 'Custom coach study lesson');
            if (lessonRes.success && lessonRes.data) {
              resolvedLessonId = lessonRes.data.id;
            }
          }
        }
      } catch {}
    }

    if (resolvedLessonId && resolvedLessonId !== 'custom_new') {
      await saveTeachingPositionAction(resolvedLessonId, {
        title: title.trim(),
        fen: startingFen,
        solution: solutionMoves.join(' '),
        hint: hint.trim() || undefined,
        explanation: explanation.trim() || undefined,
        difficulty: difficulty === 'beginner' ? 'Beginner' : difficulty === 'intermediate' ? 'Intermediate' : difficulty === 'advanced' ? 'Advanced' : 'Master',
        theme: finalTheme,
        tags: [finalTheme, 'Custom'],
        boardOrientation: orientation,
        defaultBoardLock: true,
      });
    }

    setSubmitting(false);

    if (puzzleBankRes.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(puzzleBankRes.error || 'Failed to save position.');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-4xl shadow-2xl text-white my-6 space-y-6">
        {/* Modal Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl text-amber-400">
              ♟️
            </div>
            <div>
              <h3 className="font-heading font-extrabold text-lg text-amber-300">
                Custom Tactical Position Builder
              </h3>
              <p className="text-xs text-slate-400">
                Paste PGN/FEN or drag pieces on board to record solution moves for live classroom practice.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold flex items-center justify-center text-sm transition-all"
          >
            ✕
          </button>
        </div>

        {statusMsg && (
          <div className="p-3 bg-emerald-950/90 border border-emerald-500/40 text-emerald-300 rounded-2xl text-xs font-bold shadow-md">
            {statusMsg}
          </div>
        )}

        {errorMsg && (
          <div className="p-3 bg-red-950/90 border border-red-500/40 text-red-300 rounded-2xl text-xs font-bold shadow-md">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Main Workspace Grid: Board (Left) vs Controls & Details (Right) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column: Interactive Chessboard & Presets */}
          <div className="space-y-4 flex flex-col items-center bg-slate-950/60 p-4 border border-slate-800 rounded-2xl">
            {/* Quick Presets Strip */}
            <div className="w-full space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Quick Position Presets</span>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => resetWorkspace(preset.fen)}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1"
                  >
                    <span>{preset.icon}</span>
                    <span>{preset.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Chessboard Container (Forced Re-render via key={boardKey}) */}
            <div className="w-full max-w-[340px] aspect-square shadow-2xl rounded-2xl overflow-hidden border border-slate-800">
              <ChessboardComponent
                key={boardKey}
                position={currentFen.trim().split(' ')[0]}
                onPieceDrop={handlePieceDrop}
                boardOrientation={orientation}
                customBoardStyle={{
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                }}
              />
            </div>

            {/* Side to Move & Perspective Controls */}
            <div className="w-full flex items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleToggleSideToMove}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
              >
                <span>{sideToMove === 'w' ? '♔' : '♚'}</span>
                <span>Side: {sideToMove === 'w' ? 'White to Move' : 'Black to Move'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrientation((prev) => (prev === 'white' ? 'black' : 'white'));
                  setBoardKey((k) => k + 1);
                }}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5"
              >
                <span>🔄</span>
                <span>Flip Board</span>
              </button>
            </div>
          </div>

          {/* Right Column: PGN Auto-Fill, Solution Recorder & Custom Metadata */}
          <div className="space-y-4">
            {/* PGN / FEN Instant Auto-Fill */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Instant PGN Study / FEN String Auto-Fill
              </label>
              <textarea
                value={manualPgnText}
                onChange={(e) => handlePgnOrFenPaste(e.target.value)}
                rows={3}
                placeholder="Paste PGN study text or FEN string here..."
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-300 focus:outline-none focus:border-amber-400 leading-relaxed"
              />
            </div>

            {/* Solution Moves Recorder */}
            <div className="space-y-2 bg-slate-950/60 p-3.5 border border-slate-800 rounded-2xl">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  Recorded Solution Moves ({solutionMoves.length})
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleUndoMove}
                    disabled={solutionMoves.length === 0}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-slate-300 rounded-lg text-[10px] font-bold"
                  >
                    ↩ Undo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSolutionMoves([]);
                      triggerBoardUpdate(startingFen);
                    }}
                    disabled={solutionMoves.length === 0}
                    className="px-2 py-1 bg-red-950/50 hover:bg-red-900 disabled:opacity-30 text-red-300 rounded-lg text-[10px] font-bold"
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-xs text-emerald-300 min-h-[50px] flex flex-wrap gap-1.5 items-center">
                {solutionMoves.length > 0 ? (
                  solutionMoves.map((m, idx) => (
                    <span key={idx} className="px-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-slate-200 font-bold">
                      {idx + 1}. {m}
                    </span>
                  ))
                ) : (
                  <span className="text-slate-600 text-[11px] italic">
                    Drag pieces on board or paste PGN moves above to record...
                  </span>
                )}
              </div>
            </div>

            {/* Custom Metadata Fields */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Puzzle Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Back-Rank Rook Checkmate"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Custom Tactical Theme Input */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Tactical Theme</label>
                  <select
                    value={selectedTheme}
                    onChange={(e) => setSelectedTheme(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-bold"
                  >
                    {PRESET_THEMES.map((th) => (
                      <option key={th} value={th}>
                        {th}
                      </option>
                    ))}
                  </select>

                  {selectedTheme === '+ Custom Theme...' && (
                    <input
                      type="text"
                      value={customThemeInput}
                      onChange={(e) => setCustomThemeInput(e.target.value)}
                      placeholder="Type custom theme name..."
                      className="w-full mt-1.5 p-2 bg-slate-950 border border-amber-500/50 rounded-xl text-xs text-amber-300 focus:outline-none"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white text-xs font-bold"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                    <option value="master">Master</option>
                  </select>
                </div>
              </div>

              {/* Custom Chapter / Lesson Assignment */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Assign to Curriculum Chapter / Lesson
                </label>
                <select
                  value={targetLessonId}
                  onChange={(e) => setTargetLessonId(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-amber-300 font-bold"
                >
                  <option value="custom_new">➕ + Create New Custom Chapter / Lesson...</option>
                  {lessonsList.map((les) => (
                    <option key={les.id} value={les.id}>
                      {les.title}
                    </option>
                  ))}
                </select>

                {targetLessonId === 'custom_new' && (
                  <input
                    type="text"
                    value={customChapterTitle}
                    onChange={(e) => setCustomChapterTitle(e.target.value)}
                    placeholder="Type new chapter/lesson name (e.g. Rook Endgame Studies)..."
                    className="w-full mt-1.5 p-2 bg-slate-950 border border-amber-500/50 rounded-xl text-xs text-amber-300 focus:outline-none"
                  />
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Student Hint (Optional)</label>
                <input
                  type="text"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  placeholder="e.g. Look at the weak back-rank defense"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSavePuzzle}
            disabled={submitting || !title.trim()}
            className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-extrabold rounded-xl text-xs shadow-gold transition-all flex items-center gap-2"
          >
            <span>⚡</span>
            <span>{submitting ? 'Saving Position...' : 'Save to Central Bank & Curriculum'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
