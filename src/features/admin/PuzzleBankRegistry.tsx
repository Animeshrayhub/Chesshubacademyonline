'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import dynamic from 'next/dynamic';
import {
  getPuzzleBankAction,
  deletePuzzleAction,
  bulkImportPuzzlesAction,
  updatePuzzleAction,
} from '@/actions/puzzles';
import type { DbHomeworkPuzzle } from '@/lib/puzzles/puzzleBankService';
import InteractivePuzzleBuilderModal from './InteractivePuzzleBuilderModal';
import LichessPuzzleCsvImporter from './LichessPuzzleCsvImporter';
import InteractivePgnInspector from './InteractivePgnInspector';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

// ─────────────────────────────────────────────────────────────────────────────
// PUZZLE EDIT MODAL (ADMIN ONLY)
// ─────────────────────────────────────────────────────────────────────────────
interface PuzzleEditModalProps {
  puzzle: DbHomeworkPuzzle;
  onClose: () => void;
  onSuccess: () => void;
}

function PuzzleEditModal({ puzzle, onClose, onSuccess }: PuzzleEditModalProps) {
  const [title, setTitle] = useState(puzzle.title);
  const [fen, setFen] = useState(puzzle.fen);
  const [solution, setSolution] = useState(puzzle.solution.join(' '));
  const [theme, setTheme] = useState(puzzle.theme);
  const [difficulty, setDifficulty] = useState(puzzle.difficulty);
  const [track, setTrack] = useState(puzzle.track || 'beginner');
  const [chapterId, setChapterId] = useState(puzzle.chapter_id || 'Chapter 1: Fundamentals');
  const [rating, setRating] = useState(puzzle.rating);
  const [hint1, setHint1] = useState(puzzle.hint_1 || '');
  const [explanation, setExplanation] = useState(puzzle.explanation || '');
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!title.trim()) { setErrorMsg('Puzzle Title is required.'); return; }
    if (!track) { setErrorMsg('Skill Track is required for curriculum structure.'); return; }
    if (!chapterId.trim()) { setErrorMsg('Chapter Name is required for curriculum structure.'); return; }

    setSaving(true);
    const res = await updatePuzzleAction(puzzle.id, {
      title: title.trim(),
      fen: fen.trim(),
      solution: solution.split(/\s+/).filter(Boolean),
      theme: theme.trim(),
      difficulty: difficulty as any,
      track,
      chapterId: chapterId.trim(),
      rating: Number(rating),
      hint1: hint1.trim() || undefined,
      explanation: explanation.trim() || undefined,
    });
    setSaving(false);
    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to update puzzle.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 w-full max-w-2xl shadow-2xl text-white my-6 space-y-5">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-lg text-amber-400">
              ✏️
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-amber-300">Edit Puzzle Entry</h3>
              <p className="text-[10px] text-slate-400 font-mono">ID: {puzzle.id}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span><span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Puzzle Title <span className="text-red-400">*</span></label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* FEN */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">FEN Position String</label>
            <input
              type="text"
              value={fen}
              onChange={(e) => setFen(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Solution Moves */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Solution Moves (SAN or space-separated UCI)</label>
            <input
              type="text"
              value={solution}
              onChange={(e) => setSolution(e.target.value)}
              placeholder="e.g. e4 e5 Nf3 Nc6"
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Strict Curriculum Assignment: Track & Chapter */}
          <div className="grid grid-cols-2 gap-3 bg-amber-500/5 p-3 rounded-2xl border border-amber-500/20">
            <div>
              <label className="block text-[10px] font-bold text-amber-300 mb-1">Curriculum Track <span className="text-red-400">*</span></label>
              <select value={track} onChange={(e) => setTrack(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-bold">
                <option value="pre_beginner">🌱 Pre-Beginner (400-800)</option>
                <option value="beginner">☘️ Beginner (800-1200)</option>
                <option value="intermediate">🔥 Intermediate (1200-1600)</option>
                <option value="advanced">⚡ Advanced (1600-2000)</option>
                <option value="master">👑 Master (2000+)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-amber-300 mb-1">Curriculum Chapter <span className="text-red-400">*</span></label>
              <input
                type="text"
                required
                value={chapterId}
                onChange={(e) => setChapterId(e.target.value)}
                placeholder="e.g. Chapter 1: Pin & Skewer"
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          {/* Theme / Difficulty / Rating */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Tactical Theme</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value)}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400">
                <option value="mateIn1">Checkmate in 1</option>
                <option value="mateIn2">Checkmate in 2</option>
                <option value="mateIn3">Checkmate in 3</option>
                <option value="fork">Fork</option>
                <option value="pin">Pin & Skewer</option>
                <option value="backRank">Back-Rank</option>
                <option value="endgame">Endgame</option>
                <option value="opening">Opening</option>
                <option value="sacrifice">Sacrifice</option>
                <option value="discoveredAttack">Discovered Attack</option>
                <option value="general">General Tactics</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Difficulty</label>
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400">
                <option value="pre_beginner">Pre-Beginner</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
                <option value="expert">Expert</option>
                <option value="master">Master</option>
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-300 mb-1">Rating ELO</label>
              <input type="number" min={400} max={3200} step={50} value={rating} onChange={(e) => setRating(Number(e.target.value))}
                className="w-full p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400" />
            </div>
          </div>

          {/* Hint */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Hint #1 (Optional)</label>
            <input
              type="text"
              value={hint1}
              onChange={(e) => setHint1(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Explanation / Notes</label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-slate-800">
            <button type="button" onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all disabled:opacity-50 flex items-center gap-2">
              {saving ? <><span className="animate-spin">⏳</span><span>Saving...</span></> : <>💾 Save Changes</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN PUZZLE BANK REGISTRY (ADMIN MASTER UI)
// ─────────────────────────────────────────────────────────────────────────────
export default function PuzzleBankRegistry() {
  const [activeTab, setActiveTab] = useState<'bank' | 'import'>('bank');
  const [puzzles, setPuzzles] = useState<DbHomeworkPuzzle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [selectedTheme, setSelectedTheme] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [selectedTrack, setSelectedTrack] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [activeBoardPreviewId, setActiveBoardPreviewId] = useState<string | null>(null);

  // Edit state
  const [editingPuzzle, setEditingPuzzle] = useState<DbHomeworkPuzzle | null>(null);

  const fetchPuzzles = useCallback(() => {
    setLoading(true);
    getPuzzleBankAction({
      theme: selectedTheme,
      difficulty: selectedDifficulty,
      track: selectedTrack,
      search: searchQuery,
      limit: 100,
    }).then((res) => {
      if (res.success) {
        setPuzzles(res.puzzles ?? []);
        setTotal(res.total ?? 0);
      }
      setLoading(false);
    });
  }, [selectedTheme, selectedDifficulty, selectedTrack, searchQuery]);

  useEffect(() => {
    fetchPuzzles();
  }, [fetchPuzzles]);

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this puzzle from the Central Puzzle Bank?')) return;
    startTransition(async () => {
      const res = await deletePuzzleAction(id);
      if (res.success) {
        fetchPuzzles();
      } else {
        alert(res.error || 'Failed to delete puzzle.');
      }
    });
  };

  const handleBulkImportFromCsv = async (importedPuzzles: any[]) => {
    if (importedPuzzles.length === 0) return;
    const formatted = importedPuzzles.map((p) => ({
      title: p.id ? `Lichess #${p.id}` : 'Imported Tactical Puzzle',
      fen: p.initialFen || p.fen,
      solution: Array.isArray(p.solution) ? p.solution : [p.solution],
      theme: Array.isArray(p.themes) ? p.themes.join(' ') : (p.theme || 'tactics'),
      difficulty: (p.rating < 1200 ? 'beginner' : p.rating < 1600 ? 'intermediate' : p.rating < 2000 ? 'advanced' : 'master') as any,
      rating: p.rating || 1500,
      track: (p.rating < 800 ? 'pre_beginner' : p.rating < 1200 ? 'beginner' : p.rating < 1600 ? 'intermediate' : p.rating < 2000 ? 'advanced' : 'master'),
      chapterId: 'Imported Studies',
      source: 'lichess',
      sourceId: p.id,
    }));

    const res = await bulkImportPuzzlesAction(formatted);
    if (res.success) {
      alert(`Successfully saved ${res.insertedCount} puzzles to the central database Puzzle Bank! Duplicate entries stored as variation entries.`);
      setActiveTab('bank');
      fetchPuzzles();
    } else {
      alert(res.error || 'Failed to bulk save puzzles to database.');
    }
  };

  const trackLabel = (t: string) => {
    const map: Record<string, string> = {
      pre_beginner: '🌱 Pre-Beginner',
      beginner: '☘️ Beginner',
      intermediate: '🔥 Intermediate',
      advanced: '⚡ Advanced',
      master: '👑 Master',
    };
    return map[t] || t;
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'bank'
                ? 'bg-amber-500 text-slate-950 shadow-gold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            📚 Central Bank ({total})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'import'
                ? 'bg-amber-500 text-slate-950 shadow-gold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            📥 CSV / PGN Import
          </button>
        </div>

        <button
          type="button"
          onClick={() => setIsBuilderOpen(true)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center justify-center gap-1.5 self-start sm:self-auto"
        >
          <span>➕ Create Custom Position</span>
        </button>
      </div>

      {/* Tab: CSV / PGN Import & Inspector */}
      {activeTab === 'import' && (
        <div className="space-y-6">
          <InteractivePgnInspector onSuccess={fetchPuzzles} />

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="mb-4">
              <h3 className="font-heading font-bold text-sm text-white mb-1">
                Lichess CSV Dataset Importer
              </h3>
              <p className="text-xs text-slate-400">
                Bulk-import Lichess CSV datasets into the Central Puzzle Bank database.
              </p>
            </div>
            <LichessPuzzleCsvImporter onImportComplete={handleBulkImportFromCsv} />
          </div>
        </div>
      )}

      {/* Tab: Bank View */}
      {activeTab === 'bank' && (
        <>
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1">Search Position / Theme</label>
              <input
                type="text"
                placeholder="Search FEN or title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Curriculum Track</label>
              <select
                value={selectedTrack}
                onChange={(e) => setSelectedTrack(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white font-semibold"
              >
                <option value="ALL">All Tracks</option>
                <option value="pre_beginner">🌱 Pre-Beginner (400-800)</option>
                <option value="beginner">☘️ Beginner (800-1200)</option>
                <option value="intermediate">🔥 Intermediate (1200-1600)</option>
                <option value="advanced">⚡ Advanced (1600-2000)</option>
                <option value="master">👑 Master (2000+)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Tactical Theme</label>
              <select
                value={selectedTheme}
                onChange={(e) => setSelectedTheme(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              >
                <option value="ALL">All Tactical Themes</option>
                <option value="mate">Checkmate</option>
                <option value="fork">Fork</option>
                <option value="pin">Pin</option>
                <option value="skewer">Skewer</option>
                <option value="endgame">Endgame</option>
                <option value="sacrifice">Sacrifice</option>
                <option value="opening">Opening</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1">Difficulty Tier</label>
              <select
                value={selectedDifficulty}
                onChange={(e) => setSelectedDifficulty(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              >
                <option value="ALL">All Difficulties</option>
                <option value="pre_beginner">Pre-Beginner (&lt;800)</option>
                <option value="beginner">Beginner (800-1200)</option>
                <option value="intermediate">Intermediate (1200-1600)</option>
                <option value="advanced">Advanced (1600-2000)</option>
                <option value="expert">Expert (1900-2200)</option>
                <option value="master">Master (&gt;2200)</option>
              </select>
            </div>
          </div>

          {/* Puzzle Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold space-y-2">
              <span className="text-2xl animate-spin inline-block">⏳</span>
              <p>Loading Central Puzzle Bank Database...</p>
            </div>
          ) : puzzles.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-xl">
                🧩
              </div>
              <p className="text-sm font-bold text-white">No Tactical Puzzles Found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No saved puzzles match your active search filters. Click &quot;Create Custom Position&quot; or import a CSV / PGN study to populate your Puzzle Bank.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {puzzles.map((p) => {
                const isBoardVisible = activeBoardPreviewId === p.id;
                return (
                  <div
                    key={p.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 hover:border-amber-500/40 transition-all flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-heading font-bold text-sm text-white line-clamp-1">
                          {p.title}
                        </h4>
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[10px] font-bold shrink-0">
                          ⭐ {p.rating} ELO
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        {p.track && (
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold uppercase">
                            {trackLabel(p.track)}
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase">
                          {p.difficulty}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-semibold">
                          🎯 {p.theme}
                        </span>
                        {p.chapter_id && (
                          <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-500/30 font-bold">
                            📖 {p.chapter_id}
                          </span>
                        )}
                      </div>

                      {/* Full Selectable FEN Box */}
                      <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono text-[10px] text-amber-300 select-all overflow-x-auto break-all">
                        <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-sans font-bold mb-0.5">
                          FEN Notation:
                        </span>
                        {p.fen}
                      </div>

                      {/* Interactive Mini-Board Preview */}
                      {isBoardVisible && (
                        <div className="w-full aspect-square bg-slate-950 border-2 border-slate-800 rounded-xl overflow-hidden shadow-inner my-2">
                          <ChessboardComponent
                            position={p.fen}
                            boardOrientation={p.fen && p.fen.split(' ')[1] === 'b' ? 'black' : 'white'}
                            arePiecesDraggable={false}
                            customDarkSquareStyle={{ backgroundColor: '#334155' }}
                            customLightSquareStyle={{ backgroundColor: '#94A3B8' }}
                          />
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between gap-1">
                        <div className="min-w-0 flex-1">
                          <span className="font-bold text-slate-500 font-sans">Solution: </span>
                          <span className="text-emerald-400 font-bold">
                            {p.solution && p.solution.length > 0 && p.solution[0]
                              ? p.solution.join(' → ')
                              : <span className="text-slate-600 italic">not recorded yet</span>}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveBoardPreviewId(isBoardVisible ? null : p.id)}
                          className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold transition-all shrink-0"
                        >
                          {isBoardVisible ? '🙈 Hide' : '♟️ Board'}
                        </button>
                      </div>

                      {p.hint_1 && (
                        <div className="text-[10px] text-slate-500 italic border-l-2 border-amber-500/30 pl-2">
                          💡 Hint: {p.hint_1}
                        </div>
                      )}
                    </div>

                    {/* Card Footer Actions */}
                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-500">Source: {p.source || 'custom'}</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingPuzzle(p)}
                          className="px-2.5 py-1 bg-blue-950/80 hover:bg-blue-900 text-blue-300 rounded-lg text-[10px] font-semibold transition-colors"
                        >
                          ✏️ Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(p.id)}
                          disabled={isPending}
                          className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-lg text-[10px] font-semibold transition-colors disabled:opacity-50"
                        >
                          🗑️ Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Custom FEN Builder Modal */}
      <InteractivePuzzleBuilderModal
        isOpen={isBuilderOpen}
        onClose={() => setIsBuilderOpen(false)}
        onSuccess={fetchPuzzles}
      />

      {/* Puzzle Edit Modal */}
      {editingPuzzle && (
        <PuzzleEditModal
          puzzle={editingPuzzle}
          onClose={() => setEditingPuzzle(null)}
          onSuccess={() => { setEditingPuzzle(null); fetchPuzzles(); }}
        />
      )}
    </div>
  );
}
