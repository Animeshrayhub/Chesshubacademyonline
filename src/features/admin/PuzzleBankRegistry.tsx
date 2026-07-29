'use client';

import React, { useState, useEffect, useTransition } from 'react';
import dynamic from 'next/dynamic';
import { getPuzzleBankAction, deletePuzzleAction, bulkImportPuzzlesAction } from '@/actions/puzzles';
import type { DbHomeworkPuzzle } from '@/lib/puzzles/puzzleBankService';
import InteractivePuzzleBuilderModal from './InteractivePuzzleBuilderModal';
import LichessPuzzleCsvImporter from './LichessPuzzleCsvImporter';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => {
      const CB = mod.Chessboard;
      return function BoardWrapper(props: any) {
        const boardProps = props.options ? { ...props.options, ...props } : props;
        return <CB {...boardProps} />;
      };
    }),
  { ssr: false }
) as any;

export default function PuzzleBankRegistry() {
  const [activeTab, setActiveTab] = useState<'bank' | 'import'>('bank');
  const [puzzles, setPuzzles] = useState<DbHomeworkPuzzle[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  // Filters
  const [selectedTheme, setSelectedTheme] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isBuilderOpen, setIsBuilderOpen] = useState(false);
  const [activeBoardPreviewId, setActiveBoardPreviewId] = useState<string | null>(null);

  const fetchPuzzles = () => {
    setLoading(true);
    getPuzzleBankAction({
      theme: selectedTheme,
      difficulty: selectedDifficulty,
      search: searchQuery,
      limit: 100,
    }).then((res) => {
      if (res.success) {
        setPuzzles(res.puzzles ?? []);
        setTotal(res.total ?? 0);
      }
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchPuzzles();
  }, [selectedTheme, selectedDifficulty, searchQuery]);

  const handleDelete = (id: string) => {
    if (!confirm('Are you sure you want to delete this puzzle from the central Puzzle Bank?')) return;
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
      source: 'lichess',
      sourceId: p.id,
    }));

    const res = await bulkImportPuzzlesAction(formatted);
    if (res.success) {
      alert(`Successfully saved ${res.insertedCount} puzzles to the central database Puzzle Bank!`);
      setActiveTab('bank');
      fetchPuzzles();
    } else {
      alert(res.error || 'Failed to bulk save puzzles to database.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-4 rounded-2xl">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('bank')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'bank'
                ? 'bg-amber-500 text-slate-950 shadow-gold'
                : 'bg-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            📚 Central Puzzle Bank ({total})
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
            📥 Import CSV / PGN Datasets
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

      {activeTab === 'import' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
          <div className="mb-4">
            <h3 className="font-heading font-bold text-sm text-white mb-1">
              Bulk Import Lichess / PGN Datasets into Puzzle Bank
            </h3>
            <p className="text-xs text-slate-400">
              Paste raw Lichess CSV datasets or PGN Study moves below. Puzzles will automatically be converted and stored in your central academy database.
            </p>
          </div>
          <LichessPuzzleCsvImporter onImportComplete={handleBulkImportFromCsv} />
        </div>
      ) : (
        <>
          {/* Filters Bar */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
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
                <option value="beginner">Beginner (&lt;1200)</option>
                <option value="intermediate">Intermediate (1200-1600)</option>
                <option value="advanced">Advanced (1600-2000)</option>
                <option value="master">Master (&gt;2000)</option>
              </select>
            </div>
          </div>

          {/* Puzzle Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-slate-400 text-xs font-bold space-y-2">
              <span className="text-2xl animate-spin inline-block">⏳</span>
              <p>Loading Puzzle Bank Database...</p>
            </div>
          ) : puzzles.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-xl">
                🧩
              </div>
              <p className="text-sm font-bold text-white">No Tactical Puzzles Found</p>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No saved puzzles match your active search filters. Click &quot;Create Custom Position&quot; or import a CSV dataset to populate your Puzzle Bank.
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
                          ⭐ {p.rating}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold uppercase">
                          {p.difficulty}
                        </span>
                        <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-semibold">
                          🎯 {p.theme}
                        </span>
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
                            options={{
                              position: p.fen,
                              arePiecesDraggable: false,
                            }}
                          />
                        </div>
                      )}

                      <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between gap-1">
                        <div>
                          <span className="font-bold text-slate-500 font-sans">Solution: </span>
                          <span className="text-emerald-400 font-bold">{p.solution.join(' → ')}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setActiveBoardPreviewId(isBoardVisible ? null : p.id)}
                          className="px-2 py-0.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded text-[10px] font-bold transition-all"
                        >
                          {isBoardVisible ? '🙈 Hide' : '♟️ Board'}
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-xs">
                      <span className="text-[10px] text-slate-500">Source: {p.source || 'custom'}</span>
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        disabled={isPending}
                        className="px-2.5 py-1 bg-red-950/80 hover:bg-red-900 text-red-300 rounded-lg text-[10px] font-semibold transition-colors"
                      >
                        Delete
                      </button>
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
    </div>
  );
}
