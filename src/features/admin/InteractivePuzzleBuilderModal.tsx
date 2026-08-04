'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { sanitizeFen, parsePgnWithVariations } from '@/utils/chessSanitizer';
import BoardEditorWorkspace from '@/components/dashboard/ui/BoardEditorWorkspace';
import { createPuzzleAction } from '@/actions/puzzles';

const Chessboard = dynamic(
  () =>
    import('react-chessboard').then((mod) => {
      const CB = mod.Chessboard;
      return function BoardWrapper(props: any) {
        const { options, ...rest } = props;
        const finalProps = options ? { ...options, ...rest } : rest;
        return <CB {...finalProps} />;
      };
    }),
  { ssr: false }
) as any;

// ─────────────────────────────────────────────────────────────────────────────

interface InteractivePuzzleBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

const QUICK_POSITIONS = [
  { label: 'Start', icon: '♟️', fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1' },
  { label: 'Scholar\'s Mate', icon: '♛', fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K2R w KQkq - 4 4' },
  { label: 'Back Rank', icon: '🏰', fen: '6k1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1' },
  { label: 'King & Pawn', icon: '👑', fen: '8/4p3/8/2k5/8/5K2/4P3/8 w - - 0 1' },
  { label: 'Rook End', icon: '⚔️', fen: '8/8/4r3/3k4/8/8/3K1R2/8 w - - 0 1' },
  { label: 'Empty', icon: '🧹', fen: '8/8/8/8/8/8/8/8 w - - 0 1' },
];

export function sanitizeFenString(raw: string): string {
  return sanitizeFen(raw);
}

// ─────────────────────────────────────────────────────────────────────────────

export default function InteractivePuzzleBuilderModal({
  isOpen,
  onClose,
  onSuccess,
}: InteractivePuzzleBuilderModalProps) {
  // ── Step indicator: 'position' → 'record' → 'details'
  const [step, setStep] = useState<'position' | 'record' | 'details'>('position');
  const [inputTab, setInputTab] = useState<'fen' | 'pgn'>('fen'); // Selection A3: Dedicated PGN Import Tab

  // ── Puzzle metadata
  const [title, setTitle] = useState('');
  const [theme, setTheme] = useState('mateIn1');
  const [difficulty, setDifficulty] = useState<
    'pre_beginner' | 'beginner' | 'intermediate' | 'advanced' | 'expert' | 'master'
  >('beginner');
  const [track, setTrack] = useState('beginner');
  const [chapterName, setChapterName] = useState('');
  const [rating, setRating] = useState(1000);
  const [hint1, setHint1] = useState('');
  const [explanation, setExplanation] = useState('');

  // ── Board state
  const [rawFen, setRawFen] = useState(DEFAULT_FEN);
  const [currentFen, setCurrentFen] = useState(DEFAULT_FEN);
  const [solutionMoves, setSolutionMoves] = useState<string[]>([]);
  const [orientation, setOrientation] = useState<'white' | 'black'>('white');
  const [boardKey, setBoardKey] = useState(0);
  const [fenError, setFenError] = useState('');
  const [fenSuccess, setFenSuccess] = useState('');

  // Selection A2: Manual Move Input state
  const [manualMoveText, setManualMoveText] = useState('');

  // ── UI state
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const gameRef = useRef<Chess>(new Chess(DEFAULT_FEN));

  // ── Helper: Safely sync gameRef and currentFen with sanitized FEN
  const syncGameInstance = useCallback((targetFen: string, movesToReplay: string[] = []) => {
    const sanitized = sanitizeFen(targetFen);
    try {
      const c = new Chess(sanitized);
      const playedSan: string[] = [];

      for (const m of movesToReplay) {
        try {
          let mv = null;
          if (m.length >= 4 && (m[0] >= 'a' && m[0] <= 'h') && (m[1] >= '1' && m[1] <= '8')) {
            // UCI move e.g. e2e4 or e7e8q
            mv = c.move({
              from: m.slice(0, 2),
              to: m.slice(2, 4),
              promotion: m.length >= 5 ? m[4] : 'q',
            });
          } else {
            // SAN move e.g. Rd4 or Qh4#
            mv = c.move(m);
          }
          if (mv) {
            playedSan.push(mv.san);
          }
        } catch {
          // ignore unplayable move
        }
      }

      gameRef.current = c;
      setCurrentFen(c.fen());
      setOrientation(c.turn() === 'w' ? 'white' : 'black');
      setBoardKey((k) => k + 1);
      return { success: true, fen: sanitized, playedSan };
    } catch (err) {
      console.warn('syncGameInstance error:', err);
      const safeFen = 'k7/8/8/8/8/8/8/K7 w - - 0 1';
      gameRef.current = new Chess(safeFen);
      setCurrentFen(safeFen);
      setBoardKey((k) => k + 1);
      return { success: false, fen: safeFen, playedSan: [] };
    }
  }, []);

  // ── Reset everything when modal opens
  useEffect(() => {
    if (isOpen) {
      setStep('position');
      setInputTab('fen');
      setTitle('');
      setTheme('mateIn1');
      setDifficulty('beginner');
      setTrack('beginner');
      setChapterName('');
      setRating(1000);
      setHint1('');
      setExplanation('');
      setRawFen(DEFAULT_FEN);
      setSolutionMoves([]);
      setManualMoveText('');
      setErrorMsg('');
      setFenError('');
      setFenSuccess('');
      setOrientation('white');
      syncGameInstance(DEFAULT_FEN);
    }
  }, [isOpen, syncGameInstance]);

  // ── Load a FEN string
  const applyFenOnly = useCallback((input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;
    setFenError('');
    setFenSuccess('');

    const sanitized = sanitizeFen(trimmed);
    setRawFen(sanitized);
    setSolutionMoves([]);
    syncGameInstance(sanitized, []);
    setFenSuccess('✅ Position applied successfully!');
  }, [syncGameInstance]);

  // ── Dedicated PGN Study Import (Selection A3)
  const applyPgnStudy = useCallback((pgnText: string) => {
    const trimmed = pgnText.trim();
    if (!trimmed) return;
    setFenError('');
    setFenSuccess('');

    const parsed = parsePgnWithVariations(trimmed);
    if (parsed.success) {
      const sanMoves = parsed.mainMoves && parsed.mainMoves.length > 0 ? parsed.mainMoves : [];
      setRawFen(parsed.fen);
      setSolutionMoves(sanMoves);
      syncGameInstance(parsed.fen, sanMoves);

      if (sanMoves.length > 0) {
        setFenSuccess(`✅ Extracted FEN & ${sanMoves.length} SAN move(s) from PGN!`);
      } else {
        setFenSuccess('✅ Position applied successfully from PGN header!');
      }
    } else {
      setFenError('⚠️ Could not parse PGN study. Please check the move notation.');
    }
  }, [syncGameInstance]);

  if (!isOpen) return null;

  // ── Record a solution move by dragging on board in Step 2 (SAN notation per Selection A3)
  const handlePieceDrop = (src: string, tgt: string): boolean => {
    try {
      const tmp = new Chess(gameRef.current.fen());
      const mv = tmp.move({ from: src, to: tgt, promotion: 'q' });
      if (mv) {
        const sanMove = mv.san;
        setSolutionMoves((prev) => [...prev, sanMove]);
        gameRef.current = tmp;
        setCurrentFen(tmp.fen());
        setBoardKey((k) => k + 1);
        setErrorMsg('');
        return true;
      }
    } catch (err) {
      console.warn('Invalid solution move:', err);
    }
    return false;
  };

  // Selection A2: Manual Move Input (e.g. typing "Qe8#" or "e4")
  const handleAddManualMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMoveText.trim()) return;
    try {
      const tmp = new Chess(gameRef.current.fen());
      const mv = tmp.move(manualMoveText.trim());
      if (mv) {
        setSolutionMoves((prev) => [...prev, mv.san]);
        gameRef.current = tmp;
        setCurrentFen(tmp.fen());
        setBoardKey((k) => k + 1);
        setManualMoveText('');
        setErrorMsg('');
      } else {
        setErrorMsg(`⚠️ "${manualMoveText}" is not a legal move in this position.`);
      }
    } catch {
      setErrorMsg(`⚠️ Invalid move "${manualMoveText}". Use SAN notation e.g. Qe8#, Nf3, e4.`);
    }
  };

  const handleResetMoves = () => {
    setSolutionMoves([]);
    syncGameInstance(rawFen);
  };

  const handleRemoveMove = (idx: number) => {
    const updatedMoves = solutionMoves.filter((_, i) => i !== idx);
    setSolutionMoves(updatedMoves);
    syncGameInstance(rawFen, updatedMoves);
  };

  const handleUndoLastMove = () => {
    if (solutionMoves.length === 0) return;
    const updatedMoves = solutionMoves.slice(0, -1);
    setSolutionMoves(updatedMoves);
    syncGameInstance(rawFen, updatedMoves);
  };

  // ── Transition to Step 2 ("Record Moves")
  const handleGoToRecordMoves = () => {
    syncGameInstance(rawFen, solutionMoves);
    setStep('record');
  };

  // ── Submit (Enforces explicit admin selection per Selection A4)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a descriptive puzzle title.');
      return;
    }
    if (!track) {
      setErrorMsg('Please select a Target Skill Track.');
      return;
    }
    if (!theme) {
      setErrorMsg('Please select a Tactical Theme.');
      return;
    }
    if (!difficulty) {
      setErrorMsg('Please select a Difficulty Level.');
      return;
    }
    if (solutionMoves.length === 0) {
      setErrorMsg('Record at least one solution move in Step 2.');
      return;
    }

    setSubmitting(true);
    const sanitized = sanitizeFen(rawFen);
    const res = await createPuzzleAction({
      title: title.trim(),
      fen: sanitized,
      solution: solutionMoves,
      theme,
      difficulty,
      track,
      chapterId: chapterName.trim() || undefined,
      rating: Number(rating) || 1000,
      hint1: hint1.trim() || undefined,
      explanation: explanation.trim() || undefined,
      source: 'custom',
    });
    setSubmitting(false);

    if (res.success) {
      onSuccess();
      onClose();
    } else {
      setErrorMsg(res.error || 'Failed to save puzzle.');
    }
  };

  // ── Step labels
  const steps = [
    { key: 'position', label: '1. Set Position', icon: '🎨' },
    { key: 'record', label: '2. Record Moves', icon: '♟️' },
    { key: 'details', label: '3. Metadata', icon: '📝' },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-5xl shadow-2xl text-white my-4 flex flex-col">

        {/* ── Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl text-amber-400">
              🧩
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-amber-400">
                Interactive Tactical Puzzle Builder
              </h3>
              <p className="text-[11px] text-slate-400">
                Build a position, record solution moves, then fill in metadata.
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

        {/* ── Step Indicator */}
        <div className="flex items-center gap-0 px-6 py-3 border-b border-slate-800 bg-slate-950/40">
          {steps.map((s, idx) => {
            const isActive = s.key === step;
            const isDone =
              (s.key === 'position' && (step === 'record' || step === 'details')) ||
              (s.key === 'record' && step === 'details');
            return (
              <React.Fragment key={s.key}>
                <button
                  type="button"
                  onClick={() => {
                    if (s.key === 'record') handleGoToRecordMoves();
                    else setStep(s.key);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : isDone
                      ? 'text-emerald-400 hover:bg-slate-800'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  <span>{isDone ? '✅' : s.icon}</span>
                  <span>{s.label}</span>
                </button>
                {idx < steps.length - 1 && (
                  <span className="text-slate-700 px-1 text-xs">›</span>
                )}
              </React.Fragment>
            );
          })}

          {solutionMoves.length > 0 && (
            <span className="ml-auto text-[10px] font-bold text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
              {solutionMoves.length} move{solutionMoves.length !== 1 ? 's' : ''} recorded
            </span>
          )}
        </div>

        {/* ── Error Banner */}
        {errorMsg && (
          <div className="mx-6 mt-4 bg-red-500/10 border border-red-500/30 text-red-300 p-3 rounded-xl text-xs font-semibold flex items-center gap-2">
            <span>⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 1: SET POSITION
        ════════════════════════════════════════════════════════════ */}
        {step === 'position' && (
          <div className="p-5 space-y-4 overflow-y-auto max-h-[72vh]">
            {/* Dedicated Input Mode Tabs (Selection A3) */}
            <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
              <button
                type="button"
                onClick={() => setInputTab('fen')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  inputTab === 'fen'
                    ? 'bg-amber-500 text-slate-950 shadow-gold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📋 Paste FEN String
              </button>
              <button
                type="button"
                onClick={() => setInputTab('pgn')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                  inputTab === 'pgn'
                    ? 'bg-amber-500 text-slate-950 shadow-gold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                📥 Dedicated PGN Study Import
              </button>
            </div>

            {/* Quick Position Presets */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Academy Presets</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_POSITIONS.map((pos) => (
                  <button
                    key={pos.label}
                    type="button"
                    onClick={() => {
                      setRawFen(pos.fen);
                      applyFenOnly(pos.fen);
                      setSolutionMoves([]);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 hover:border-amber-500/50 text-slate-200 text-xs font-semibold rounded-xl transition-all"
                  >
                    <span>{pos.icon}</span>
                    <span>{pos.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Input Tab: FEN String Only */}
            {inputTab === 'fen' && (
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Paste FEN Notation String
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={rawFen}
                    onChange={(e) => {
                      setRawFen(e.target.value);
                      setFenError('');
                      setFenSuccess('');
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') { e.preventDefault(); applyFenOnly(rawFen); }
                    }}
                    placeholder="e.g. 6k1/5ppp/8/8/8/8/8/3QR1K1 w - - 0 1"
                    className="flex-1 p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={() => applyFenOnly(rawFen)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all shadow-gold"
                  >
                    Apply FEN
                  </button>
                </div>
                {fenError && <p className="text-[10px] text-red-400 mt-1 font-semibold">⚠️ {fenError}</p>}
                {fenSuccess && <p className="text-[10px] text-emerald-400 mt-1 font-semibold">{fenSuccess}</p>}
              </div>
            )}

            {/* Input Tab: Dedicated PGN Study Import (Selection A3) */}
            {inputTab === 'pgn' && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
                <label className="block text-xs font-semibold text-amber-300">
                  Paste PGN Study / Moves Text
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste PGN headers or move notation (e.g. 1. Re8# or [FEN &quot;...&quot;] 1. e4 e5 2. Nf3 Nc6)…"
                  className="w-full p-3 bg-slate-900 border border-slate-800 rounded-xl font-mono text-xs text-amber-200 focus:outline-none focus:border-amber-400 resize-none"
                  onBlur={(e) => { if (e.target.value.trim()) applyPgnStudy(e.target.value); }}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    const textarea = (e.currentTarget.previousElementSibling as HTMLTextAreaElement);
                    if (textarea && textarea.value) applyPgnStudy(textarea.value);
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs rounded-xl transition-all shadow-md"
                >
                  📥 Extract FEN & Solution Moves from PGN
                </button>
                {fenError && <p className="text-[10px] text-red-400 font-semibold">⚠️ {fenError}</p>}
                {fenSuccess && <p className="text-[10px] text-emerald-400 font-semibold">{fenSuccess}</p>}
              </div>
            )}

            {/* Full Board Editor */}
            <BoardEditorWorkspace
              initialFen={rawFen}
              onFenChange={(newFen) => {
                setRawFen(newFen);
                syncGameInstance(newFen, solutionMoves);
              }}
            />

            {/* Next Step */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={handleGoToRecordMoves}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all flex items-center gap-2"
              >
                <span>Confirm Position</span>
                <span>→ Record Moves</span>
              </button>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 2: RECORD SOLUTION MOVES (Dual Mode A2)
        ════════════════════════════════════════════════════════════ */}
        {step === 'record' && (
          <div className="p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              {/* Board */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 space-y-3 flex flex-col items-center">
                {/* Board header */}
                <div className="flex items-center justify-between w-full text-xs">
                  <span className="font-bold text-amber-300 flex items-center gap-1.5">
                    <span>♟️</span>
                    <span>{orientation === 'white' ? 'White' : 'Black'} to move</span>
                  </span>
                  <div className="flex gap-1.5">
                    <button type="button"
                      onClick={() => setOrientation((o) => o === 'white' ? 'black' : 'white')}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition border border-slate-700">
                      🔄 Flip
                    </button>
                    {solutionMoves.length > 0 && (
                      <button type="button"
                        onClick={handleUndoLastMove}
                        className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-bold rounded-lg transition border border-amber-500/30">
                        ↩ Undo Move
                      </button>
                    )}
                    <button type="button"
                      onClick={handleResetMoves}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold rounded-lg transition border border-slate-700">
                      ↺ Reset
                    </button>
                  </div>
                </div>

                {/* Board */}
                <div className="w-full aspect-square max-w-[380px] rounded-xl overflow-hidden shadow-2xl border border-slate-800">
                  <Chessboard
                    key={boardKey}
                    id="solution-recorder-board"
                    position={currentFen}
                    onPieceDrop={(s: string, t: string) => handlePieceDrop(s, t)}
                    boardOrientation={orientation}
                    customBoardStyle={{ borderRadius: '12px' }}
                    customDarkSquareStyle={{ backgroundColor: '#334155' }}
                    customLightSquareStyle={{ backgroundColor: '#94A3B8' }}
                  />
                </div>

                {/* Current FEN readout */}
                <div className="w-full bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-[10px] font-mono text-amber-300 break-all select-all">
                  <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-sans font-bold mb-0.5">Current Position FEN:</span>
                  {currentFen}
                </div>
              </div>

              {/* Solution Moves Panel (Dual Mode: Board Drag + Manual Type Input Selection A2) */}
              <div className="space-y-4 flex flex-col">
                <div>
                  <div className="flex items-center justify-between text-xs mb-2">
                    <span className="font-bold text-slate-300">
                      Recorded Solution Moves ({solutionMoves.length})
                    </span>
                    {solutionMoves.length > 0 && (
                      <button type="button" onClick={() => { setSolutionMoves([]); syncGameInstance(rawFen); }}
                        className="text-[10px] text-rose-400 hover:underline font-bold">
                        Clear All
                      </button>
                    )}
                  </div>

                  <div className="min-h-[80px] p-3 bg-slate-950 border border-slate-800 rounded-xl flex flex-wrap gap-1.5 items-start content-start">
                    {solutionMoves.length === 0 ? (
                      <div className="flex items-center justify-center w-full h-[60px]">
                        <span className="text-[11px] text-slate-500 italic text-center">
                          💡 Drag pieces on board OR type SAN move below
                        </span>
                      </div>
                    ) : (
                      solutionMoves.map((m, idx) => (
                        <span key={idx}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold rounded-lg">
                          <span>{idx + 1}. {m}</span>
                          <button type="button" onClick={() => handleRemoveMove(idx)}
                            className="hover:text-rose-400 text-slate-500 ml-0.5 text-[10px] leading-none">✕</button>
                        </span>
                      ))
                    )}
                  </div>

                  {/* Manual SAN Move Input Box (Selection A2) */}
                  <form onSubmit={handleAddManualMove} className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={manualMoveText}
                      onChange={(e) => setManualMoveText(e.target.value)}
                      placeholder="Type move e.g. Qe8#, Re8#, e4…"
                      className="flex-1 p-2 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-amber-200 focus:outline-none focus:border-amber-400"
                    />
                    <button
                      type="submit"
                      className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl transition-all"
                    >
                      + Add Move
                    </button>
                  </form>

                  {solutionMoves.length > 0 && (
                    <p className="text-[10px] text-emerald-400 mt-1.5 font-semibold">
                      ✅ {solutionMoves.length} move{solutionMoves.length !== 1 ? 's' : ''} recorded — {Math.ceil(solutionMoves.length / 2)} full move{Math.ceil(solutionMoves.length / 2) !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>

                {/* Instructions */}
                <div className="bg-slate-950 border border-amber-500/20 rounded-xl p-3 space-y-1.5 text-[11px] text-slate-400">
                  <p className="font-bold text-amber-300 text-xs">How to record moves:</p>
                  <p>1. Drag pieces on board OR type SAN moves in the text input box above (e.g. <code className="text-amber-400">Qe8#</code>).</p>
                  <p>2. Moves are stored in standard SAN notation for student readability.</p>
                  <p>3. Use ↩ Undo Move or ✕ on any move chip to remove moves.</p>
                  <p>4. When done, click <b className="text-amber-300">Continue to Details →</b></p>
                </div>

                {/* Navigation */}
                <div className="flex gap-3 mt-auto pt-2">
                  <button type="button" onClick={() => setStep('position')}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors">
                    ← Back to Position
                  </button>
                  <button type="button"
                    onClick={() => {
                      if (solutionMoves.length === 0) {
                        setErrorMsg('Record at least one solution move before proceeding.');
                        return;
                      }
                      setErrorMsg('');
                      setStep('details');
                    }}
                    className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all flex items-center justify-center gap-1.5">
                    <span>Continue to Details</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            STEP 3: METADATA & SAVE
        ════════════════════════════════════════════════════════════ */}
        {step === 'details' && (
          <form onSubmit={handleSubmit} className="p-5 space-y-5 overflow-y-auto max-h-[72vh]">
            {/* Solution summary */}
            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-3">
              <span className="text-2xl">✅</span>
              <div className="text-xs">
                <p className="font-bold text-emerald-300">Solution recorded: {solutionMoves.join(' → ')}</p>
                <p className="text-slate-400 mt-0.5">
                  FEN: <span className="font-mono text-amber-300 text-[10px]">{rawFen}</span>
                </p>
              </div>
              <button type="button" onClick={() => setStep('record')}
                className="ml-auto text-[10px] text-amber-400 hover:underline font-bold shrink-0">
                ✏️ Edit Moves
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Puzzle Title <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Back-Rank Checkmate, Scholar's Mate Threat"
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Track / Chapter */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1">Target Skill Track <span className="text-red-400">*</span></label>
                <select value={track} onChange={(e) => setTrack(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-bold">
                  <option value="pre_beginner">🌱 Pre-Beginner (400-800)</option>
                  <option value="beginner">☘️ Beginner (800-1200)</option>
                  <option value="intermediate">🔥 Intermediate (1200-1600)</option>
                  <option value="advanced">⚡ Advanced (1600-2000)</option>
                  <option value="master">👑 Master (2000+)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-amber-300 mb-1">Chapter (Optional)</label>
                <input type="text" value={chapterName} onChange={(e) => setChapterName(e.target.value)}
                  placeholder="e.g. Chapter 1: Piece Captures"
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400" />
              </div>
            </div>

            {/* Theme / Difficulty / Rating */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Tactical Theme <span className="text-red-400">*</span></label>
                <select value={theme} onChange={(e) => setTheme(e.target.value)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400">
                  <option value="mateIn1">Checkmate in 1</option>
                  <option value="mateIn2">Checkmate in 2</option>
                  <option value="mateIn3">Checkmate in 3</option>
                  <option value="fork">Fork</option>
                  <option value="pin">Pin & Skewer</option>
                  <option value="backRank">Back-Rank Mate</option>
                  <option value="sacrifice">Sacrifice</option>
                  <option value="discoveredAttack">Discovered Attack</option>
                  <option value="endgame">Endgame</option>
                  <option value="opening">Opening Tactic</option>
                  <option value="general">General Tactics</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Difficulty <span className="text-red-400">*</span></label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-semibold">
                  <option value="pre_beginner">Pre-Beginner (&lt;800)</option>
                  <option value="beginner">Beginner (800-1200)</option>
                  <option value="intermediate">Intermediate (1200-1600)</option>
                  <option value="advanced">Advanced (1600-2000)</option>
                  <option value="expert">Expert (1900-2200)</option>
                  <option value="master">Master (&gt;2200)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Puzzle Rating</label>
                <input type="number" min={400} max={3200} step={50} value={rating}
                  onChange={(e) => setRating(Number(e.target.value))}
                  className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono text-white focus:outline-none focus:border-amber-400" />
              </div>
            </div>

            {/* Hint */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Hint #1 (Optional)</label>
              <input type="text" value={hint1} onChange={(e) => setHint1(e.target.value)}
                placeholder="e.g. Look for an undefended piece or a back-rank weakness…"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400" />
            </div>

            {/* Explanation */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Explanation / Solution Notes (Optional)</label>
              <textarea rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)}
                placeholder="Detailed explanation of the tactic and why the solution works…"
                className="w-full p-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 resize-none" />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between gap-3 border-t border-slate-800 pt-4">
              <button type="button" onClick={() => setStep('record')}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors">
                ← Back
              </button>
              <div className="flex gap-3">
                <button type="button" onClick={onClose}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting}
                  className="px-7 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all duration-200 active:scale-95 disabled:opacity-50 flex items-center gap-2">
                  {submitting ? (
                    <><span className="animate-spin text-sm">⏳</span><span>Saving…</span></>
                  ) : (
                    <>💾 Save to Puzzle Bank</>
                  )}
                </button>
              </div>
            </div>
          </form>
        )}

      </div>
    </div>
  );
}
