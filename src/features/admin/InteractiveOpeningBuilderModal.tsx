'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import Modal from '@/components/ui/Modal';
import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

// ── Built-in Fast ECO Detection Dictionary ─────────────────────────────────────
interface EcoDef {
  prefix: string; // space-separated SAN moves, e.g. "e4 e5 Nf3 Nc6 Bc4"
  eco: string;
  name: string;
}

const ECO_DICTIONARY: EcoDef[] = [
  { prefix: 'e4 e5 Nf3 Nc6 Bc4 Bc5', eco: 'C53', name: 'Italian Game: Giuoco Piano' },
  { prefix: 'e4 e5 Nf3 Nc6 Bc4 Nf6', eco: 'C55', name: 'Italian Game: Two Knights Defense' },
  { prefix: 'e4 e5 Nf3 Nc6 Bc4', eco: 'C50', name: 'Italian Game' },
  { prefix: 'e4 e5 Nf3 Nc6 Bb5 a6', eco: 'C68', name: 'Ruy Lopez: Morphy Defense' },
  { prefix: 'e4 e5 Nf3 Nc6 Bb5', eco: 'C60', name: 'Ruy Lopez (Spanish Opening)' },
  { prefix: 'e4 e5 Nf3 Nf6', eco: 'C42', name: 'Petrov Defense' },
  { prefix: 'e4 e5 f4', eco: 'C30', name: "King's Gambit" },
  { prefix: 'e4 e5 Nc3', eco: 'C25', name: 'Vienna Game' },
  { prefix: 'e4 e5 d4', eco: 'C21', name: 'Center Game' },
  { prefix: 'e4 c5 Nf3 d6 d4 cxd4 Nxd4 Nf6 Nc3 a6', eco: 'B90', name: 'Sicilian Defense: Najdorf Variation' },
  { prefix: 'e4 c5 Nf3 Nc6', eco: 'B30', name: 'Sicilian Defense: Old Sicilian' },
  { prefix: 'e4 c5 Nf3 e6', eco: 'B40', name: 'Sicilian Defense: French Variation' },
  { prefix: 'e4 c5 c3', eco: 'B22', name: 'Sicilian Defense: Alapin Variation' },
  { prefix: 'e4 c5', eco: 'B20', name: 'Sicilian Defense' },
  { prefix: 'e4 e6 d4 d5', eco: 'C00', name: 'French Defense' },
  { prefix: 'e4 c6 d4 d5', eco: 'B10', name: 'Caro-Kann Defense' },
  { prefix: 'e4 d5 exd5 Qxd5', eco: 'B01', name: 'Scandinavian Defense' },
  { prefix: 'e4 d6 d4 Nf6', eco: 'B07', name: 'Pirc Defense' },
  { prefix: 'e4 Nf6', eco: 'B02', name: "Alekhine's Defense" },
  { prefix: 'd4 d5 c4 e6', eco: 'D30', name: "Queen's Gambit Declined" },
  { prefix: 'd4 d5 c4 c6', eco: 'D10', name: 'Slav Defense' },
  { prefix: 'd4 d5 c4 dxc4', eco: 'D20', name: "Queen's Gambit Accepted" },
  { prefix: 'd4 d5 c4', eco: 'D06', name: "Queen's Gambit" },
  { prefix: 'd4 d5 Nf3 Nf6 Bf4', eco: 'D02', name: 'London System' },
  { prefix: 'd4 Nf6 c4 g6 Nc3 Bg7', eco: 'E60', name: "King's Indian Defense" },
  { prefix: 'd4 Nf6 c4 e6 Nc3 Bb4', eco: 'E20', name: 'Nimzo-Indian Defense' },
  { prefix: 'd4 Nf6 c4 e6 g3', eco: 'E00', name: 'Catalan Opening' },
  { prefix: 'd4 f5', eco: 'A80', name: 'Dutch Defense' },
  { prefix: 'c4 e5', eco: 'A20', name: 'English Opening: King’s English' },
  { prefix: 'c4', eco: 'A10', name: 'English Opening' },
  { prefix: 'Nf3 d5', eco: 'A06', name: 'Réti Opening' },
  { prefix: 'Nf3', eco: 'A04', name: 'Zukertort / Réti Opening' },
];

function detectEco(sanMoves: string[]): { eco: string; name: string } {
  const moveStr = sanMoves.join(' ');
  // Find longest matching prefix
  for (const item of ECO_DICTIONARY) {
    if (moveStr.startsWith(item.prefix)) {
      return { eco: item.eco, name: item.name };
    }
  }
  if (sanMoves.length > 0) {
    return { eco: 'A00', name: 'Custom Academy Line' };
  }
  return { eco: '', name: '' };
}

interface InteractiveOpeningBuilderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

type ActiveKitTab = 'core' | 'traps' | 'model';

export default function InteractiveOpeningBuilderModal({
  isOpen,
  onClose,
  onCreated,
}: InteractiveOpeningBuilderModalProps) {
  const gameRef = useRef<Chess>(new Chess());
  const [boardFen, setBoardFen] = useState(gameRef.current.fen());
  const [sanMoves, setSanMoves] = useState<string[]>([]);
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');

  // Modular Kit Tab
  const [activeTab, setActiveTab] = useState<ActiveKitTab>('core');

  // Metadata Form
  const [ecoCode, setEcoCode] = useState('C50');
  const [openingName, setOpeningName] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [color, setColor] = useState<'white' | 'black' | 'both'>('white');
  const [description, setDescription] = useState('');

  // Tab 2: Traps
  const [trapTitle, setTrapTitle] = useState('');
  const [trapPgn, setTrapPgn] = useState('');
  const [trapDescription, setTrapDescription] = useState('');

  // Tab 3: Model Game
  const [modelTitle, setModelTitle] = useState('');
  const [modelPgn, setModelPgn] = useState('');
  const [modelDescription, setModelDescription] = useState('');

  // Submission state
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Reset board
  const handleResetBoard = useCallback(() => {
    gameRef.current = new Chess();
    setBoardFen(gameRef.current.fen());
    setSanMoves([]);
    setErrorMsg('');
  }, []);

  // Take back move
  const handleTakeback = useCallback(() => {
    gameRef.current.undo();
    setBoardFen(gameRef.current.fen());
    const hist = gameRef.current.history();
    setSanMoves(hist);
    const det = detectEco(hist);
    if (det.eco) setEcoCode(det.eco);
    if (det.name && !openingName) setOpeningName(det.name);
  }, [openingName]);

  // Handle move on board
  const handlePieceDrop = useCallback((sourceSquare: string, targetSquare: string): boolean => {
    try {
      const move = gameRef.current.move({
        from: sourceSquare as any,
        to: targetSquare as any,
        promotion: 'q',
      });
      if (!move) return false;

      setBoardFen(gameRef.current.fen());
      const hist = gameRef.current.history();
      setSanMoves(hist);

      // Auto-detect ECO and name
      const detected = detectEco(hist);
      if (detected.eco) {
        setEcoCode(detected.eco);
      }
      if (detected.name && (!openingName || openingName.startsWith('Custom'))) {
        setOpeningName(detected.name);
      }
      return true;
    } catch {
      return false;
    }
  }, [openingName]);

  // Format PGN string
  const formatPgn = (moves: string[]) => {
    let pgn = '';
    for (let i = 0; i < moves.length; i++) {
      if (i % 2 === 0) {
        pgn += `${Math.floor(i / 2) + 1}. `;
      }
      pgn += `${moves[i]} `;
    }
    return pgn.trim();
  };

  // Submit Handler
  const handleSave = async () => {
    if (!openingName.trim()) {
      setErrorMsg('Please enter an opening name.');
      return;
    }
    const currentPgn = formatPgn(sanMoves);
    if (!currentPgn) {
      setErrorMsg('Please play at least the first opening moves on the chessboard.');
      return;
    }

    setIsSaving(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload = {
        ecoCode,
        name: openingName.trim(),
        color,
        difficulty,
        description: description.trim() || `Official ChessHub Academy Opening Kit: ${openingName} (${ecoCode})`,
        mainLinePgn: currentPgn,
        trapTitle: trapTitle.trim() || undefined,
        trapPgn: trapPgn.trim() || undefined,
        trapDescription: trapDescription.trim() || undefined,
        modelGameTitle: modelTitle.trim() || undefined,
        modelGamePgn: modelPgn.trim() || undefined,
        modelGameDescription: modelDescription.trim() || undefined,
      };

      const res = await fetch('/api/admin/openings/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error || 'Failed to save opening.');
        setIsSaving(false);
        return;
      }

      setSuccessMsg(`✅ Opening "${openingName}" and 3-Part Modular Kit published to Academy Library!`);
      setTimeout(() => {
        onCreated?.();
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Interactive Opening Builder & Auto-ECO Recorder" maxWidthClass="max-w-4xl">
      <div className="space-y-4">
        {/* Banner / Instructions */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">♟️</span>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                Interactive Board Move Recorder
                {ecoCode && (
                  <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-extrabold border border-emerald-500/30">
                    ECO: {ecoCode}
                  </span>
                )}
              </div>
              <div className="text-[11px] text-slate-400">
                Play moves on the board. Moves are recorded in real-time with auto-ECO detection.
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleTakeback}
              disabled={sanMoves.length === 0}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg disabled:opacity-40 transition-colors"
            >
              ↩ Undo Move
            </button>
            <button
              onClick={handleResetBoard}
              className="px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg transition-colors"
            >
              🔄 Reset Board
            </button>
          </div>
        </div>

        {/* 3-Part Modular Kit Navigation Tabs */}
        <div className="flex border-b border-slate-800 gap-1 text-xs">
          <button
            onClick={() => setActiveTab('core')}
            className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'core'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>📖 Part 1: Core Master Line</span>
            {sanMoves.length > 0 && (
              <span className="bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded text-[10px]">
                {sanMoves.length} moves
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('traps')}
            className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'traps'
                ? 'border-amber-500 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🪤 Part 2: Opening Traps & Tactics</span>
            {trapPgn && (
              <span className="bg-amber-500/20 text-amber-400 px-1.5 py-0.2 rounded text-[10px]">Ready</span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('model')}
            className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === 'model'
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>🏆 Part 3: GM Model Game</span>
            {modelPgn && (
              <span className="bg-blue-500/20 text-blue-400 px-1.5 py-0.2 rounded text-[10px]">Ready</span>
            )}
          </button>
        </div>

        {/* Main Workspace: Board Left + Controls Right */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Interactive Chessboard */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-[380px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 bg-slate-900">
              <ChessboardComponent
                position={boardFen}
                onPieceDrop={handlePieceDrop}
                boardOrientation={boardOrientation}
                customBoardStyle={{
                  borderRadius: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
                }}
                customDarkSquareStyle={{ backgroundColor: '#475569' }}
                customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
              />
            </div>

            {/* Board Sub-controls */}
            <div className="w-full max-w-[380px] flex items-center justify-between mt-2 px-1">
              <div className="text-[11px] text-slate-400">
                Turn: <strong className="text-white capitalize">{gameRef.current.turn() === 'w' ? 'White' : 'Black'}</strong>
              </div>
              <button
                type="button"
                onClick={() => setBoardOrientation((o) => (o === 'white' ? 'black' : 'white'))}
                className="text-[11px] text-slate-400 hover:text-white font-medium flex items-center gap-1"
              >
                🔄 Flip Orientation ({boardOrientation})
              </button>
            </div>

            {/* Live Recorded Move Sequence Display */}
            <div className="w-full max-w-[380px] mt-3 p-3 bg-slate-900 border border-slate-800 rounded-xl text-xs">
              <div className="font-bold text-slate-300 mb-1 flex items-center justify-between">
                <span>Recorded Sequence</span>
                <span className="text-[10px] text-slate-500">{sanMoves.length} moves recorded</span>
              </div>
              {sanMoves.length === 0 ? (
                <div className="text-slate-500 italic text-[11px]">Make moves on the board above to record…</div>
              ) : (
                <div className="font-mono text-emerald-400 text-[11px] leading-relaxed break-words">
                  {formatPgn(sanMoves)}
                </div>
              )}
            </div>
          </div>

          {/* Right: Tab-Specific Content */}
          <div className="lg:col-span-6 space-y-3.5">
            {activeTab === 'core' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">ECO Code</label>
                    <input
                      type="text"
                      value={ecoCode}
                      onChange={(e) => setEcoCode(e.target.value)}
                      placeholder="e.g. C50"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-white"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Opening Name</label>
                    <input
                      type="text"
                      value={openingName}
                      onChange={(e) => setOpeningName(e.target.value)}
                      placeholder="e.g. Italian Game: Giuoco Piano"
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Repertoire Color</label>
                    <select
                      value={color}
                      onChange={(e: any) => setColor(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="white">White Repertoire</option>
                      <option value="black">Black Repertoire</option>
                      <option value="both">Both / General</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-400 mb-1">Student Level</label>
                    <select
                      value={difficulty}
                      onChange={(e: any) => setDifficulty(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Strategic Overview & Coach Notes</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    placeholder="Describe key ideas: e.g. Rapid development, fight for d4/e5 center control, targeting the weak f7 square..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'traps' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Trap / Trick Name</label>
                  <input
                    type="text"
                    value={trapTitle}
                    onChange={(e) => setTrapTitle(e.target.value)}
                    placeholder="e.g. The Fried Liver Attack / Blackburne Shilling Trap"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Trap Move Sequence (PGN)</label>
                  <input
                    type="text"
                    value={trapPgn}
                    onChange={(e) => setTrapPgn(e.target.value)}
                    placeholder="e.g. 1. e4 e5 2. Nf3 Nc6 3. Bc4 Nd4 4. Nxe5 Qg5!"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-amber-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Tactical Pitfall Explanation</label>
                  <textarea
                    value={trapDescription}
                    onChange={(e) => setTrapDescription(e.target.value)}
                    rows={3}
                    placeholder="Explain what Black/White blunders and how the tactic refutes the careless move..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'model' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Model Game Title</label>
                  <input
                    type="text"
                    value={modelTitle}
                    onChange={(e) => setModelTitle(e.target.value)}
                    placeholder="e.g. Kasparov vs. Anand (World Championship 1995)"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Model Game Moves (PGN)</label>
                  <textarea
                    value={modelPgn}
                    onChange={(e) => setModelPgn(e.target.value)}
                    rows={3}
                    placeholder="Paste master game PGN moves..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs font-mono text-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-400 mb-1">Middlegame Lessons from this Game</label>
                  <textarea
                    value={modelDescription}
                    onChange={(e) => setModelDescription(e.target.value)}
                    rows={2}
                    placeholder="Key strategic takeaways from this grandmaster game..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500"
                  />
                </div>
              </div>
            )}

            {/* Error or Success notification */}
            {errorMsg && (
              <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                ⚠️ {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs">
                {successMsg}
              </div>
            )}

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving || sanMoves.length === 0}
                className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center gap-1.5"
              >
                {isSaving ? 'Publishing Kit…' : '💾 Publish 3-Part Opening Kit'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
