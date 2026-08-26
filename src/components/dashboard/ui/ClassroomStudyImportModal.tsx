'use client';

import React, { useState } from 'react';

interface ClassroomStudyImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportFenOrPgn: (fen: string, pgn: string, moves: string[]) => void;
}

export default function ClassroomStudyImportModal({
  isOpen,
  onClose,
  onImportFenOrPgn,
}: ClassroomStudyImportModalProps) {
  const [inputText, setInputText] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleImport = () => {
    setError('');
    const raw = inputText.trim();
    if (!raw) return;

    // Check if valid FEN (basic check for slash-separated ranks)
    if (raw.split('/').length >= 7) {
      onImportFenOrPgn(raw, '', []);
      onClose();
      setInputText('');
      return;
    }

    // Treat as PGN — parse SAN moves
    const cleanMoves = raw
      .replace(/\[.*?\]/g, '')
      .replace(/\d+\.{1,3}\s*/g, '')
      .replace(/\s*(1-0|0-1|1\/2-1\/2|\*)\s*$/, '')
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (cleanMoves.length === 0) {
      setError('Unable to parse moves or FEN from input.');
      return;
    }

    onImportFenOrPgn('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', raw, cleanMoves);
    onClose();
    setInputText('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
      <div className="bg-[#0f0f24] border border-[#2a2a52] rounded-2xl p-6 w-full max-w-lg space-y-4 shadow-2xl text-white">
        <div className="flex items-center justify-between border-b border-[#222248] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">📥</span>
            <h3 className="font-extrabold text-sm text-white">Import PGN or FEN to Classroom</h3>
          </div>
          <button type="button" onClick={onClose} className="text-xs text-[#8888aa] hover:text-white">✕</button>
        </div>

        <p className="text-xs text-[#aaaacc]">
          Paste raw PGN moves or FEN position string below to immediately load it on the main classroom board for all students.
        </p>

        <textarea
          rows={6}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste PGN (e.g. 1. e4 e5 2. Nf3 Nc6...) or FEN string..."
          className="w-full bg-[#080816] border border-[#222248] rounded-xl p-3 text-xs font-mono text-white placeholder-[#444466] focus:outline-none focus:border-[#c84b31]"
        />

        {error && <p className="text-xs font-bold text-red-400">⚠️ {error}</p>}

        <div className="flex justify-end gap-3 border-t border-[#222248] pt-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#1a1a32] hover:bg-[#252548] text-[#8888cc] text-xs font-bold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleImport}
            disabled={!inputText.trim()}
            className="px-5 py-2 bg-gradient-to-r from-[#c84b31] to-rose-600 hover:from-[#d55339] hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow transition-all disabled:opacity-40"
          >
            🚀 Load Position / PGN
          </button>
        </div>
      </div>
    </div>
  );
}
