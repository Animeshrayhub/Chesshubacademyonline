'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import DashboardIcon from './DashboardIcon';
import Button from '@/components/ui/Button';
import { customChessPieces } from './ChessPieces';

import { supabase } from '@/utils/supabaseClient';

import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';

const ChessboardComponent = dynamic(
  () =>
    import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

type BotLevel = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'cm' | 'im' | 'gm';

interface BotScore {
  wins: number;
  losses: number;
  draws: number;
}

const BOT_LEVELS = [
  { id: 'pawn', label: 'Level 1: Pawn', depth: 1, desc: 'Beginner (Depth 1)' },
  { id: 'knight', label: 'Level 2: Knight', depth: 3, desc: 'Casual (Depth 3)' },
  { id: 'bishop', label: 'Level 3: Bishop', depth: 5, desc: 'Intermediate (Depth 5)' },
  { id: 'rook', label: 'Level 4: Rook', depth: 7, desc: 'Club Player (Depth 7)' },
  { id: 'queen', label: 'Level 5: Queen', depth: 9, desc: 'Advanced (Depth 9)' },
  { id: 'cm', label: 'Level 6: CM Bot', depth: 11, desc: 'Expert CM (Depth 11)' },
  { id: 'im', label: 'Level 7: IM Bot', depth: 13, desc: 'Master IM (Depth 13)' },
  { id: 'gm', label: 'Level 8: GM Bot', depth: 16, desc: 'FIDE GM Bot (Depth 16)' },
];

interface PlayBotBoardProps {
  initialFen?: string;
  classId?: string;
  onCloseCustom?: () => void;
}

function createSafeChess(fen?: string): { chess: Chess; validFen: string; isFallback: boolean } {
  const DEFAULT_STARTPOS = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  if (fen && fen.trim()) {
    try {
      const g = new Chess(fen.trim());
      return { chess: g, validFen: g.fen(), isFallback: false };
    } catch {
      // Invalid FEN provided
    }
  }
  return { chess: new Chess(DEFAULT_STARTPOS), validFen: DEFAULT_STARTPOS, isFallback: true };
}

export default function PlayBotBoard({ initialFen, classId, onCloseCustom }: PlayBotBoardProps = {}) {

  const [level, setLevel] = useState<BotLevel>('pawn');
  const [boardOrientation, setBoardOrientation] = useState<'white' | 'black'>('white');
  const safeInit = useMemo(() => createSafeChess(initialFen), [initialFen]);
  const [fen, setFen] = useState(safeInit.validFen);
  const [status, setStatus] = useState<'active' | 'checkmate' | 'draw' | 'resigned'>('active');
  const [message, setMessage] = useState(
    safeInit.isFallback && initialFen
      ? '⚠️ Invalid custom FEN position (missing King). Loaded standard starting board.'
      : initialFen
      ? 'Custom position loaded! Play your move against the bot.'
      : 'Start the match! Your turn to play.'
  );
  const [history, setHistory] = useState<string[]>([]);
  const [isBotThinking, setIsBotThinking] = useState(false);
  const [score, setScore] = useState<BotScore>({ wins: 0, losses: 0, draws: 0 });

  // Selection & option squares for legal move dots
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [optionSquares, setOptionSquares] = useState<Record<string, React.CSSProperties>>({});

  const gameRef = useRef<Chess>(safeInit.chess);
  const stockfishRef = useRef<Worker | null>(null);

  // Re-sync game position if initialFen prop changes
  useEffect(() => {
    const { chess, validFen, isFallback } = createSafeChess(initialFen);
    gameRef.current = chess;
    setFen(validFen);
    setStatus('active');
    setHistory([]);
    if (isFallback && initialFen) {
      setMessage('⚠️ Invalid position FEN (missing King or pieces). Loaded standard starting board.');
    } else if (initialFen) {
      setMessage('Custom position loaded! Play your move against the bot.');
    }
  }, [initialFen]);

  // Load scores from LocalStorage
  useEffect(() => {
    const savedScore = localStorage.getItem('chesshub_bot_score');
    if (savedScore) {
      try {
        setScore(JSON.parse(savedScore));
      } catch (e) {}
    }
  }, []);

  const saveScore = (newScore: BotScore) => {
    setScore(newScore);
    localStorage.setItem('chesshub_bot_score', JSON.stringify(newScore));
  };

  // Terminate engine on unmount
  useEffect(() => {
    return () => {
      stockfishRef.current?.terminate();
    };
  }, []);

  // Get skill level based on level selection
  const getSkillLevel = (): number => {
    switch (level) {
      case 'pawn': return 0;      // Very Easy (Rating ~800)
      case 'knight': return 3;    // Easy (Rating ~1100)
      case 'bishop': return 6;    // Casual (Rating ~1400)
      case 'rook': return 9;      // Intermediate (Rating ~1600)
      case 'queen': return 12;     // Advanced (Rating ~1900)
      case 'cm': return 15;       // Expert (Rating ~2200)
      case 'im': return 18;       // Master (Rating ~2500)
      case 'gm': return 20;       // Pro (Rating ~3000+)
      default: return 0;
    }
  };

  // Get depth based on level selection
  const getSearchDepth = (): number => {
    switch (level) {
      case 'pawn': return 1;
      case 'knight': return 2;
      case 'bishop': return 4;
      case 'rook': return 6;
      case 'queen': return 8;
      case 'cm': return 10;
      case 'im': return 12;
      case 'gm': return 15;
      default: return 1;
    }
  };

  // Make engine move
  const triggerEngineMove = () => {
    if (status !== 'active') return;
    setIsBotThinking(true);
    setMessage('Bot is thinking...');

    // Initialize or reset Stockfish worker
    stockfishRef.current?.terminate();
    const worker = new Worker('/stockfish/stockfish.js');
    stockfishRef.current = worker;

    worker.onmessage = (event) => {
      const line = event.data;
      if (line.startsWith('bestmove')) {
        const parts = line.split(' ');
        const bestMoveUci = parts[1];

        if (bestMoveUci && bestMoveUci !== '(none)') {
          const game = gameRef.current;
          try {
            const from = bestMoveUci.substring(0, 2);
            const to = bestMoveUci.substring(2, 4);
            const promotion = bestMoveUci.substring(4, 5) || undefined;

            game.move({ from, to, promotion });
            const nextFen = game.fen();
            setFen(nextFen);
            setHistory(game.history());

            if (classId) {
              const channel = supabase.channel(`classroom-board:${classId}`);
              channel.send({
                type: 'broadcast',
                event: 'move',
                payload: {
                  fen: nextFen,
                  history: game.history(),
                  sentAt: Date.now(),
                },
              });
            }

            // Check game status after Bot move
            checkGameStatus();

          } catch (e) {
            console.error('Failed to make bot move:', e);
            setMessage('Error processing bot move.');
          }
        }
        setIsBotThinking(false);
        worker.terminate();
      }
    };

    worker.postMessage('uci');
    worker.postMessage(`setoption name Skill Level value ${getSkillLevel()}`);
    worker.postMessage('ucinewgame');
    worker.postMessage(`position fen ${gameRef.current.fen()}`);
    worker.postMessage(`go depth ${getSearchDepth()}`);
  };

  // Start Bot turn if it is the Bot's color to play
  useEffect(() => {
    const activeColor = gameRef.current.turn() === 'w' ? 'white' : 'black';
    if (activeColor !== boardOrientation && status === 'active' && !isBotThinking) {
      // 1s delay to feel natural
      const timeout = setTimeout(() => {
        triggerEngineMove();
      }, 800);
      return () => clearTimeout(timeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, boardOrientation, status]);

  // Check checkmates/draws
  const checkGameStatus = () => {
    const game = gameRef.current;
    const activeColor = game.turn() === 'w' ? 'white' : 'black';

    if (game.isGameOver()) {
      if (game.isCheckmate()) {
        const winner = activeColor === 'white' ? 'black' : 'white';
        setStatus('checkmate');
        if (winner === boardOrientation) {
          setMessage('🎉 Checkmate! You Win!');
          saveScore({ ...score, wins: score.wins + 1 });
        } else {
          setMessage('❌ Checkmate! You Lost.');
          saveScore({ ...score, losses: score.losses + 1 });
        }
      } else {
        setStatus('draw');
        setMessage('🤝 Game Draw (Stalemate / Repetition).');
        saveScore({ ...score, draws: score.draws + 1 });
      }
    } else {
      if (game.inCheck()) {
        setMessage('⚠️ Check! Protect your King.');
      } else {
        const turnLabel = activeColor === boardOrientation ? 'Your turn' : 'Bot turn';
        setMessage(`${turnLabel} to play.`);
      }
    }
  };

  // Selection & option squares for legal move dots
  const handleSquareClick = (square: string) => {
    if (status !== 'active' || isBotThinking) return;

    // Check if it's the student's turn
    const activeColor = gameRef.current.turn() === 'w' ? 'white' : 'black';
    if (activeColor !== boardOrientation) return;

    // 1. If clicked on a valid move square, make the move
    if (optionSquares[square]) {
      const game = gameRef.current;
      try {
        const isPromotion =
          (game.get(selectedSquare as any)?.type === 'p' &&
           (square.endsWith('8') || square.endsWith('1')));

        const move = game.move({
          from: selectedSquare!,
          to: square,
          promotion: isPromotion ? 'q' : undefined,
        });

        if (move) {
          const nextFen = game.fen();
          setFen(nextFen);
          setHistory(game.history());

          if (classId) {
            const channel = supabase.channel(`classroom-board:${classId}`);
            channel.send({
              type: 'broadcast',
              event: 'move',
              payload: {
                fen: nextFen,
                history: game.history(),
                sentAt: Date.now(),
              },
            });
          }

          checkGameStatus();
          setSelectedSquare(null);
          setOptionSquares({});
          return;
        }
      } catch (e) {}
    }

    // 2. Otherwise, check if we clicked on our own piece to select it
    const piece = gameRef.current.get(square as any);
    if (piece && piece.color === gameRef.current.turn()) {
      setSelectedSquare(square);

      // Find legal moves
      const moves = gameRef.current.moves({ square: square as any, verbose: true });
      const newOptionSquares: Record<string, React.CSSProperties> = {};

      // Selection highlight (Chess.com style blue border/glow)
      newOptionSquares[square] = {
        boxShadow: 'inset 0 0 0 3.5px #3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.15)',
      };

      moves.forEach((m) => {
        const targetPiece = gameRef.current.get(m.to as any);
        if (targetPiece) {
          // Capture: ring overlay
          newOptionSquares[m.to] = {
            background: 'radial-gradient(circle, transparent 75%, rgba(0, 0, 0, 0.18) 75%)',
          };
        } else {
          // Empty: dot overlay
          newOptionSquares[m.to] = {
            background: 'radial-gradient(circle, rgba(0, 0, 0, 0.18) 19%, transparent 19%)',
          };
        }
      });

      setOptionSquares(newOptionSquares);
    } else {
      setSelectedSquare(null);
      setOptionSquares({});
    }
  };

  // Supports both positional args and object params
  const handlePieceDrop = (sourceOrObj: any, targetArg?: string | null): boolean => {
    let sourceSquare: string = '';
    let targetSquare: string | null = null;

    if (typeof sourceOrObj === 'object' && sourceOrObj !== null && 'sourceSquare' in sourceOrObj) {
      sourceSquare = sourceOrObj.sourceSquare;
      targetSquare = sourceOrObj.targetSquare || null;
    } else {
      sourceSquare = String(sourceOrObj || '');
      targetSquare = targetArg || null;
    }

    if (status !== 'active' || isBotThinking || !targetSquare) return false;

    // Check if it's the student's turn
    const activeColor = gameRef.current.turn() === 'w' ? 'white' : 'black';
    if (activeColor !== boardOrientation) return false;

    const game = gameRef.current;
    setSelectedSquare(null);
    setOptionSquares({});
    try {
      // Attempt standard moves including auto-queen promotions
      const isPromotion = 
        (game.get(sourceSquare as any)?.type === 'p' && 
         (targetSquare.endsWith('8') || targetSquare.endsWith('1')));

      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: isPromotion ? 'q' : undefined,
      });

      if (move) {
        const nextFen = game.fen();
        setFen(nextFen);
        setHistory(game.history());

        if (classId) {
          const channel = supabase.channel(`classroom-board:${classId}`);
          channel.send({
            type: 'broadcast',
            event: 'move',
            payload: {
              fen: nextFen,
              history: game.history(),
              sentAt: Date.now(),
            },
          });
        }

        checkGameStatus();
        return true;
      }

    } catch (e) {}
    return false;
  };

  const handleReset = (orientation: 'white' | 'black' = boardOrientation) => {
    stockfishRef.current?.terminate();
    const game = new Chess();
    gameRef.current = game;
    setFen(game.fen());
    setHistory([]);
    setStatus('active');
    setBoardOrientation(orientation);
    setIsBotThinking(false);
    setSelectedSquare(null);
    setOptionSquares({});
    setMessage(orientation === 'white' ? 'Start the match! Your turn to play.' : 'Bot will start the game.');
  };

  const handleResign = () => {
    if (status !== 'active') return;
    setStatus('resigned');
    setSelectedSquare(null);
    setOptionSquares({});
    setMessage('🏳️ You resigned the game.');
    saveScore({ ...score, losses: score.losses + 1 });
  };

  const handleUndo = () => {
    if (isBotThinking || history.length < 2) return;
    const game = gameRef.current;
    // Undo Bot move and Student move
    game.undo();
    game.undo();
    setFen(game.fen());
    setHistory(game.history());
    setStatus('active');
    setSelectedSquare(null);
    setOptionSquares({});
    setMessage('Move undone. Your turn to play.');
  };

  const handleClearScore = () => {
    saveScore({ wins: 0, losses: 0, draws: 0 });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-surface-dark border border-slate-800 rounded-3xl p-6 shadow-2xl">
      {/* Board Column */}
      <div className="lg:col-span-2 flex flex-col items-center">
        <div className="w-full max-w-[500px] aspect-square rounded-2xl overflow-hidden border border-slate-800 shadow-card">
          <ChessboardComponent
            options={{
              position: fen,
              onPieceDrop: handlePieceDrop,
              onSquareClick: ({ square }: { square: string }) => handleSquareClick(square),
              boardOrientation: boardOrientation,
              pieces: customChessPieces,
              darkSquareStyle: { backgroundColor: 'transparent' },
              lightSquareStyle: { backgroundColor: 'transparent' },
              boardStyle: {
                borderRadius: '1rem',
                backgroundImage: "url('https://raw.githubusercontent.com/GiorgioMegrelli/chess.com-boards-and-pieces/master/boards/walnut.png')",
                backgroundSize: 'cover',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
              },
              squareStyles: optionSquares,
            }}
          />
        </div>

        {/* Board Controls */}
        <div className="flex gap-2.5 mt-4 w-full max-w-[500px]">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleUndo}
            disabled={isBotThinking || history.length < 2 || status !== 'active'}
            className="flex-1 text-white border-slate-700 hover:bg-slate-800 disabled:opacity-30"
          >
            Undo Move
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleResign}
            disabled={status !== 'active'}
            className="flex-1 border-red-950 bg-red-950/20 hover:bg-red-950/40 text-red-400 disabled:opacity-30"
          >
            Resign
          </Button>
        </div>
      </div>

      {/* Control Panel Sidebar */}
      <div className="flex flex-col justify-between bg-slate-900/50 border border-slate-800/80 p-5 rounded-2xl h-full min-h-[400px]">
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-accent tracking-wide uppercase">
              Computer Bot Match
            </h3>
            {onCloseCustom && (
              <button
                type="button"
                onClick={onCloseCustom}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-xs rounded-lg font-bold transition-colors"
              >
                ✕ Exit Match
              </button>
            )}
          </div>

          {/* Difficulty Level Selector */}
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
              Select Level
            </span>
            <div className="grid grid-cols-2 gap-1.5 bg-slate-950/50 p-1.5 rounded-xl border border-slate-800">
              {BOT_LEVELS.map((bl) => (
                <button
                  key={bl.id}
                  type="button"
                  onClick={() => setLevel(bl.id as any)}
                  className={`py-2 px-2.5 rounded-lg text-[10px] font-extrabold transition-all flex flex-col items-center justify-center ${
                    level === bl.id
                      ? 'bg-accent text-surface-dark shadow-md'
                      : 'text-slate-400 hover:text-white bg-slate-900/30'
                  }`}
                >
                  <span>{bl.label}</span>
                  <span className={`text-[8px] font-medium mt-0.5 ${level === bl.id ? 'text-surface-dark/80' : 'text-slate-500'}`}>
                    {bl.desc.split(' ')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
              Play As
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleReset('white')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  boardOrientation === 'white'
                    ? 'bg-white text-slate-900 border-white font-black'
                    : 'bg-slate-950/30 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ⚪ White
              </button>
              <button
                type="button"
                onClick={() => handleReset('black')}
                className={`py-2 rounded-xl text-xs font-bold border transition-all flex items-center justify-center gap-1.5 ${
                  boardOrientation === 'black'
                    ? 'bg-slate-950 text-white border-slate-700 font-black'
                    : 'bg-slate-950/30 text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                ⚫ Black
              </button>
            </div>
          </div>

          {/* Status Message Bubble */}
          <div
            className={`p-3.5 rounded-xl text-xs font-semibold border flex flex-col gap-1.5 ${
              status === 'checkmate'
                ? 'bg-green-500/10 text-green-400 border-green-500/20'
                : status === 'resigned'
                ? 'bg-red-500/10 text-red-400 border-red-500/20'
                : 'bg-slate-950/60 text-slate-300 border-slate-800'
            }`}
          >
            <div className="flex items-center gap-1.5">
              {isBotThinking && (
                <span className="w-2 h-2 rounded-full bg-accent animate-ping"></span>
              )}
              {message}
            </div>
          </div>

          {/* Score Counter */}
          <div className="bg-slate-950/60 p-4 rounded-xl space-y-3 border border-slate-800 text-xs">
            <div className="flex justify-between items-center text-[10px] text-slate-400 font-bold uppercase tracking-wider">
              <span>Score History</span>
              {score.wins + score.losses + score.draws >= 20 && (
                <button
                  type="button"
                  onClick={handleClearScore}
                  className="text-red-500 hover:underline cursor-pointer lowercase"
                >
                  Reset score
                </button>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1">
              <div className="bg-slate-900 border border-slate-800/80 p-2 rounded-lg">
                <span className="text-[9px] text-slate-500 block">Wins</span>
                <span className="text-sm font-extrabold text-green-500 font-mono">{score.wins}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800/80 p-2 rounded-lg">
                <span className="text-[9px] text-slate-500 block">Losses</span>
                <span className="text-sm font-extrabold text-red-500 font-mono">{score.losses}</span>
              </div>
              <div className="bg-slate-900 border border-slate-800/80 p-2 rounded-lg">
                <span className="text-[9px] text-slate-500 block">Draws</span>
                <span className="text-sm font-extrabold text-slate-400 font-mono">{score.draws}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="space-y-2 pt-4 border-t border-slate-800/80">
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => handleReset(boardOrientation)}
            className="w-full bg-accent hover:bg-accent-hover text-surface-dark font-extrabold"
          >
            Restart Game ↻
          </Button>
        </div>
      </div>
    </div>
  );
}
