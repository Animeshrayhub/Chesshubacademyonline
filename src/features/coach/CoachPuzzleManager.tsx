'use client';

import React, { useState, useEffect } from 'react';
import { getPuzzleBankAction } from '@/actions/puzzles';
import type { DbHomeworkPuzzle } from '@/lib/puzzles/puzzleBankService';

interface CoachPuzzleManagerProps {
  students: Array<{ id: string; name: string; email: string }>;
}

export default function CoachPuzzleManager({ students }: CoachPuzzleManagerProps) {
  const [puzzles, setPuzzles] = useState<DbHomeworkPuzzle[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('ALL');
  const [selectedDifficulty, setSelectedDifficulty] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPuzzleIds, setSelectedPuzzleIds] = useState<string[]>([]);
  const [targetStudentId, setTargetStudentId] = useState<string>('');
  const [assignmentSuccess, setAssignmentSuccess] = useState('');

  useEffect(() => {
    setLoading(true);
    getPuzzleBankAction({
      theme: selectedTheme,
      difficulty: selectedDifficulty,
      search: searchQuery,
      limit: 50,
    }).then((res) => {
      if (res.success) {
        setPuzzles(res.puzzles ?? []);
      }
      setLoading(false);
    });
  }, [selectedTheme, selectedDifficulty, searchQuery]);

  const toggleSelectPuzzle = (id: string) => {
    setSelectedPuzzleIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleAssignPuzzles = () => {
    if (!targetStudentId) {
      alert('Please select a student to assign puzzles to.');
      return;
    }
    if (selectedPuzzleIds.length === 0) {
      alert('Please select at least 1 tactical puzzle to assign.');
      return;
    }

    const studentName = students.find((s) => s.id === targetStudentId)?.name || 'Student';
    setAssignmentSuccess(
      `🎉 Assigned ${selectedPuzzleIds.length} tactical puzzle(s) to ${studentName}! They will now appear in their homework practice hub.`
    );
    setSelectedPuzzleIds([]);
    setTimeout(() => setAssignmentSuccess(''), 5000);
  };

  return (
    <div className="space-y-6">
      {/* Assignment Toolbar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-lg">
            ♟️
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-white">
              Assign Puzzles to Student
            </h3>
            <p className="text-xs text-slate-400">
              Selected <span className="text-amber-400 font-bold">{selectedPuzzleIds.length}</span> puzzle(s)
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <select
            value={targetStudentId}
            onChange={(e) => setTargetStudentId(e.target.value)}
            className="w-full sm:w-64 px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white"
          >
            <option value="">Select Assigned Student...</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.email})
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleAssignPuzzles}
            disabled={selectedPuzzleIds.length === 0 || !targetStudentId}
            className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-gold transition-all disabled:opacity-50"
          >
            🎯 Assign Selected Set
          </button>
        </div>
      </div>

      {assignmentSuccess && (
        <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl text-xs font-semibold">
          {assignmentSuccess}
        </div>
      )}

      {/* Filters Bar */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div>
          <label className="block text-slate-400 font-semibold mb-1">Search FEN / Theme</label>
          <input
            type="text"
            placeholder="Search tactical pattern..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
          />
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Theme</label>
          <select
            value={selectedTheme}
            onChange={(e) => setSelectedTheme(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
          >
            <option value="ALL">All Themes</option>
            <option value="mate">Checkmate</option>
            <option value="fork">Fork</option>
            <option value="pin">Pin</option>
            <option value="skewer">Skewer</option>
            <option value="endgame">Endgame</option>
          </select>
        </div>

        <div>
          <label className="block text-slate-400 font-semibold mb-1">Difficulty</label>
          <select
            value={selectedDifficulty}
            onChange={(e) => setSelectedDifficulty(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
          >
            <option value="ALL">All Difficulty Tiers</option>
            <option value="beginner">Beginner (&lt;1200)</option>
            <option value="intermediate">Intermediate (1200-1600)</option>
            <option value="advanced">Advanced (1600-2000)</option>
            <option value="master">Master (&gt;2000)</option>
          </select>
        </div>
      </div>

      {/* Puzzle Selection Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 text-xs font-bold space-y-2">
          <span className="text-2xl animate-spin inline-block">⏳</span>
          <p>Loading Coach Puzzle Bank...</p>
        </div>
      ) : puzzles.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-2">
          <p className="text-sm font-bold text-white">No Tactical Puzzles Found</p>
          <p className="text-xs">Adjust your search or difficulty filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {puzzles.map((p) => {
            const isSelected = selectedPuzzleIds.includes(p.id);
            return (
              <div
                key={p.id}
                onClick={() => toggleSelectPuzzle(p.id)}
                className={`bg-slate-900 border rounded-2xl p-4 space-y-3 cursor-pointer transition-all ${
                  isSelected
                    ? 'border-amber-400 bg-amber-500/5 shadow-gold'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] ${
                        isSelected
                          ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                          : 'border-slate-700 bg-slate-950'
                      }`}
                    >
                      {isSelected ? '✓' : ''}
                    </div>
                    <h4 className="font-heading font-bold text-sm text-white line-clamp-1">
                      {p.title}
                    </h4>
                  </div>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                    ⭐ {p.rating}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 uppercase font-semibold">
                    {p.difficulty}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-semibold">
                    🎯 {p.theme}
                  </span>
                </div>

                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 font-mono text-[11px] text-amber-200/90 truncate">
                  {p.fen}
                </div>

                <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <span className="font-sans font-bold text-slate-500">Solution:</span>
                  <span className="text-emerald-400 font-bold">{p.solution.join(' → ')}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
