'use client';

import React, { useState, useMemo } from 'react';
import { Chess } from 'chess.js';
import { DEFAULT_INITIAL_FEN } from '@/lib/classroom-v2/constants';

interface ClassroomPositionLoaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadGame: (pgn: string, title?: string) => Promise<boolean>;
}

interface OpeningItem {
  id: string;
  name: string;
  eco: string;
  moves: string;
  category: string;
  description: string;
}

const POPULAR_OPENINGS: OpeningItem[] = [
  {
    id: 'ruy-lopez',
    name: 'Ruy Lopez (Spanish Opening)',
    eco: 'C60',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 4. Ba4 Nf6 5. O-O Be7 6. Re1 b5 7. Bb3 d6',
    category: 'Open Games',
    description: 'The premier classical king-pawn opening fighting for central pressure.',
  },
  {
    id: 'italian-game',
    name: 'Italian Game (Giuoco Piano)',
    eco: 'C50',
    moves: '1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d3 d6',
    category: 'Open Games',
    description: 'Rapid kingside piece development with sharp tactical ideas on f7.',
  },
  {
    id: 'sicilian-defense',
    name: 'Sicilian Defense (Open Classical)',
    eco: 'B20',
    moves: '1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 a6',
    category: 'Semi-Open',
    description: 'Dynamic counter-attacking defense fighting for the half-open c-file.',
  },
  {
    id: 'french-defense',
    name: 'French Defense (Winawer / Classical)',
    eco: 'C00',
    moves: '1. e4 e6 2. d4 d5 3. Nc3 Bb4 4. e5 c5 5. a3 Bxc3+ 6. bxc3',
    category: 'Semi-Open',
    description: 'Solid central pawn chain with counterplay against the white d4 center.',
  },
  {
    id: 'caro-kann',
    name: 'Caro-Kann Defense',
    eco: 'B10',
    moves: '1. e4 c6 2. d4 d5 3. Nc3 dxe4 4. Nxe4 Bf5 5. Ng3 Bg6',
    category: 'Semi-Open',
    description: 'Ultra-resilient pawn structure preserving light-squared bishop mobility.',
  },
  {
    id: 'queens-gambit',
    name: "Queen's Gambit Declined",
    eco: 'D30',
    moves: '1. d4 d5 2. c4 e6 3. Nc3 Nf6 4. Bg5 Be7 5. e3 O-O 6. Nf3 Nbd7',
    category: 'Closed Games',
    description: 'The foundation of positional queen-pawn mastery and central dominance.',
  },
  {
    id: 'kings-indian',
    name: "King's Indian Defense",
    eco: 'E60',
    moves: '1. d4 Nf6 2. c4 g6 3. Nc3 Bg7 4. e4 d6 5. Nf3 O-O 6. Be2 e5',
    category: 'Hypermodern',
    description: 'High-octane kingside attacking system beloved by Kasparov and Fischer.',
  },
  {
    id: 'nimzo-indian',
    name: 'Nimzo-Indian Defense',
    eco: 'E20',
    moves: '1. d4 Nf6 2. c4 e6 3. Nc3 Bb4 4. e3 O-O 5. Bd3 d5',
    category: 'Hypermodern',
    description: 'Pinning the c3 knight to control the vital e4 square.',
  },
];

const CURRICULUM_STUDIES = [
  {
    id: 'study-1',
    title: 'Lucena Position (Endgame Golden Rule)',
    category: 'Endgames',
    difficulty: 'Intermediate',
    fen: '1K1k4/1P6/8/8/8/8/7r/5R2 w - - 0 1',
    description: 'Learn the fundamental bridge-building technique to convert winning rook endgames.',
  },
  {
    id: 'study-2',
    title: 'Philidor Position (Rook Defense Technique)',
    category: 'Endgames',
    difficulty: 'Intermediate',
    fen: '8/8/3k4/8/3K4/3R4/8/7r b - - 0 1',
    description: 'The quintessential 6th-rank cut-off and rear check drawing defense.',
  },
  {
    id: 'study-3',
    title: "The Opera Game (Paul Morphy 1858)",
    category: 'Master Games',
    difficulty: 'All Levels',
    pgn: '1. e4 e5 2. Nf3 d6 3. d4 Bg4 4. dxe5 Bxf3 5. Qxf3 dxe5 6. Bc4 Nf6 7. Qb3 Qe7 8. Nc3 c6 9. Bg5 b5 10. Nxb5 cxb5 11. Bxb5+ Nbd7 12. O-O-O Rd8 13. Rxd7 Rxd7 14. Rd1 Qe6 15. Bxd7+ Nxd7 16. Qb8+ Nxb8 17. Rd8# 1-0',
    description: 'The greatest instructional masterpiece on rapid piece development and central lines.',
  },
  {
    id: 'study-4',
    title: 'Tactical Pin & Royal Decoy',
    category: 'Tactics',
    difficulty: 'Advanced',
    fen: 'r1b1kb1r/pp3ppp/2n5/2pqp3/8/2PP1N2/PP3PPP/RNBQKB1R w KQkq - 0 7',
    description: 'Examine candidate moves exploiting pinned pieces and queen mobility.',
  },
];

export default function ClassroomPositionLoaderModal({
  isOpen,
  onClose,
  onLoadGame,
}: ClassroomPositionLoaderModalProps) {
  const [activeTab, setActiveTab] = useState<'paste' | 'openings' | 'curriculum'>('paste');
  const [customInput, setCustomInput] = useState('');
  const [gameTitle, setGameTitle] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Auto-detection of FEN vs PGN
  const validationStatus = useMemo(() => {
    const trimmed = customInput.trim();
    if (!trimmed) return null;

    // Check if valid FEN
    try {
      const c = new Chess(trimmed);
      if (c.fen()) {
        const turn = c.turn() === 'w' ? 'White' : 'Black';
        return { type: 'FEN' as const, valid: true, message: `Valid FEN position (${turn} to move)` };
      }
    } catch {}

    // Check if valid PGN
    try {
      const c = new Chess();
      c.loadPgn(trimmed);
      const moves = c.history();
      if (moves.length > 0) {
        return { type: 'PGN' as const, valid: true, message: `Valid PGN Game (${moves.length} moves parsed)` };
      }
    } catch {}

    return { type: 'INVALID' as const, valid: false, message: 'Unrecognized position format (enter valid FEN or PGN)' };
  }, [customInput]);

  if (!isOpen) return null;

  const handleLoadCustom = async () => {
    if (!customInput.trim() || isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const success = await onLoadGame(customInput.trim(), gameTitle.trim() || 'Custom Position');
      if (success) {
        onClose();
      } else {
        setErrorMessage('Failed to load position to classroom board.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error loading position.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadOpening = async (opening: OpeningItem) => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const success = await onLoadGame(opening.moves, opening.name);
      if (success) {
        onClose();
      } else {
        setErrorMessage('Failed to load opening to classroom.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error loading opening.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLoadStudy = async (study: typeof CURRICULUM_STUDIES[0]) => {
    if (isLoading) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const payload = 'fen' in study && study.fen ? study.fen : (study as any).pgn || '';
      const success = await onLoadGame(payload, study.title);
      if (success) {
        onClose();
      } else {
        setErrorMessage('Failed to load curriculum study.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Error loading curriculum study.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 animate-in fade-in select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">♟️</span>
            <div>
              <h2 className="text-sm sm:text-base font-black text-white">
                Load Board Position & Game Study
              </h2>
              <p className="text-[11px] text-slate-400">
                Instantly syncs new position with all connected students
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center text-sm font-bold transition-colors cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-5 pt-3 bg-slate-950/60 border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📋 Paste PGN / FEN
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('openings')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'openings'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚡ Opening Repertoires ({POPULAR_OPENINGS.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('curriculum')}
            className={`px-3 py-2 text-xs font-bold rounded-t-xl transition-all cursor-pointer ${
              activeTab === 'curriculum'
                ? 'bg-slate-900 text-amber-400 border-t-2 border-amber-500 shadow-xs'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            📚 Academy Studies ({CURRICULUM_STUDIES.length})
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {errorMessage && (
            <div className="p-3 bg-rose-950/60 border border-rose-800/60 rounded-xl text-rose-300 text-xs font-bold flex items-center gap-2">
              <span>⚠️</span>
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: PASTE PGN / FEN */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">
                  Paste PGN Game or FEN Position String
                </label>
                <textarea
                  rows={4}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  placeholder="Paste FEN (e.g. r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3)&#10;or full PGN (e.g. 1. e4 e5 2. Nf3 Nc6 3. Bb5 a6...)"
                  className="w-full bg-slate-950 border border-slate-750 focus:border-amber-500 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-colors font-mono resize-none"
                />

                {/* Live validation feedback */}
                {validationStatus && (
                  <div className={`mt-1.5 text-[11px] font-bold flex items-center gap-1.5 ${
                    validationStatus.valid ? 'text-emerald-400' : 'text-rose-400'
                  }`}>
                    <span>{validationStatus.valid ? '✓' : '✗'}</span>
                    <span>{validationStatus.message}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Position / Study Title (Optional)
                </label>
                <input
                  type="text"
                  value={gameTitle}
                  onChange={(e) => setGameTitle(e.target.value)}
                  placeholder="e.g. Masterclass Tactical Study / Chapter 3"
                  className="w-full bg-slate-950 border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-colors"
                />
              </div>

              {/* Quick Presets */}
              <div className="space-y-1.5">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                  Quick Position Presets:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInput(DEFAULT_INITIAL_FEN);
                      setGameTitle('Standard Initial Position');
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    ♟️ Initial Board
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInput('1K1k4/1P6/8/8/8/8/7r/5R2 w - - 0 1');
                      setGameTitle('Lucena Endgame Position');
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    👑 Lucena Position
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCustomInput('r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3');
                      setGameTitle("Scholar's Mate Defense Drill");
                    }}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 transition-colors cursor-pointer"
                  >
                    🛡️ Scholar&apos;s Mate Defense
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLoadCustom}
                disabled={!customInput.trim() || isLoading}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>{isLoading ? 'Syncing to Students…' : '🚀 Load Position to Live Board'}</span>
              </button>
            </div>
          )}

          {/* TAB 2: OPENINGS REPERTOIRE */}
          {activeTab === 'openings' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400">
                Select any opening system to instantly load its move tree onto the live board for instruction:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {POPULAR_OPENINGS.map((op) => (
                  <div
                    key={op.id}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-amber-500/50 rounded-xl space-y-2 transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-xs text-white group-hover:text-amber-400 transition-colors">
                        {op.name}
                      </span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-amber-500/10 text-amber-300 rounded border border-amber-500/20">
                        {op.eco}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                      {op.description}
                    </p>
                    <div className="pt-1 flex items-center justify-between border-t border-slate-850">
                      <span className="text-[10px] text-slate-500 font-mono truncate max-w-[140px]">
                        {op.moves.split(' ').slice(0, 6).join(' ')}…
                      </span>
                      <button
                        type="button"
                        onClick={() => handleLoadOpening(op)}
                        disabled={isLoading}
                        className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white text-[10px] font-extrabold rounded-lg transition-all shadow cursor-pointer"
                      >
                        {isLoading ? 'Loading…' : 'Load Opening'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: ACADEMY STUDIES */}
          {activeTab === 'curriculum' && (
            <div className="space-y-2.5">
              <p className="text-xs text-slate-400">
                Curated academy endgame drills, classical games, and tactical motifs:
              </p>
              <div className="space-y-2">
                {CURRICULUM_STUDIES.map((study) => (
                  <div
                    key={study.id}
                    className="p-3 bg-slate-950 border border-slate-800 hover:border-emerald-500/40 rounded-xl flex items-center justify-between gap-3 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-white">{study.title}</span>
                        <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-500/10 text-emerald-300 rounded">
                          {study.category}
                        </span>
                        <span className="text-[9px] font-bold text-slate-500">
                          {study.difficulty}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{study.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleLoadStudy(study)}
                      disabled={isLoading}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-extrabold rounded-xl transition-all shadow shrink-0 cursor-pointer"
                    >
                      {isLoading ? 'Loading…' : 'Load Study'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
