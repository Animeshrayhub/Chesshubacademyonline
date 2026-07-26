'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import DashboardIcon from './DashboardIcon';
import Button from '@/components/ui/Button';
import { customChessPieces } from './ChessPieces';

// react-chessboard v5 — Chessboard takes a single `options` prop
const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => mod.Chessboard),
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

export default function GameRepositoryView({ initialGames }: GameRepositoryViewProps) {
  const [games, setGames] = useState<SavedGame[]>(initialGames);
  const [activeGame, setActiveGame] = useState<SavedGame | null>(null);

  // Form States
  const [showAddForm, setShowAddForm] = useState(false);
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
      setShowAddForm(false);
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
    } catch (err) {
      alert('Failed to delete game.');
    }
  };

  const handleSelectGame = (game: SavedGame) => {
    setActiveGame(game);
    setBestMove('');
    setEvalScore('');
    const chess = new Chess();

    if (game.pgn) {
      try {
        // Strip out annotations to avoid parser crashes
        const cleanPgn = game.pgn.replace(/\{[^}]*\}/g, '').replace(/\$\d+/g, '').trim();
        chess.loadPgn(cleanPgn);
        const history = chess.history();
        setMovesList(history);
        
        // Reset to first position
        chess.reset();
        gameInstanceRef.current = chess;
        setAnalysisFen(chess.fen());
        setCurrentMoveIdx(-1);
      } catch (e) {
        // Fallback if parsing fails
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

    // Replay up to nextIdx
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
            setEvalScore((parseInt(scoreMatch[1]) / 100).toFixed(2));
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

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      
      {/* Saved Games List Panel */}
      <div className="xl:col-span-1 space-y-6">
        <div className="bg-white border border-border rounded-2xl shadow-card p-5">
          <div className="flex items-center justify-between mb-4 border-b border-border pb-3">
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
              <DashboardIcon iconKey="bookOpen" className="w-4 h-4 text-primary" />
              Saved Games
            </h3>
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className="text-xs bg-primary hover:bg-primary-dark text-white font-bold px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 focus:outline-none"
            >
              {showAddForm ? 'View List' : 'Add Game'}
            </button>
          </div>

          {showAddForm ? (
            <form onSubmit={handleAddGame} className="space-y-4 text-xs">
              {error && <div className="p-2.5 bg-red-50 text-red-600 rounded-lg border border-red-100">{error}</div>}
              <div>
                <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wide block mb-1">Game Title / Opponent</label>
                <input
                  type="text"
                  placeholder="e.g. Kasparov vs Deep Blue, 1997"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-slate-50 border border-border px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-text-primary"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wide block mb-1">Lichess URL (optional)</label>
                <input
                  type="url"
                  placeholder="https://lichess.org/aBcDeFgH"
                  value={lichessUrl}
                  onChange={(e) => setLichessUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-border px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-text-primary"
                />
              </div>
              <div>
                <label className="text-[10px] text-text-secondary uppercase font-bold tracking-wide block mb-1">PGN Move String (optional)</label>
                <textarea
                  rows={6}
                  placeholder="1. e4 e5 2. Nf3 Nc6 3. Bb5 a6..."
                  value={pgn}
                  onChange={(e) => setPgn(e.target.value)}
                  className="w-full bg-slate-50 border border-border px-3 py-2 rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-text-primary font-mono text-[11px]"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-accent hover:bg-accent-hover text-surface-dark font-bold rounded-xl transition-all shadow-gold disabled:opacity-50"
              >
                {loading ? 'Saving Game...' : 'Save Game to Repository'}
              </button>
            </form>
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {games.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs italic">
                  No games saved yet. Click Add Game to build your library.
                </div>
              ) : (
                games.map((g) => (
                  <div
                    key={g.id}
                    onClick={() => handleSelectGame(g)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                      activeGame?.id === g.id
                        ? 'border-primary bg-blue-50/10'
                        : 'border-border hover:bg-slate-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-text-primary leading-tight">{g.title}</h4>
                        <span className="text-[9px] text-text-secondary mt-1 block">
                          Saved on {new Date(g.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteGame(g.id);
                        }}
                        className="text-red-400 hover:text-red-600 transition-colors p-1"
                        title="Delete Game"
                      >
                        <DashboardIcon iconKey="trash" className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex gap-2">
                      {g.lichess_url && (
                        <a
                          href={g.lichess_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1"
                        >
                          Lichess Link ↗
                        </a>
                      )}
                      {g.pgn && (
                        <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded font-mono font-bold uppercase tracking-wide border border-green-100/50">
                          PGN Available
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>

      {/* Interactive Board & Analysis Panel */}
      <div className="xl:col-span-2">
        {activeGame ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-surface-dark border border-slate-800 rounded-3xl p-6 shadow-2xl">
            
            {/* Chessboard */}
            <div className="lg:col-span-2 flex flex-col items-center gap-4">
              <div className="w-full max-w-[480px] aspect-square rounded-xl overflow-hidden shadow-2xl border-4 border-slate-800 relative">
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
                <div className="flex items-center gap-1 mt-1 bg-slate-800/60 p-1.5 border border-slate-700/80 rounded-2xl">
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

            {/* Analysis details */}
            <div className="flex flex-col justify-between bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl h-full min-h-[400px] text-white">
              <div className="space-y-4 flex-grow flex flex-col">
                <div>
                  <h3 className="text-xs font-bold text-accent tracking-wide uppercase mb-1">Analysis Room</h3>
                  <h4 className="text-sm font-semibold leading-tight text-white">{activeGame.title}</h4>
                </div>

                <div className="space-y-3.5 flex-grow overflow-y-auto max-h-[220px] bg-slate-950/40 border border-slate-850 p-3.5 rounded-xl">
                  <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">PGN Moves</span>
                  {movesList.length === 0 ? (
                    <p className="text-[10px] text-slate-500 italic mt-1">No move list available. Set PGN string to navigate moves.</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-y-1 gap-x-3 font-mono text-[11px] mt-1">
                      {movesList.map((move, idx) => {
                        if (idx % 2 === 0) {
                          const moveNum = Math.floor(idx / 2) + 1;
                          const isCurrent = currentMoveIdx === idx || currentMoveIdx === idx + 1;
                          return (
                            <div
                              key={idx}
                              className={`col-span-2 flex justify-between py-0.5 px-1.5 rounded transition-all ${
                                isCurrent ? 'bg-primary/20 border-l-2 border-primary' : ''
                              }`}
                            >
                              <span className="text-slate-500">{moveNum}.</span>
                              <span
                                className={`cursor-pointer hover:text-accent transition-colors font-bold ${
                                  currentMoveIdx === idx ? 'text-accent' : 'text-slate-200'
                                }`}
                                onClick={() => navigateMove('prev') /* Navigate by clicking is a placeholder */}
                              >
                                {move}
                              </span>
                              <span
                                className={`cursor-pointer hover:text-accent transition-colors font-bold ${
                                  currentMoveIdx === idx + 1 ? 'text-accent' : 'text-slate-350'
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

                {/* Stockfish Button */}
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={triggerStockfishAnalysis}
                  disabled={analyzing}
                  className="w-full border-slate-700 hover:bg-slate-800 text-white bg-slate-800/50 text-[10px] py-2 uppercase font-bold"
                >
                  {analyzing ? 'Stockfish thinking...' : 'Ask Stockfish Analysis'}
                </Button>

                {/* Stockfish Display */}
                {(bestMove || evalScore) && (
                  <div className="bg-slate-950/60 p-3.5 rounded-xl space-y-1.5 border border-slate-800 text-xs">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Engine Feedback</span>
                    <div className="grid grid-cols-2 gap-2 font-mono">
                      <div>
                        Eval: <span className="text-accent font-bold">{evalScore || '—'}</span>
                      </div>
                      <div>
                        Best: <span className="text-green-400 font-bold uppercase">{bestMove || '—'}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white border border-border rounded-3xl p-12 text-center h-full min-h-[400px] flex flex-col justify-center items-center shadow-card">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <DashboardIcon iconKey="bookOpen" className="w-6 h-6 text-text-secondary" />
            </div>
            <h3 className="text-sm font-bold text-text-primary mb-1">Select a Chess Game</h3>
            <p className="text-xs text-text-secondary max-w-xs mx-auto">
              Choose a saved game from your repository list on the left to load the interactive board, play through moves, and analyze with Stockfish.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
