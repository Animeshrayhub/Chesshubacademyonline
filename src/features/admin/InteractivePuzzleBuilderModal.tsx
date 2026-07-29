'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { createPuzzleAction } from '@/actions/puzzles';

const Chessboard = dynamic(
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

interface InteractivePuzzleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

import { sanitizeFen, parsePgnWithVariations } from '@/utils/chessSanitizer';

const DEFAULT_START_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K2R w KQkq - 4 4';

export function sanitizeFenString(raw: string): string {
  return sanitizeFen(raw);
}

export default function InteractivePuzzleBuilderModal({
  isOpen,
  onClose,
  onSuccess,
}: InteractivePuzzleBuilderModalProps) {
  const [title, setTitle] = useState('');
  const [rawFen, setRawFen] = useState(DEFAULT_START_FEN);
  const [solutionMoves, setSolutionMoves] = useState<string[]>(['f3f7']);
  const [theme, setTheme] = useState('mateIn1');
  const [difficulty, setDifficulty] = useState<'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master'>('beginner');
  const [rating, setRating] = useState(1000);
  const [hint1, setHint1] = useState('Look for an aggressive queen move targetting f7.');
  const [explanation, setExplanation] = useState('Scholars Mate: Queen takes f7 defended by bishop.');
  
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [activeTab, setActiveTab] = useState<'record' | 'edit_fen'>('record');
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [boardKey, setBoardKey] = useState(0);

  // Active chess instance for solution recording
  const [currentFen, setCurrentFen] = useState(DEFAULT_START_FEN);
  const gameRef = useRef<Chess>(new Chess(DEFAULT_START_FEN));

  // Initialize and update position safely
  const updateBoardFromFen = useCallback((inputFen: string) => {
    try {
      // Check if input is a full PGN text containing headers or variation moves
      if (inputFen.includes('[Event') || inputFen.includes('[FEN') || inputFen.includes('1.')) {
        const parsed = parsePgnWithVariations(inputFen);
        if (parsed.success) {
          const c = new Chess(parsed.fen);
          gameRef.current = c;
          setCurrentFen(c.fen());
          setOrientation(c.turn() === 'w' ? 'white' : 'black');
          if (parsed.mainMoves.length > 0) {
            setSolutionMoves(parsed.mainMoves);
          }
          setBoardKey((prev) => prev + 1);
          setErrorMsg('');
          return;
        }
      }

      const sanitized = sanitizeFenString(inputFen);
      const c = new Chess(sanitized);
      gameRef.current = c;
      setCurrentFen(c.fen());
      setOrientation(c.turn() === 'w' ? 'white' : 'black');
      setBoardKey((prev) => prev + 1);
      setErrorMsg('');
    } catch (err) {
      // Fallback cleanly without crashing modal
      try {
        const fallbackFen = 'k7/8/8/8/8/8/8/K7 w - - 0 1';
        gameRef.current = new Chess(fallbackFen);
        setCurrentFen(fallbackFen);
        setBoardKey((prev) => prev + 1);
      } catch (e) {
        console.error('FEN fallback error:', e);
      }
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      updateBoardFromFen(rawFen);
    }
  }, [isOpen, rawFen, updateBoardFromFen]);

  if (!isOpen) return null;

  // Handle piece drop to record solution moves visually
  const handlePieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    try {
      const tempGame = new Chess(gameRef.current.fen());
      const moveRes = tempGame.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q',
      });

      if (moveRes) {
        const uciMove = `${sourceSquare}${targetSquare}${moveRes.promotion || ''}`;
        setSolutionMoves((prev) => [...prev, uciMove]);
        gameRef.current = tempGame;
        setCurrentFen(tempGame.fen());
        setBoardKey((prev) => prev + 1);
        setErrorMsg('');
        return true;
      }
    } catch (err) {
      console.error('Invalid solution move attempted:', err);
    }
    return false;
  };

  const handleResetBoard = () => {
    setSolutionMoves([]);
    updateBoardFromFen(rawFen);
  };

  const handleClearBoard = () => {
    const emptyFen = '8/8/8/8/8/8/8/8 w - - 0 1';
    setRawFen(emptyFen);
    setSolutionMoves([]);
    updateBoardFromFen(emptyFen);
  };

  const handleRemoveSolutionMove = (index: number) => {
    setSolutionMoves((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a puzzle title.');
      return;
    }

    const sanitized = sanitizeFenString(rawFen);

    if (solutionMoves.length === 0) {
      setErrorMsg('Please record at least one solution move by dragging pieces on the board.');
      return;
    }

    setSubmitting(true);

    const res = await createPuzzleAction({
      title: title.trim(),
      fen: sanitized,
      solution: solutionMoves,
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
      setErrorMsg(res.error || 'Failed to save puzzle to database.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-4xl shadow-2xl text-white my-6 space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shadow-gold text-amber-400">
              🧩
            </div>
            <div>
              <h3 className="font-heading font-bold text-lg text-amber-400">
                Interactive Tactical Puzzle Builder
              </h3>
              <p className="text-xs text-slate-400">
                Drag pieces on the board to set positions and auto-record solution moves.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm transition-colors"
          >
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Top Section: Title & Controls */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Puzzle Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Scholar's Mate Queen Sacrifice, Back-Rank Tactical Strike"
              className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          {/* Main Grid: Visual Chess Board + Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Column 1: Live Interactive Chess Board */}
            <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl space-y-3 flex flex-col items-center">
              <div className="flex items-center justify-between w-full text-xs">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span>♟️</span>
                  <span>Visual Board ({orientation === 'white' ? 'White to move' : 'Black to move'})</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setOrientation((o) => (o === 'white' ? 'black' : 'white'))}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition border border-slate-700"
                  >
                    🔄 Flip
                  </button>
                  <button
                    type="button"
                    onClick={handleResetBoard}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition border border-slate-700"
                  >
                    ↺ Reset
                  </button>
                  <button
                    type="button"
                    onClick={handleClearBoard}
                    className="px-2.5 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-bold rounded-lg transition border border-rose-500/40"
                  >
                    🗑️ Clear
                  </button>
                </div>
              </div>

              {/* Interactive Board Component */}
              <div className="w-full aspect-square max-w-[360px] rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                <Chessboard
                  key={boardKey}
                  position={currentFen}
                  onPieceDrop={(s: string, t: string) => handlePieceDrop(s, t)}
                  boardOrientation={orientation}
                  options={{
                    position: currentFen,
                    onPieceDrop: ({ sourceSquare, targetSquare }: any) => handlePieceDrop(sourceSquare, targetSquare),
                    boardOrientation: orientation,
                    boardStyle: {
                      borderRadius: '12px',
                    },
                  }}
                  customBoardStyle={{
                    borderRadius: '12px',
                  }}
                />
              </div>

              {/* Recorded Moves Output */}
              <div className="w-full space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                  <span>Recorded Solution Moves ({solutionMoves.length}):</span>
                  {solutionMoves.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSolutionMoves([])}
                      className="text-[10px] text-rose-400 hover:underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>

                <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-xl flex flex-wrap gap-1.5 min-h-[42px] items-center">
                  {solutionMoves.length === 0 ? (
                    <span className="text-[11px] text-slate-500 italic">
                      💡 Drag pieces on the board above to record solution moves...
                    </span>
                  ) : (
                    solutionMoves.map((m, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold rounded-lg"
                      >
                        <span>{idx + 1}. {m}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSolutionMove(idx)}
                          className="hover:text-rose-400 text-slate-400 ml-1 text-[10px]"
                        >
                          ✕
                        </button>
                      </span>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Column 2: FEN, Metadata & Hints */}
            <div className="space-y-4">
              {/* FEN String Input & Auto-Sanitizer */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  FEN Position String
                </label>
                <input
                  type="text"
                  value={rawFen}
                  onChange={(e) => {
                    setRawFen(e.target.value);
                    updateBoardFromFen(e.target.value);
                  }}
                  placeholder="Paste FEN or [FEN &quot;8/8/...&quot;]"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-400"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  💡 Supports raw FEN strings or PGN tags. Auto-corrects malformed rank counts.
                </p>
              </div>

              {/* Theme & Difficulty */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Tactical Theme</label>
                  <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="mateIn1">Checkmate in 1</option>
                    <option value="mateIn2">Checkmate in 2</option>
                    <option value="fork">Knight Fork</option>
                    <option value="pin">Pin & Skewer</option>
                    <option value="backRank">Back-Rank Mate</option>
                    <option value="endgame">Endgame Tactic</option>
                    <option value="opening">Opening Tactic</option>
                    <option value="general">General Tactics</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as any)}
                    className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                  >
                    <option value="beginner">Beginner (&lt;1200)</option>
                    <option value="intermediate">Intermediate (1200-1600)</option>
                    <option value="advanced">Advanced (1600-1900)</option>
                    <option value="expert">Expert (1900-2200)</option>
                    <option value="master">Master (&gt;2200)</option>
                  </select>
                </div>
              </div>

              {/* Rating */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Puzzle Rating</label>
                <input
                  type="number"
                  min={500}
                  max={3000}
                  step={50}
                  value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Hint #1 */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Hint #1 (Optional)</label>
                <input
                  type="text"
                  value={hint1}
                  onChange={(e) => setHint1(e.target.value)}
                  placeholder="e.g. Look for an aggressive queen move targeting f7."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              {/* Explanation / Solution Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Explanation / Solution Notes</label>
                <textarea
                  rows={2}
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                  placeholder="Detailed explanation of the key move and tactical motive..."
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 resize-none"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-3 border-t border-slate-800 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="animate-spin text-sm">⏳</span>
                  <span>Saving Puzzle...</span>
                </>
              ) : (
                <>
                  <span>💾 Save to Puzzle Bank</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
