'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';

interface PgnStudyImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onImportPgn?: (pgnData: string, title: string) => void;
}

export default function PgnStudyImportWizard({
  isOpen,
  onClose,
  onImportPgn,
}: PgnStudyImportWizardProps) {
  const [pgnText, setPgnText] = useState('');
  const [studyTitle, setStudyTitle] = useState('');
  const [imported, setImported] = useState(false);

  if (!isOpen) return null;

  const handleImport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pgnText) return;

    if (onImportPgn) {
      onImportPgn(pgnText, studyTitle || 'Imported PGN Chapter');
    }
    setImported(true);
    setTimeout(() => {
      onClose();
      setImported(false);
      setPgnText('');
      setStudyTitle('');
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
              📖
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-amber-400">
                PGN & Lichess Study Import Wizard
              </h3>
              <p className="text-xs text-slate-400">Paste PGN text or Lichess Study notation to create chapters instantly.</p>
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

        {imported ? (
          <div className="p-6 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-center space-y-2">
            <div className="text-4xl">🎉</div>
            <h4 className="text-base font-bold text-emerald-300">PGN Study Imported Successfully!</h4>
            <p className="text-xs text-slate-400">Generated interactive tactical moves and chapter positions.</p>
          </div>
        ) : (
          <form onSubmit={handleImport} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Chapter Title</label>
              <input
                type="text"
                placeholder="e.g. Master Game: Fischer vs Spassky 1972"
                value={studyTitle}
                onChange={(e) => setStudyTitle(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Paste PGN / FEN Notation</label>
              <textarea
                rows={6}
                required
                placeholder={`[Event "Academy Practice"]\n[White "Coach"]\n[Black "Student"]\n1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5...`}
                value={pgnText}
                onChange={(e) => setPgnText(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 font-mono focus:outline-none focus:border-amber-500"
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="sm"
              className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold w-full py-2.5 text-xs shadow-lg"
            >
              🚀 Import PGN & Generate Interactive Chapter
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
