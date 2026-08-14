'use client';

import React from 'react';

const PIECE_IMAGES: Record<string, string> = {
  wK: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Chess_klt45.svg',
  wQ: 'https://upload.wikimedia.org/wikipedia/commons/1/15/Chess_qlt45.svg',
  wR: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Chess_rlt45.svg',
  wB: 'https://upload.wikimedia.org/wikipedia/commons/b/b1/Chess_blt45.svg',
  wN: 'https://upload.wikimedia.org/wikipedia/commons/7/70/Chess_nlt45.svg',
  wP: 'https://upload.wikimedia.org/wikipedia/commons/4/45/Chess_plt45.svg',
  bK: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Chess_kdt45.svg',
  bQ: 'https://upload.wikimedia.org/wikipedia/commons/4/47/Chess_qdt45.svg',
  bR: 'https://upload.wikimedia.org/wikipedia/commons/f/ff/Chess_rdt45.svg',
  bB: 'https://upload.wikimedia.org/wikipedia/commons/9/98/Chess_bdt45.svg',
  bN: 'https://upload.wikimedia.org/wikipedia/commons/e/ef/Chess_ndt45.svg',
  bP: 'https://upload.wikimedia.org/wikipedia/commons/c/c7/Chess_pdt45.svg',
};

interface ClassroomBoardEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  editorActivePiece: string | null;
  setEditorActivePiece: (piece: string | null) => void;
  editorSideToMove: 'w' | 'b';
  setEditorSideToMove: (side: 'w' | 'b') => void;
  editorCastling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  setEditorCastling: React.Dispatch<React.SetStateAction<{ wK: boolean; wQ: boolean; bK: boolean; bQ: boolean }>>;
  onResetStart: () => void;
  onClearBoard: () => void;
  onApplyPosition: () => void;
}

const WHITE_PIECES = ['wP', 'wN', 'wB', 'wR', 'wQ', 'wK'];
const BLACK_PIECES = ['bP', 'bN', 'bB', 'bR', 'bQ', 'bK'];

export default function ClassroomBoardEditorDrawer({
  isOpen,
  onClose,
  editorActivePiece,
  setEditorActivePiece,
  editorSideToMove,
  setEditorSideToMove,
  editorCastling,
  setEditorCastling,
  onResetStart,
  onClearBoard,
  onApplyPosition,
}: ClassroomBoardEditorDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-[9999] w-80 md:w-96 bg-slate-950/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl flex flex-col justify-between text-white animate-in slide-in-from-right duration-250">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
        <div className="flex items-center gap-2">
          <span className="text-xl">🎨</span>
          <div>
            <h2 className="text-sm font-black tracking-tight text-white uppercase">Board Position Editor</h2>
            <p className="text-[10px] text-slate-400 font-medium">Stamp pieces, edit side to move, and set positions</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center font-bold text-sm transition-all"
        >
          ✕
        </button>
      </div>

      {/* Body Content */}
      <div className="p-4 space-y-5 overflow-y-auto flex-1 text-xs">
        {/* Mode Selector */}
        <div className="space-y-2">
          <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider">
            1. Select Placement Tool
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setEditorActivePiece(null)}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                editorActivePiece === null
                  ? 'bg-emerald-500 border-emerald-400 text-slate-950 ring-2 ring-emerald-400/40 shadow-lg scale-[1.02]'
                  : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-base">👆</span>
              <span>Drag Mode</span>
            </button>
            <button
              type="button"
              onClick={() => setEditorActivePiece('trash')}
              className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                editorActivePiece === 'trash'
                  ? 'bg-red-600 border-red-500 text-white ring-2 ring-red-500/40 shadow-lg scale-[1.02]'
                  : 'bg-slate-900 border-slate-800 text-red-400 hover:bg-red-950/40 hover:border-red-800/60'
              }`}
            >
              <span className="text-base">🗑️</span>
              <span>Trash Tool</span>
            </button>
          </div>
        </div>

        {/* Piece Palette - White Pieces */}
        <div className="space-y-2">
          <label className="block text-[11px] font-black text-amber-300 uppercase tracking-wider">
            White Pieces
          </label>
          <div className="grid grid-cols-6 gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            {WHITE_PIECES.map((code) => {
              const isSelected = editorActivePiece === code;
              const imgUrl = PIECE_IMAGES[code];
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setEditorActivePiece(code)}
                  className={`aspect-square rounded-xl border flex items-center justify-center transition-all p-1 ${
                    isSelected
                      ? 'bg-amber-400 border-amber-300 ring-2 ring-amber-400/50 scale-110 shadow-lg'
                      : 'bg-slate-800 border-slate-700 hover:bg-slate-700 hover:border-slate-500 hover:scale-105'
                  }`}
                  title={`Stamp White ${code[1]}`}
                >
                  <img src={imgUrl} alt={code} className="w-full h-full object-contain pointer-events-none" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Piece Palette - Black Pieces */}
        <div className="space-y-2">
          <label className="block text-[11px] font-black text-amber-400 uppercase tracking-wider">
            Black Pieces
          </label>
          <div className="grid grid-cols-6 gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
            {BLACK_PIECES.map((code) => {
              const isSelected = editorActivePiece === code;
              const imgUrl = PIECE_IMAGES[code];
              return (
                <button
                  key={code}
                  type="button"
                  onClick={() => setEditorActivePiece(code)}
                  className={`aspect-square rounded-xl border flex items-center justify-center transition-all p-1 ${
                    isSelected
                      ? 'bg-amber-400 border-amber-300 ring-2 ring-amber-400/50 scale-110 shadow-lg'
                      : 'bg-slate-900 border-slate-800 hover:bg-slate-800 hover:border-slate-600 hover:scale-105'
                  }`}
                  title={`Stamp Black ${code[1]}`}
                >
                  <img src={imgUrl} alt={code} className="w-full h-full object-contain pointer-events-none" />
                </button>
              );
            })}
          </div>
        </div>

        {/* Side to Move & Quick Presets */}
        <div className="space-y-3 pt-1 border-t border-slate-800">
          <div>
            <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1.5">
              Side to Move
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEditorSideToMove('w')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  editorSideToMove === 'w'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>♔</span> White to Move
              </button>
              <button
                type="button"
                onClick={() => setEditorSideToMove('b')}
                className={`py-2 px-3 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  editorSideToMove === 'b'
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-black shadow-md'
                    : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>♚</span> Black to Move
              </button>
            </div>
          </div>

          {/* Castling Rights */}
          <div>
            <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1.5">
              Castling Rights
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={editorCastling.wK}
                  onChange={(e) => setEditorCastling((prev) => ({ ...prev, wK: e.target.checked }))}
                  className="rounded border-slate-700 text-amber-400 focus:ring-amber-400 bg-slate-950"
                />
                <span>White O-O</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={editorCastling.wQ}
                  onChange={(e) => setEditorCastling((prev) => ({ ...prev, wQ: e.target.checked }))}
                  className="rounded border-slate-700 text-amber-400 focus:ring-amber-400 bg-slate-950"
                />
                <span>White O-O-O</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={editorCastling.bK}
                  onChange={(e) => setEditorCastling((prev) => ({ ...prev, bK: e.target.checked }))}
                  className="rounded border-slate-700 text-amber-400 focus:ring-amber-400 bg-slate-950"
                />
                <span>Black O-O</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-slate-300 hover:text-white">
                <input
                  type="checkbox"
                  checked={editorCastling.bQ}
                  onChange={(e) => setEditorCastling((prev) => ({ ...prev, bQ: e.target.checked }))}
                  className="rounded border-slate-700 text-amber-400 focus:ring-amber-400 bg-slate-950"
                />
                <span>Black O-O-O</span>
              </label>
            </div>
          </div>

          {/* Quick Presets */}
          <div>
            <label className="block text-[11px] font-black text-slate-300 uppercase tracking-wider mb-1.5">
              Quick Board Presets
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onResetStart}
                className="py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 font-bold rounded-xl border border-slate-800 transition-all text-center"
              >
                🔄 Standard Start
              </button>
              <button
                type="button"
                onClick={onClearBoard}
                className="py-2 px-3 bg-red-950/40 hover:bg-red-900/50 text-red-300 font-bold rounded-xl border border-red-800/40 transition-all text-center"
              >
                ✨ Clear Board
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Action Button */}
      <div className="p-4 border-t border-slate-800 bg-slate-900/80">
        <button
          type="button"
          onClick={() => {
            onApplyPosition();
            onClose();
          }}
          className="w-full py-3.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-950/60 hover:shadow-emerald-900/80 transform hover:-translate-y-0.5 transition-all border border-emerald-400 flex items-center justify-center gap-2 uppercase tracking-wider"
        >
          <span>⚡</span>
          <span>APPLY POSITION TO CLASS</span>
        </button>
      </div>
    </div>
  );
}
