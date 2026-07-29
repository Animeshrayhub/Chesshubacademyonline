'use client';

import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { createPuzzleAction } from '@/actions/puzzles';

interface InteractivePuzzleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Cleans and formats raw FEN input (strips PGN tags, quotes, and fills missing half-move counters).
 */
export function sanitizeFenString(raw: string): string {
  if (!raw) return '';
  let cleaned = raw.trim();

  // Strip PGN tag wrapper if user pasted [FEN "8/8/..."]
  if (cleaned.includes('[FEN') || cleaned.includes('"')) {
    const match = cleaned.match(/"([^"]+)"/);
    if (match && match[1]) {
      cleaned = match[1].trim();
    } else {
      cleaned = cleaned.replace(/\[FEN\s+/i, '').replace(/\]/g, '').replace(/"/g, '').trim();
    }
  }

  // Ensure 6 standard FEN fields (piece placement, turn, castling, en passant, halfmove, fullmove)
  const parts = cleaned.split(/\s+/);
  if (parts.length > 0 && parts[0].includes('/')) {
    if (parts.length === 1) parts.push('w');
    if (parts.length === 2) parts.push('-');
    if (parts.length === 3) parts.push('-');
    if (parts.length === 4) parts.push('0');
    if (parts.length === 5) parts.push('1');
    cleaned = parts.join(' ');
  }

  return cleaned;
}

export default function InteractivePuzzleBuilderModal({
  isOpen,
  onClose,
  onSuccess,
}: InteractivePuzzleBuilderModalProps) {
  const [title, setTitle] = useState('');
  const [fen, setFen] = useState('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K2R w KQkq - 4 4');
  const [movesText, setMovesText] = useState('f3f7');
  const [theme, setTheme] = useState('mateIn1');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master'>('beginner');
  const [rating, setRating] = useState(1000);
  const [hint1, setHint1] = useState('Look for an aggressive queen move targetting f7.');
  const [explanation, setExplanation] = useState('Scholars Mate: Queen takes f7 defended by bishop.');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Validate FEN position
  const [fenValid, setFenValid] = useState(true);
  const [playerToMove, setPlayerToMove] = useState<'white' | 'black'>('white');

  useEffect(() => {
    try {
      const sanitized = sanitizeFenString(fen);
      const c = new Chess(sanitized);
      setFenValid(true);
      setPlayerToMove(c.turn() === 'w' ? 'white' : 'black');
    } catch {
      setFenValid(false);
    }
  }, [fen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a puzzle title.');
      return;
    }

    const sanitizedFen = sanitizeFenString(fen);

    if (!fenValid && !sanitizedFen) {
      setErrorMsg('Invalid FEN chess position string.');
      return;
    }

    const solutionArray = movesText
      .trim()
      .split(/\s+/)
      .filter(Boolean);

    if (solutionArray.length === 0) {
      setErrorMsg('Please enter at least one solution move (e.g. e5e8 or Re8#).');
      return;
    }

    setSubmitting(true);
    const res = await createPuzzleAction({
      title: title.trim(),
      fen: sanitizedFen || fen.trim(),
      solution: solutionArray,
      theme,
      difficulty,
      rating: Number(rating) || 1200,
      hint1: hint1.trim() || undefined,
      explanation: explanation.trim() || undefined,
      source: 'custom',
    });

    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to save puzzle to Puzzle Bank.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl shadow-2xl text-white my-8 space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🧩</span>
            <h3 className="font-heading font-bold text-lg text-amber-400">
              Interactive Puzzle Builder
            </h3>
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
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs font-semibold">
            ⚠️ {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-bold mb-1">Puzzle Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scholar's Mate in 1"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-slate-300 font-bold">FEN Position String</label>
              <span className={`text-[10px] font-bold uppercase ${fenValid ? 'text-emerald-400' : 'text-amber-400'}`}>
                {fenValid ? `Valid FEN (${playerToMove} to move)` : 'Raw FEN or PGN Tag'}
              </span>
            </div>
            <input
              type="text"
              required
              value={fen}
              onChange={(e) => setFen(e.target.value)}
              onBlur={(e) => setFen(sanitizeFenString(e.target.value))}
              placeholder='Paste FEN string or raw PGN [FEN "8/8/8..."]'
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-[11px] text-amber-300 focus:outline-none focus:border-amber-400"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              💡 Supports direct FEN strings or raw PGN tags like <code className="text-amber-400">[FEN &quot;8/8/8...&quot;]</code>.
            </p>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">
              Solution Moves (UCI format separated by space)
            </label>
            <input
              type="text"
              required
              value={movesText}
              onChange={(e) => setMovesText(e.target.value)}
              placeholder="f3f7 or e2e4 e7e5 g1f3"
              className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-white focus:outline-none focus:border-amber-400"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              e.g. <code className="text-amber-300 font-mono">f3f7</code> for 1-move solution, or <code className="text-amber-300 font-mono">c4f7 e8f7 f3e5</code> for multi-move solution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-slate-300 font-bold mb-1">Tactical Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              >
                <option value="mateIn1">Checkmate in 1</option>
                <option value="mateIn2">Checkmate in 2</option>
                <option value="fork">Fork / Double Attack</option>
                <option value="pin">Pin</option>
                <option value="skewer">Skewer</option>
                <option value="discoveredAttack">Discovered Attack</option>
                <option value="endgame">Endgame Tactics</option>
                <option value="tactics">General Tactics</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as any)}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              >
                <option value="beginner">Beginner (&lt;1200)</option>
                <option value="intermediate">Intermediate (1200-1600)</option>
                <option value="advanced">Advanced (1600-2000)</option>
                <option value="expert">Expert (2000-2400)</option>
                <option value="master">Master (&gt;2400)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-bold mb-1">Puzzle Rating</label>
              <input
                type="number"
                value={rating}
                onChange={(e) => setRating(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Hint #1 (Optional)</label>
            <input
              type="text"
              value={hint1}
              onChange={(e) => setHint1(e.target.value)}
              placeholder="e.g. Look at the vulnerable f7 square"
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-bold mb-1">Explanation / Solution Notes</label>
            <textarea
              rows={2}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain the tactical concept..."
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-gold transition-all"
            >
              {submitting ? 'Saving Puzzle...' : '💾 Save to Puzzle Bank'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
