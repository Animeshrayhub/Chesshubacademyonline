'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import DashboardIcon from './DashboardIcon';
import Button from '@/components/ui/Button';
import { customChessPieces } from './ChessPieces';
import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';
import { requestGameReviewAction } from '@/actions/gameReview';
import type { AiGameReviewResult } from '@/lib/gameReview/aiGameReviewService';
import AiGameReviewCard from '@/features/student/AiGameReviewCard';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

interface SavedGame {
  id: string;
  title: string;
  pgn: string | null;
  lichess_url: string | null;
  created_at: string;
}

interface GameRepositoryViewProps {
  initialGames: SavedGame[];
}

const SAMPLE_GAMES = [
  {
    name: "Scholar's Mate Demo",
    color: 'white' as const,
    pgn: `[Event "Scholar's Mate Demo"]
[Site "ChessHub Academy"]
[Date "2026.07.28"]
[White "Student Alex"]
[Black "Opponent"]
[Result "1-0"]

1. e4 e5 2. Qh5 Nc6 3. Bc4 Nf6 4. Qxf7# 1-0`,
  },
  {
    name: "Italian Game Tactics",
    color: 'white' as const,
    pgn: `[Event "Italian Game Tactics"]
[Site "ChessHub Academy"]
[Date "2026.07.28"]
[White "Student Mia"]
[Black "Opponent"]
[Result "1-0"]

1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5 4. c3 Nf6 5. d4 exd4 6. cxd4 Bb4+ 7. Bd2 Bxd2+ 8. Nbxd2 d5 9. exd5 Nxd5 10. Qb3 Nce7 11. O-O O-O 12. Rfe1 c6 13. a4 1-0`,
  },
  {
    name: "Sicilian Dragon Attack",
    color: 'black' as const,
    pgn: `[Event "Sicilian Dragon Attack"]
[Site "ChessHub Academy"]
[Date "2026.07.28"]
[White "Opponent"]
[Black "Student Leo"]
[Result "0-1"]

1. e4 c5 2. Nf3 d6 3. d4 cxd4 4. Nxd4 Nf6 5. Nc3 g6 6. Be3 Bg7 7. f3 O-O 8. Qd2 Nc6 9. Bc4 Bd7 10. O-O-O Rc8 11. Bb3 Ne5 12. h4 h5 13. Bg5 Rc5 14. g4 hxg4 15. f4 Nc4 0-1`,
  },
];

export default function GameRepositoryView({ initialGames }: GameRepositoryViewProps) {
  const [games, setGames] = useState<SavedGame[]>(initialGames);
  const [activeGame, setActiveGame] = useState<SavedGame | null>(null);

  // Left Panel Modes: 'list' | 'add-form' | 'ai-studio'
  const [panelMode, setPanelMode] = useState<'list' | 'add-form' | 'ai-studio'>('list');

  // Active Game Detail Tab: 'board' | 'ai-review'
  const [gameDetailTab, setGameDetailTab] = useState<'board' | 'ai-review'>('board');

  // Add Game Form States
  const [title, setTitle] = useState('');
  const [pgn, setPgn] = useState('');
  const [lichessUrl, setLichessUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Interactive Analysis Board States
  const [analysisFen, setAnalysisFen] = useState('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
  const [movesList, setMovesList] = useState<string[]>([]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const gameInstanceRef = useRef<Chess>(new Chess());

  // Stockfish Analysis States
  const [bestMove, setBestMove] = useState('');
  const [evalScore, setEvalScore] = useState('');
  const [analyzing, setAnalyzing] = useState(false);
  const stockfishRef = useRef<Worker | null>(null);

  // Active Game AI Review State
  const [gameUserColor, setGameUserColor] = useState<'white' | 'black'>('white');
  const [gameReviewLoading, setGameReviewLoading] = useState(false);
  const [gameReviewResult, setGameReviewResult] = useState<AiGameReviewResult | null>(null);
  const [gameReviewError, setGameReviewError] = useState('');

  // AI Studio Standalone State
  const [studioPgn, setStudioPgn] = useState(SAMPLE_GAMES[0].pgn);
  const [studioColor, setStudioColor] = useState<'white' | 'black'>('white');
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioResult, setStudioResult] = useState<AiGameReviewResult | null>(null);
  const [studioError, setStudioError] = useState('');

  // Clean up stockfish
  useEffect(() => {
    return () => {
      stockfishRef.current?.terminate();
    };
  }, []);

  const handleAddGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) {
      setError('Game title is required.');
      return;
    }

    if (pgn && pgn.length > 1048576) {
      setError('PGN content exceeds the 1MB safety limit.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/games', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, pgn, lichessUrl }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to save game');
      }

      const newGame = await res.json();
      setGames([newGame, ...games]);
      setTitle('');
      setPgn('');
      setLichessUrl('');
      setPanelMode('list');
      handleSelectGame(newGame);
    } catch (err: any) {
      setError(err.message || 'Error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    if (!confirm('Are you sure you want to delete this saved game?')) return;

    try {
      const res = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete game');

      setGames(games.filter((g) => g.id !== gameId));
      if (activeGame?.id === gameId) {
        setActiveGame(null);
      }
    } catch {
      alert('Failed to delete game.');
    }
  };

  const handleSelectGame = (game: SavedGame) => {
    setActiveGame(game);
    setPanelMode('list');
    setGameDetailTab('board');
    setBestMove('');
    setEvalScore('');
    setGameReviewResult(null);
    setGameReviewError('');

    const chess = new Chess();

    if (game.pgn) {
      try {
        const cleanPgn = game.pgn.replace(/\{[^}]*\}/g, '').replace(/\$\d+/g, '').trim();
        chess.loadPgn(cleanPgn);
        const history = chess.history();
        setMovesList(history);

        chess.reset();
        gameInstanceRef.current = chess;
        setAnalysisFen(chess.fen());
        setCurrentMoveIdx(-1);
      } catch {
        chess.reset();
        gameInstanceRef.current = chess;
        setAnalysisFen(chess.fen());
        setMovesList([]);
        setCurrentMoveIdx(-1);
      }
    } else {
      chess.reset();
      gameInstanceRef.current = chess;
      setAnalysisFen(chess.fen());
      setMovesList([]);
      setCurrentMoveIdx(-1);
    }
  };

  const navigateMove = (direction: 'prev' | 'next' | 'start' | 'end') => {
    if (!activeGame || movesList.length === 0) return;

    const chess = gameInstanceRef.current;
    let nextIdx = currentMoveIdx;

    if (direction === 'start') {
      nextIdx = -1;
    } else if (direction === 'end') {
      nextIdx = movesList.length - 1;
    } else if (direction === 'prev') {
      nextIdx = Math.max(-1, currentMoveIdx - 1);
    } else if (direction === 'next') {
      nextIdx = Math.min(movesList.length - 1, currentMoveIdx + 1);
    }

    chess.reset();
    for (let i = 0; i <= nextIdx; i++) {
      chess.move(movesList[i]);
    }

    setAnalysisFen(chess.fen());
    setCurrentMoveIdx(nextIdx);
    setBestMove('');
    setEvalScore('');
  };

  const triggerStockfishAnalysis = () => {
    if (typeof window === 'undefined' || !activeGame) return;
    setAnalyzing(true);
    setBestMove('');
    setEvalScore('');

    try {
      stockfishRef.current?.terminate();
      const worker = new Worker('/stockfish/stockfish.js');
      stockfishRef.current = worker;

      worker.onmessage = (event) => {
        const line: string = event.data;
        if (line.startsWith('info depth')) {
          const scoreMatch = line.match(/score cp (-?\d+)/);
          if (scoreMatch) {
            setEvalScore((parseInt(scoreMatch[1], 10) / 100).toFixed(2));
          }
        } else if (line.startsWith('bestmove')) {
          setBestMove(line.split(' ')[1] || 'none');
          setAnalyzing(false);
          worker.terminate();
        }
      };

      worker.postMessage('uci');
      worker.postMessage(`position fen ${analysisFen}`);
      worker.postMessage('go depth 12');
    } catch {
      setAnalyzing(false);
    }
  };

  // Run AI Review for currently selected game
  const handleRunGameAiReview = async () => {
    if (!activeGame?.pgn) {
      setGameReviewError('This saved game does not have a PGN move sequence to review.');
      return;
    }

    setGameReviewLoading(true);
    setGameReviewError('');
    setGameReviewResult(null);

    const res = await requestGameReviewAction(activeGame.pgn, gameUserColor);
    setGameReviewLoading(false);

    if (res.success) {
      setGameReviewResult(res);
    } else {
      setGameReviewError(res.error || 'Failed to generate AI Grandmaster review.');
    }
  };

  // Run AI Review inside the Studio mode
  const handleStudioAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!studioPgn.trim()) {
      setStudioError('Please paste a PGN game text or pick a sample game.');
      return;
    }

    setStudioLoading(true);
    setStudioError('');
    setStudioResult(null);

    const res = await requestGameReviewAction(studioPgn, studioColor);
    setStudioLoading(false);

    if (res.success) {
      setStudioResult(res);
      // Add to current local games list
      const autoSavedGame: SavedGame = {
        id: `temp-${Date.now()}`,
        title: `AI Review - ${res.openingName || 'Analyzed Game'}`,
        pgn: studioPgn,
        lichess_url: null,
        created_at: new Date().toISOString(),
      };
      setGames((prev) => [autoSavedGame, ...prev]);
    } else {
      setStudioError(res.error || 'Failed to process AI review.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        
        {/* Left Column: Repository Navigation & Game List */}
        <div className="xl:col-span-1 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-card p-5 space-y-4">
            
            {/* Header & Quick Action Pills */}
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                <DashboardIcon iconKey="bookOpen" className="w-4 h-4 text-amber-500" />
                <span>My Saved Games ({games.length})</span>
              </h3>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPanelMode(panelMode === 'add-form' ? 'list' : 'add-form')}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all ${
                    panelMode === 'add-form'
                      ? 'bg-amber-500 text-slate-950 shadow-gold'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {panelMode === 'add-form' ? 'Cancel' : '+ Add'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPanelMode('ai-studio');
                    setActiveGame(null);
                  }}
                  className={`text-[11px] font-bold px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 ${
                    panelMode === 'ai-studio'
                      ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                      : 'bg-purple-500/10 text-purple-600 dark:text-purple-400 hover:bg-purple-500/20 border border-purple-500/20'
                  }`}
                >
                  <span>🤖 AI Review Bot</span>
                </button>
              </div>
            </div>

            {/* Add Game Form */}
            {panelMode === 'add-form' && (
              <form onSubmit={handleAddGame} className="space-y-3 text-xs animate-fadeIn">
                {error && <div className="p-2.5 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20">{error}</div>}
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block mb-1">Game Title / Opponent</label>
                  <input
                    type="text"
                    placeholder="e.g. Kasparov vs Deep Blue, 1997"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block mb-1">Lichess URL (optional)</label>
                  <input
                    type="url"
                    placeholder="https://lichess.org/aBcDeFgH"
                    value={lichessUrl}
                    onChange={(e) => setLichessUrl(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-slate-500 uppercase font-bold tracking-wide block mb-1">PGN Move String (optional)</label>
                  <textarea
                    rows={4}
                    placeholder="1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5..."
                    value={pgn}
                    onChange={(e) => setPgn(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-900 dark:text-white font-mono text-[11px]"
                  />
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition-all shadow-gold disabled:opacity-50"
                >
                  {loading ? 'Saving Game...' : 'Save Game to Repository'}
                </button>
              </form>
            )}

            {/* Saved Games List */}
            <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
              {games.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No games saved yet. Click + Add or run the AI Review Bot to add your first game.
                </div>
              ) : (
                games.map((g) => {
                  const isSelected = activeGame?.id === g.id && panelMode !== 'ai-studio';
                  return (
                    <div
                      key={g.id}
                      onClick={() => handleSelectGame(g)}
                      className={`p-3 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 dark:bg-amber-500/10 shadow-sm'
                          : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/40'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">{g.title}</h4>
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            {new Date(g.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteGame(g.id);
                          }}
                          className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                          title="Delete Game"
                        >
                          <DashboardIcon iconKey="trash" className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap">
                        {g.lichess_url && (
                          <a
                            href={g.lichess_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="text-[9px] text-primary dark:text-sky-400 font-bold hover:underline"
                          >
                            Lichess ↗
                          </a>
                        )}
                        {g.pgn && (
                          <span className="text-[9px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-mono font-bold uppercase border border-emerald-500/20">
                            PGN
                          </span>
                        )}
                        {g.title.startsWith('AI Review') && (
                          <span className="text-[9px] text-purple-600 dark:text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded font-bold border border-purple-500/20">
                            🤖 Reviewed
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Game Workspace OR AI Review Bot Studio */}
        <div className="xl:col-span-2">
          {panelMode === 'ai-studio' ? (
            /* ── AI GRANDMASTER REVIEW BOT STUDIO (STANDALONE PGN INPUT / SAMPLES) ── */
            <div className="space-y-6 animate-fadeIn">
              {/* Header Banner */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl shadow-gold">
                      🤖
                    </div>
                    <div>
                      <h2 className="font-heading font-extrabold text-lg text-white">
                        AI Grandmaster Game Review Bot
                      </h2>
                      <p className="text-xs text-slate-400 max-w-xl">
                        Paste your game PGN or select a sample game. AI will analyze your moves and generate plain-English Grandmaster feedback, accuracy score, and tactical lessons.
                      </p>
                    </div>
                  </div>

                  {/* Back to selected game if any */}
                  {activeGame && (
                    <button
                      type="button"
                      onClick={() => setPanelMode('list')}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    >
                      ← Back to {activeGame.title}
                    </button>
                  )}
                </div>

                {/* Input Card */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Sample Games Loader */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-slate-400 font-semibold">Load Sample Game:</span>
                      {SAMPLE_GAMES.map((sample) => (
                        <button
                          key={sample.name}
                          type="button"
                          onClick={() => {
                            setStudioPgn(sample.pgn);
                            setStudioColor(sample.color);
                            setStudioResult(null);
                            setStudioError('');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 font-bold border border-slate-700 transition-colors"
                        >
                          {sample.name}
                        </button>
                      ))}
                    </div>

                    {/* Color Selector */}
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-slate-400 font-semibold">Your Color:</span>
                      <button
                        type="button"
                        onClick={() => setStudioColor('white')}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                          studioColor === 'white'
                            ? 'bg-amber-500 text-slate-950 shadow-gold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        ⚪ White
                      </button>
                      <button
                        type="button"
                        onClick={() => setStudioColor('black')}
                        className={`px-3 py-1 rounded-lg font-bold transition-all ${
                          studioColor === 'black'
                            ? 'bg-amber-500 text-slate-950 shadow-gold'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        ⬛ Black
                      </button>
                    </div>
                  </div>

                  {/* PGN Textarea */}
                  <textarea
                    rows={6}
                    value={studioPgn}
                    onChange={(e) => setStudioPgn(e.target.value)}
                    placeholder="Paste game PGN notation here (e.g. 1. e4 e5 2. Nf3...)"
                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-xs font-mono text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                  />

                  {studioError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
                      {studioError}
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={handleStudioAnalyze}
                    disabled={studioLoading || !studioPgn.trim()}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-slate-950 font-extrabold rounded-2xl text-sm transition-all shadow-gold disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <span>{studioLoading ? 'Analyzing Game with Grandmaster AI...' : '🤖 Generate Review & Save to My Games'}</span>
                  </button>
                </div>
              </div>

              {/* AI Review Result Card */}
              {studioResult && (
                <div className="animate-fadeIn">
                  <AiGameReviewCard review={studioResult} />
                </div>
              )}
            </div>
          ) : activeGame ? (
            /* ── SELECTED GAME DETAILS: DUAL TAB (BOARD & STOCKFISH vs AI GRANDMASTER REVIEW) ── */
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
              
              {/* Game Title & Top Navigation Tabs */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                    Game Workspace
                  </span>
                  <h3 className="font-heading font-extrabold text-base text-white truncate max-w-md">
                    {activeGame.title}
                  </h3>
                </div>

                {/* View Tabs */}
                <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setGameDetailTab('board')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      gameDetailTab === 'board'
                        ? 'bg-amber-500 text-slate-950 shadow-gold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ♟️ Board & Stockfish
                  </button>
                  <button
                    type="button"
                    onClick={() => setGameDetailTab('ai-review')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 ${
                      gameDetailTab === 'ai-review'
                        ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg'
                        : 'text-purple-400 hover:text-purple-300'
                    }`}
                  >
                    <span>🤖 AI Grandmaster Review</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Interactive Board & Stockfish */}
              {gameDetailTab === 'board' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left: Chessboard */}
                  <div className="lg:col-span-7 flex flex-col items-center gap-4">
                    <div className="w-full max-w-[420px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 relative bg-slate-950">
                      <ChessboardComponent
                        options={{
                          position: analysisFen,
                          allowDragging: false,
                          darkSquareStyle: { backgroundColor: 'transparent' },
                          lightSquareStyle: { backgroundColor: 'transparent' },
                          boardStyle: {
                            backgroundImage: "url('https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/boards/walnut.png')",
                            backgroundSize: 'cover',
                          },
                          pieces: customChessPieces,
                        }}
                      />
                    </div>

                    {/* Move Navigation */}
                    {movesList.length > 0 && (
                      <div className="flex items-center gap-1 mt-1 bg-slate-800/80 p-1.5 border border-slate-700/80 rounded-2xl shadow-lg">
                        <button
                          onClick={() => navigateMove('start')}
                          className="p-2 text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-all focus:outline-none"
                          title="Start of Game"
                        >
                          |◀
                        </button>
                        <button
                          onClick={() => navigateMove('prev')}
                          className="p-2 text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-all focus:outline-none"
                          title="Prev Move"
                        >
                          ◀
                        </button>
                        <span className="text-[10px] text-slate-300 font-mono px-3 font-semibold select-none">
                          Move {currentMoveIdx + 1} / {movesList.length}
                        </span>
                        <button
                          onClick={() => navigateMove('next')}
                          className="p-2 text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-all focus:outline-none"
                          title="Next Move"
                        >
                          ▶
                        </button>
                        <button
                          onClick={() => navigateMove('end')}
                          className="p-2 text-white hover:bg-slate-700 rounded-lg text-xs font-bold transition-all focus:outline-none"
                          title="End of Game"
                        >
                          ▶|
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Right: PGN Moves & Stockfish */}
                  <div className="lg:col-span-5 flex flex-col justify-between bg-slate-950/70 border border-slate-800 p-5 rounded-2xl h-full min-h-[420px] text-white space-y-4">
                    <div className="space-y-3 flex-grow flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">PGN Moves</span>
                      
                      <div className="flex-grow overflow-y-auto max-h-[220px] bg-slate-900/60 border border-slate-800 p-3 rounded-xl font-mono text-[11px]">
                        {movesList.length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic">No move list available.</p>
                        ) : (
                          <div className="grid grid-cols-2 gap-y-1 gap-x-2">
                            {movesList.map((move, idx) => {
                              if (idx % 2 === 0) {
                                const moveNum = Math.floor(idx / 2) + 1;
                                const isCurrent = currentMoveIdx === idx || currentMoveIdx === idx + 1;
                                return (
                                  <div
                                    key={idx}
                                    className={`col-span-2 flex justify-between py-0.5 px-1.5 rounded transition-all ${
                                      isCurrent ? 'bg-amber-500/20 border-l-2 border-amber-500' : ''
                                    }`}
                                  >
                                    <span className="text-slate-500">{moveNum}.</span>
                                    <span
                                      className={`cursor-pointer hover:text-amber-400 font-bold ${
                                        currentMoveIdx === idx ? 'text-amber-400' : 'text-slate-200'
                                      }`}
                                      onClick={() => navigateMove('prev')}
                                    >
                                      {move}
                                    </span>
                                    <span
                                      className={`cursor-pointer hover:text-amber-400 font-bold ${
                                        currentMoveIdx === idx + 1 ? 'text-amber-400' : 'text-slate-400'
                                      }`}
                                    >
                                      {movesList[idx + 1] || ''}
                                    </span>
                                  </div>
                                );
                              }
                              return null;
                            })}
                          </div>
                        )}
                      </div>

                      {/* Stockfish Engine */}
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={triggerStockfishAnalysis}
                        disabled={analyzing}
                        className="w-full border-slate-700 hover:bg-slate-800 text-white bg-slate-800/80 text-[10px] py-2 uppercase font-bold"
                      >
                        {analyzing ? 'Stockfish thinking...' : '⚡ Ask Stockfish Evaluation'}
                      </Button>

                      {(bestMove || evalScore) && (
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl space-y-1 text-xs">
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Engine Evaluation</span>
                          <div className="grid grid-cols-2 gap-2 font-mono">
                            <div>Eval: <span className="text-amber-400 font-bold">{evalScore || '—'}</span></div>
                            <div>Best: <span className="text-emerald-400 font-bold uppercase">{bestMove || '—'}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: AI Grandmaster Review */}
              {gameDetailTab === 'ai-review' && (
                <div className="space-y-6">
                  {/* Action Banner to trigger review */}
                  <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-900/30 via-slate-900 to-indigo-900/30 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>🤖 FIDE AI Grandmaster Review</span>
                      </h4>
                      <p className="text-xs text-slate-300">
                        Get plain-English tactical insights, accuracy score, best move highlights, and mistake analysis.
                      </p>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <div className="flex items-center gap-1 text-xs bg-slate-950 p-1 rounded-xl border border-slate-800">
                        <button
                          type="button"
                          onClick={() => setGameUserColor('white')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            gameUserColor === 'white'
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ⚪ White
                        </button>
                        <button
                          type="button"
                          onClick={() => setGameUserColor('black')}
                          className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                            gameUserColor === 'black'
                              ? 'bg-amber-500 text-slate-950'
                              : 'text-slate-400 hover:text-white'
                          }`}
                        >
                          ⬛ Black
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={handleRunGameAiReview}
                        disabled={gameReviewLoading || !activeGame.pgn}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg disabled:opacity-50 transition-all flex items-center gap-1.5"
                      >
                        <span>{gameReviewLoading ? 'Analyzing...' : '⚡ Run Review'}</span>
                      </button>
                    </div>
                  </div>

                  {gameReviewError && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs">
                      {gameReviewError}
                    </div>
                  )}

                  {/* Render Review Card if available */}
                  {gameReviewResult ? (
                    <div className="animate-fadeIn">
                      <AiGameReviewCard review={gameReviewResult} />
                    </div>
                  ) : (
                    <div className="p-8 text-center border border-dashed border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
                      <div className="text-3xl">🤖</div>
                      <p className="font-semibold text-slate-300">Click &ldquo;Run Review&rdquo; above to analyze this game with AI Grandmaster.</p>
                      <p className="text-[11px] text-slate-500">
                        AI will evaluate move quality, detect key blunders, and provide personalized coaching commentary.
                      </p>
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            /* ── EMPTY STATE: PROMPT USER TO SELECT GAME OR LAUNCH AI REVIEW ── */
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-card space-y-4">
              <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-2xl text-amber-500">
                ♟️
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Select a Chess Game or Run AI Grandmaster Review
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Pick a game from your repository on the left to play through moves, or launch the AI Grandmaster Review Bot to analyze any PGN with plain-English coaching.
                </p>
              </div>

              <div className="pt-2 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setPanelMode('ai-studio')}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs shadow-lg transition-all flex items-center gap-2"
                >
                  <span>🤖 Open AI Grandmaster Review Bot</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPanelMode('add-form')}
                  className="px-4 py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-xl text-xs transition-colors"
                >
                  + Add New Game
                </button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
