'use client';

import React, { useState } from 'react';

export type ClearMode = 'pieces' | 'drawings' | 'everything';

interface ClearBoardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmClear: (mode: ClearMode) => void;
}

export default function ClearBoardModal({
  isOpen,
  onClose,
  onConfirmClear,
}: ClearBoardModalProps) {
  const [selectedMode, setSelectedMode] = useState<ClearMode>('pieces');

  if (!isOpen) return null;

  const handleClear = () => {
    onConfirmClear(selectedMode);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#0f0f1f] border border-[#222244] rounded-2xl p-6 w-full max-w-md space-y-6 shadow-2xl text-white animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#222244] pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-950/60 border border-red-800/50 flex items-center justify-center text-xl shadow-inner">
              🗑️
            </div>
            <div>
              <h3 className="font-extrabold text-base text-white tracking-tight">Clear Board</h3>
              <p className="text-xs text-slate-400">Choose what to clear from the current classroom board.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all"
          >
            ✕
          </button>
        </div>

        {/* Options List */}
        <div className="space-y-3">
          {/* Mode 1: Pieces Only */}
          <label
            onClick={() => setSelectedMode('pieces')}
            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
              selectedMode === 'pieces'
                ? 'bg-purple-950/40 border-purple-600 ring-1 ring-purple-500'
                : 'bg-[#141428] border-[#222244] hover:bg-[#1a1a32]'
            }`}
          >
            <input
              type="radio"
              name="clearMode"
              checked={selectedMode === 'pieces'}
              onChange={() => setSelectedMode('pieces')}
              className="mt-0.5 accent-purple-500"
            />
            <div>
              <h4 className="text-xs font-extrabold text-white">Pieces Only</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Remove all chess pieces. Keeps arrows, highlights, bookmarks, and labels intact.
              </p>
            </div>
          </label>

          {/* Mode 2: Pieces + Drawings */}
          <label
            onClick={() => setSelectedMode('drawings')}
            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
              selectedMode === 'drawings'
                ? 'bg-purple-950/40 border-purple-600 ring-1 ring-purple-500'
                : 'bg-[#141428] border-[#222244] hover:bg-[#1a1a32]'
            }`}
          >
            <input
              type="radio"
              name="clearMode"
              checked={selectedMode === 'drawings'}
              onChange={() => setSelectedMode('drawings')}
              className="mt-0.5 accent-purple-500"
            />
            <div>
              <h4 className="text-xs font-extrabold text-white">Pieces + Drawings</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Remove pieces, arrows, highlights, and labels. Keeps bookmarks intact.
              </p>
            </div>
          </label>

          {/* Mode 3: Everything */}
          <label
            onClick={() => setSelectedMode('everything')}
            className={`flex items-start gap-3 p-3.5 rounded-xl border transition-all cursor-pointer select-none ${
              selectedMode === 'everything'
                ? 'bg-rose-950/40 border-rose-600 ring-1 ring-rose-500'
                : 'bg-[#141428] border-[#222244] hover:bg-[#1a1a32]'
            }`}
          >
            <input
              type="radio"
              name="clearMode"
              checked={selectedMode === 'everything'}
              onChange={() => setSelectedMode('everything')}
              className="mt-0.5 accent-rose-500"
            />
            <div>
              <h4 className="text-xs font-extrabold text-rose-300">Everything (Full Reset)</h4>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Remove pieces, move history, bookmarks, arrows, highlights, labels, and engine lines.
              </p>
            </div>
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 border-t border-[#222244] pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleClear}
            className="px-5 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold rounded-xl shadow-lg transition-all"
          >
            Clear Board
          </button>
        </div>
      </div>
    </div>
  );
}
