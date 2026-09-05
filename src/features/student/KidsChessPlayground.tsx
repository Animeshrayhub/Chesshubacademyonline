'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';
import {
  playMoveSound,
  playCaptureSound,
  playVictoryFanfare,
  playBoingSound,
  speakCheer,
  isSoundMuted,
  toggleSoundMute,
} from '@/utils/kidAudio';

const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

// Helper to safely extract a square string (e.g. 'e4') from any string or object
export const extractSquare = (sq: any): string => {
  if (typeof sq === 'string') return sq.toLowerCase();
  if (sq && typeof sq === 'object') {
    if (typeof sq.square === 'string') return sq.square.toLowerCase();
    if (typeof sq.targetSquare === 'string') return sq.targetSquare.toLowerCase();
    if (typeof sq.sourceSquare === 'string') return sq.sourceSquare.toLowerCase();
    if (typeof sq.to === 'string') return sq.to.toLowerCase();
    if (typeof sq.from === 'string') return sq.from.toLowerCase();
    if (typeof sq.toString === 'function') {
      const s = sq.toString();
      if (s && s !== '[object Object]' && s.length >= 2) return s.toLowerCase();
    }
  }
  return '';
};

// ── Superheroes Data ──────────────────────────────────────────────────────────
export interface ChessHero {
  id: string;
  name: string;
  title: string;
  emoji: string;
  motto: string;
  power: string;
  colorClass: string;
  fen: string;
  targetSquare: string;
}

export const CHESS_HEROES: ChessHero[] = [
  {
    id: 'rook',
    name: 'Captain Rook',
    title: 'The Straight Shooter',
    emoji: '🏰',
    motto: 'Nothing blocks my laser path along ranks and files!',
    power: 'Blasts forward, backward, left and right across open lines.',
    colorClass: 'from-amber-600/20 to-amber-900/10 border-amber-500/30 text-amber-400',
    fen: '8/8/8/8/3R4/8/8/8 w - - 0 1',
    targetSquare: 'd8',
  },
  {
    id: 'knight',
    name: 'Sir Knight',
    title: 'The Wall Jumper',
    emoji: '🐎',
    motto: 'I jump over any wall in a magical L-shape!',
    power: 'The ONLY piece in chess that can jump over other pieces.',
    colorClass: 'from-blue-600/20 to-blue-900/10 border-blue-500/30 text-blue-400',
    fen: '8/8/8/8/8/8/8/N7 w - - 0 1',
    targetSquare: 'c2',
  },
  {
    id: 'bishop',
    name: 'Bishop Breeze',
    title: 'The Diagonal Sniper',
    emoji: '⚡',
    motto: 'I rule the diagonal colors from corner to corner!',
    power: 'Stays on its starting color forever and snipes from long range.',
    colorClass: 'from-purple-600/20 to-purple-900/10 border-purple-500/30 text-purple-400',
    fen: '8/8/8/8/8/8/8/2B5 w - - 0 1',
    targetSquare: 'h6',
  },
  {
    id: 'queen',
    name: 'Lady Queen',
    title: 'The Super Ruler',
    emoji: '👑',
    motto: 'Combined powers of Rook and Bishop make me unstoppable!',
    power: 'Moves in any direction — straight or diagonal — as far as she wants.',
    colorClass: 'from-rose-600/20 to-rose-900/10 border-rose-500/30 text-rose-400',
    fen: '8/8/8/8/3Q4/8/8/8 w - - 0 1',
    targetSquare: 'h8',
  },
  {
    id: 'pawn',
    name: 'Pawn Patrol',
    title: 'The Brave Foot Soldier',
    emoji: '🛡️',
    motto: 'Step by step forward, ready to transform into a Queen!',
    power: 'Moves 2 squares on turn 1, captures diagonally, and promotes at the end.',
    colorClass: 'from-emerald-600/20 to-emerald-900/10 border-emerald-500/30 text-emerald-400',
    fen: '8/8/8/8/8/8/4P3/8 w - - 0 1',
    targetSquare: 'e4',
  },
];

type PlaygroundMode = 'maze' | 'sprint' | 'escape' | 'heroes';

export default function KidsChessPlayground() {
  const [activeMode, setActiveMode] = useState<PlaygroundMode>('maze');
  const [soundMuted, setSoundMuted] = useState(false);

  // ── 1. Knight's Star Maze State ─────────────────────────────────────────────
  const [mazeStars, setMazeStars] = useState<string[]>(['c2', 'e3', 'd5', 'f6', 'h7']);
  const [mazeTraps] = useState<string[]>(['b3', 'd4', 'f5', 'g2']);
  const [mazeKnightSquare, setMazeKnightSquare] = useState('a1');
  const [mazeMovesCount, setMazeMovesCount] = useState(0);
  const [mazeCompleted, setMazeCompleted] = useState(false);

  // ── 2. Pawn Sprint State ───────────────────────────────────────────────────
  const [sprintWhitePawn, setSprintWhitePawn] = useState('e2');
  const [sprintBlackPawn, setSprintBlackPawn] = useState('a7');
  const [sprintWinner, setSprintWinner] = useState<'white' | 'black' | null>(null);

  // ── 3. King Escape State ───────────────────────────────────────────────────
  const [escapeKingSquare, setEscapeKingSquare] = useState('e1');
  const [escapeCompleted, setEscapeCompleted] = useState(false);

  // ── 4. Superhero Quests State ──────────────────────────────────────────────
  const [activeHero, setActiveHero] = useState<ChessHero>(CHESS_HEROES[0]);
  const [heroBoardFen, setHeroBoardFen] = useState(CHESS_HEROES[0].fen);
  const [heroCompleted, setHeroCompleted] = useState(false);
  const [heroBadgeUnlocked, setHeroBadgeUnlocked] = useState<string[]>([]);

  useEffect(() => {
    setSoundMuted(isSoundMuted());
  }, []);

  const handleToggleSound = () => {
    const next = toggleSoundMute();
    setSoundMuted(next);
  };

  // ── 1. Knight's Star Maze Logic ────────────────────────────────────────────
  const resetMaze = () => {
    setMazeStars(['c2', 'e3', 'd5', 'f6', 'h7']);
    setMazeKnightSquare('a1');
    setMazeMovesCount(0);
    setMazeCompleted(false);
  };

  const isLegalKnightMove = (fromRaw: any, toRaw: any): boolean => {
    const from = extractSquare(fromRaw);
    const to = extractSquare(toRaw);
    if (!from || !to || from.length < 2 || to.length < 2) return false;
    const colDiff = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
    const rowDiff = Math.abs(parseInt(from[1], 10) - parseInt(to[1], 10));
    return (colDiff === 1 && rowDiff === 2) || (colDiff === 2 && rowDiff === 1);
  };

  const handleMazeSquareClick = (rawSquare: any) => {
    if (mazeCompleted) return;
    const square = extractSquare(rawSquare);
    if (!square || square.length < 2) return;

    if (!isLegalKnightMove(mazeKnightSquare, square)) {
      playBoingSound();
      speakCheer('Knights move in an L-shape! 2 squares one way, 1 square to the side!');
      return;
    }

    if (mazeTraps.includes(square)) {
      playBoingSound();
      speakCheer('Watch out! That is a trap square!');
      return;
    }

    // Valid move!
    setMazeKnightSquare(square);
    setMazeMovesCount((m) => m + 1);

    if (mazeStars.includes(square)) {
      playCaptureSound();
      const remaining = mazeStars.filter((s) => s !== square);
      setMazeStars(remaining);

      if (remaining.length === 0) {
        setMazeCompleted(true);
        playVictoryFanfare();
        speakCheer('Fantastic hopping! You collected all stars and mastered the Knight!');
      } else {
        speakCheer('Star collected! Keep hopping!');
      }
    } else {
      playMoveSound();
    }
  };

  const handleMazePieceDrop = (arg0: any, arg1?: any): boolean => {
    const from = extractSquare(arg0?.sourceSquare || arg0);
    const to = extractSquare(arg0?.targetSquare || arg1);
    if (!from || !to) return false;
    if (from !== mazeKnightSquare) return false;
    handleMazeSquareClick(to);
    return true;
  };

  // ── 2. Pawn Sprint Logic ───────────────────────────────────────────────────
  const resetSprint = () => {
    setSprintWhitePawn('e2');
    setSprintBlackPawn('a7');
    setSprintWinner(null);
  };

  const handlePawnSprintStep = (stepCount: 1 | 2) => {
    if (sprintWinner) return;

    const col = sprintWhitePawn[0];
    const currentRow = parseInt(sprintWhitePawn[1], 10);

    // Validation: 2 squares only on rank 2
    if (stepCount === 2 && currentRow !== 2) {
      playBoingSound();
      speakCheer('Pawns can only move 2 squares from their starting square on rank 2!');
      return;
    }

    const nextRow = currentRow + stepCount;
    if (nextRow > 8) return;

    const nextSquare = `${col}${nextRow}`;
    setSprintWhitePawn(nextSquare);
    playMoveSound();

    if (nextRow === 8) {
      // White Promoted!
      setSprintWinner('white');
      playVictoryFanfare();
      speakCheer('Pawn promoted to Queen! You won the sprint race!');
      return;
    }

    // Computer Black pawn advances 1 square
    setTimeout(() => {
      setSprintBlackPawn((prev) => {
        const bCol = prev[0];
        const bRow = parseInt(prev[1], 10) - 1;
        const bSquare = `${bCol}${bRow}`;
        playMoveSound();

        if (bRow === 1) {
          setSprintWinner('black');
          playBoingSound();
          speakCheer('Black promoted first! Try moving 2 squares on turn 1 to win!');
        }
        return bSquare;
      });
    }, 450);
  };

  const handleSprintSquareClick = (rawSquare: any) => {
    if (sprintWinner) return;
    const targetSq = extractSquare(rawSquare);
    if (!targetSq || targetSq.length < 2) return;

    const curCol = sprintWhitePawn[0];
    const curRow = parseInt(sprintWhitePawn[1], 10);
    const tgtCol = targetSq[0];
    const tgtRow = parseInt(targetSq[1], 10);

    if (tgtCol !== curCol) {
      playBoingSound();
      speakCheer('Pawns only move straight forward in the sprint race!');
      return;
    }

    const diff = tgtRow - curRow;
    if (diff === 1) {
      handlePawnSprintStep(1);
    } else if (diff === 2 && curRow === 2) {
      handlePawnSprintStep(2);
    } else {
      playBoingSound();
      speakCheer('Click 1 square ahead, or 2 squares from the starting line!');
    }
  };

  const handleSprintPieceDrop = (arg0: any, arg1?: any): boolean => {
    const from = extractSquare(arg0?.sourceSquare || arg0);
    const to = extractSquare(arg0?.targetSquare || arg1);
    if (!from || !to) return false;
    if (from !== sprintWhitePawn) return false;
    handleSprintSquareClick(to);
    return true;
  };

  // ── 3. King Escape Logic ───────────────────────────────────────────────────
  const resetEscape = () => {
    setEscapeKingSquare('e1');
    setEscapeCompleted(false);
  };

  const handleEscapeMove = (rawTarget: any) => {
    if (escapeCompleted) return;
    const targetSq = extractSquare(rawTarget);
    if (!targetSq) return;

    if (targetSq === 'g1' || targetSq === 'f1') {
      setEscapeKingSquare(targetSq);
      playMoveSound();
      if (targetSq === 'g1') {
        setEscapeCompleted(true);
        playVictoryFanfare();
        speakCheer('The King reached the castle square safely! Castle complete!');
      } else {
        speakCheer('Good step! One more hop to g1 for the castle!');
      }
    } else {
      playBoingSound();
      speakCheer('Watch out! The center is in check! Hop the King toward g1!');
    }
  };

  const handleEscapePieceDrop = (arg0: any, arg1?: any): boolean => {
    const from = extractSquare(arg0?.sourceSquare || arg0);
    const to = extractSquare(arg0?.targetSquare || arg1);
    if (!from || !to) return false;
    if (from !== escapeKingSquare) return false;
    handleEscapeMove(to);
    return true;
  };

  // ── 4. Superhero Quest Logic ───────────────────────────────────────────────
  const getFenWithPieceOnSquare = (heroId: string, square: string): string => {
    const pieceChar = heroId === 'knight' ? 'N' : heroId[0].toUpperCase();
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const col = square.charCodeAt(0) - 97;
    const row = 8 - parseInt(square[1], 10);
    if (row >= 0 && row < 8 && col >= 0 && col < 8) {
      board[row][col] = pieceChar;
    }
    let fen = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        if (board[r][c]) {
          if (empty > 0) { fen += empty; empty = 0; }
          fen += board[r][c];
        } else {
          empty++;
        }
      }
      if (empty > 0) fen += empty;
      if (r < 7) fen += '/';
    }
    return `${fen} w - - 0 1`;
  };

  const selectHero = (hero: ChessHero) => {
    setActiveHero(hero);
    setHeroBoardFen(hero.fen);
    setHeroCompleted(false);
    speakCheer(`Meet ${hero.name}! ${hero.motto}`);
  };

  const handleHeroPieceDrop = (arg0: any, arg1?: any): boolean => {
    const from = extractSquare(arg0?.sourceSquare || arg0);
    const to = extractSquare(arg0?.targetSquare || arg1);
    if (!to) return false;

    if (to === activeHero.targetSquare) {
      playVictoryFanfare();
      setHeroCompleted(true);
      setHeroBoardFen(getFenWithPieceOnSquare(activeHero.id, to));
      if (!heroBadgeUnlocked.includes(activeHero.id)) {
        setHeroBadgeUnlocked((prev) => [...prev, activeHero.id]);
      }
      speakCheer(`Heroic move! You unlocked the ${activeHero.name} superhero badge!`);
      return true;
    } else {
      playBoingSound();
      speakCheer(`Try again! Move ${activeHero.name} to ${activeHero.targetSquare.toUpperCase()}!`);
      return false;
    }
  };

  const handleHeroSquareClick = (rawSquare: any) => {
    if (heroCompleted) return;
    const sq = extractSquare(rawSquare);
    if (sq === activeHero.targetSquare) {
      handleHeroPieceDrop({ sourceSquare: '', targetSquare: sq });
    }
  };

  // ── Dynamic FEN Builders ───────────────────────────────────────────────────
  const getMazeBoardFen = (): string => {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const kCol = mazeKnightSquare.charCodeAt(0) - 97;
    const kRow = 8 - parseInt(mazeKnightSquare[1], 10);
    if (kRow >= 0 && kRow < 8 && kCol >= 0 && kCol < 8) {
      board[kRow][kCol] = 'N';
    }

    let fen = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        if (board[r][c]) {
          if (empty > 0) { fen += empty; empty = 0; }
          fen += board[r][c];
        } else {
          empty++;
        }
      }
      if (empty > 0) fen += empty;
      if (r < 7) fen += '/';
    }
    return `${fen} w - - 0 1`;
  };

  const getSprintBoardFen = (): string => {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));

    // White pawn (transforms into Queen on rank 8)
    if (sprintWhitePawn && sprintWhitePawn.length >= 2) {
      const wCol = sprintWhitePawn.charCodeAt(0) - 97;
      const wRow = 8 - parseInt(sprintWhitePawn[1], 10);
      if (wRow >= 0 && wRow < 8 && wCol >= 0 && wCol < 8) {
        board[wRow][wCol] = sprintWhitePawn[1] === '8' ? 'Q' : 'P';
      }
    }

    // Black pawn (transforms into Queen on rank 1)
    if (sprintBlackPawn && sprintBlackPawn.length >= 2) {
      const bCol = sprintBlackPawn.charCodeAt(0) - 97;
      const bRow = 8 - parseInt(sprintBlackPawn[1], 10);
      if (bRow >= 0 && bRow < 8 && bCol >= 0 && bCol < 8) {
        board[bRow][bCol] = sprintBlackPawn[1] === '1' ? 'q' : 'p';
      }
    }

    let fen = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        if (board[r][c]) {
          if (empty > 0) { fen += empty; empty = 0; }
          fen += board[r][c];
        } else {
          empty++;
        }
      }
      if (empty > 0) fen += empty;
      if (r < 7) fen += '/';
    }
    return `${fen} w - - 0 1`;
  };

  const getEscapeBoardFen = (): string => {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));

    // Black pieces
    board[0][0] = 'k'; // a8 King
    board[0][3] = 'r'; // d8 Rook
    board[0][4] = 'r'; // e8 Rook
    board[1][0] = 'p'; // a7
    board[1][1] = 'p'; // b7
    board[1][2] = 'p'; // c7

    // White castle shield pawns (f2, g2, h2)
    board[6][5] = 'P'; // f2
    board[6][6] = 'P'; // g2
    board[6][7] = 'P'; // h2

    // White King
    const kCol = escapeKingSquare.charCodeAt(0) - 97;
    const kRow = 8 - parseInt(escapeKingSquare[1], 10);
    if (kRow >= 0 && kRow < 8 && kCol >= 0 && kCol < 8) {
      board[kRow][kCol] = 'K';
    }

    // White Rook
    if (escapeKingSquare === 'g1') {
      board[7][5] = 'R'; // f1 castled
    } else {
      board[7][7] = 'R'; // h1 ready
    }

    let fen = '';
    for (let r = 0; r < 8; r++) {
      let empty = 0;
      for (let c = 0; c < 8; c++) {
        if (board[r][c]) {
          if (empty > 0) { fen += empty; empty = 0; }
          fen += board[r][c];
        } else {
          empty++;
        }
      }
      if (empty > 0) fen += empty;
      if (r < 7) fen += '/';
    }
    return `${fen} w - - 0 1`;
  };

  // Custom square styles
  const getMazeCustomSquareStyles = () => {
    const styles: Record<string, React.CSSProperties> = {};
    mazeStars.forEach((sq) => {
      styles[sq] = {
        background: 'radial-gradient(circle, rgba(234, 179, 8, 0.7) 40%, rgba(234, 179, 8, 0.2) 65%, transparent 70%)',
        boxShadow: 'inset 0 0 12px rgba(234, 179, 8, 0.9)',
        border: '2px solid rgba(234, 179, 8, 0.8)',
      };
    });
    mazeTraps.forEach((sq) => {
      styles[sq] = {
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.6) 40%, rgba(239, 68, 68, 0.2) 65%, transparent 70%)',
        boxShadow: 'inset 0 0 10px rgba(239, 68, 68, 0.9)',
      };
    });
    return styles;
  };

  const getHeroCustomSquareStyles = () => {
    const styles: Record<string, React.CSSProperties> = {};
    styles[activeHero.targetSquare] = {
      background: 'radial-gradient(circle, rgba(245, 158, 11, 0.7) 35%, rgba(245, 158, 11, 0.2) 65%, transparent 70%)',
      boxShadow: 'inset 0 0 14px rgba(245, 158, 11, 0.9)',
      border: '2px dashed #f59e0b',
    };
    return styles;
  };

  return (
    <div className="space-y-6">
      {/* Header Bar with Audio Control */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-2xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎮</span>
            <h1 className="text-xl font-extrabold text-white">Kids Chess Playground & Hero Academy</h1>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold border border-emerald-500/30">
              Interactive Minigames
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Learn how pieces jump, race, and conquer through fun mini-games and earn Superhero Badges!
          </p>
        </div>

        <button
          type="button"
          onClick={handleToggleSound}
          className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all flex items-center gap-2 ${
            soundMuted
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
          }`}
        >
          <span>{soundMuted ? '🔇 Voice & Sounds Muted' : '🔊 Voice Cheering ON'}</span>
        </button>
      </div>

      {/* Mode Navigation Tabs */}
      <div className="flex border-b border-slate-800 gap-2 text-xs overflow-x-auto pb-1">
        <button
          onClick={() => setActiveMode('maze')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeMode === 'maze'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>⭐ Knight’s Star Maze</span>
        </button>
        <button
          onClick={() => setActiveMode('sprint')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeMode === 'sprint'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🏃 Pawn Promotion Sprint</span>
        </button>
        <button
          onClick={() => setActiveMode('escape')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeMode === 'escape'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🏰 King’s Castle Escape</span>
        </button>
        <button
          onClick={() => setActiveMode('heroes')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeMode === 'heroes'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🦸 Chess Superhero Quests ({heroBadgeUnlocked.length}/5)</span>
        </button>
      </div>

      {/* ── 1. KNIGHT'S STAR MAZE ── */}
      {activeMode === 'maze' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-amber-500/30 bg-slate-950">
              <ChessboardComponent
                position={getMazeBoardFen()}
                onSquareClick={handleMazeSquareClick}
                onPieceDrop={handleMazePieceDrop}
                arePiecesDraggable={true}
                customSquareStyles={getMazeCustomSquareStyles()}
                customDarkSquareStyle={{ backgroundColor: '#334155' }}
                customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
              />
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="text-amber-400">⭐</span> Golden Stars: {mazeStars.length} left</span>
              <span className="flex items-center gap-1.5"><span className="text-rose-400">💥</span> Red Trap Squares</span>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Knight’s Star Maze Challenge</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                  Hop & Collect!
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Click on squares or drag your Knight in an <strong>L-shape</strong> (2 squares forward, 1 to the side). Collect all 5 golden stars while dodging the red trap squares!
              </p>
            </div>

            {/* Stars Remaining Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-slate-500 font-bold">Target Stars:</span>
              {['c2', 'e3', 'd5', 'f6', 'h7'].map((sq) => {
                const collected = !mazeStars.includes(sq);
                return (
                  <span
                    key={sq}
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1 transition-all ${
                      collected
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 line-through opacity-70'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                    }`}
                  >
                    <span>{sq.toUpperCase()}</span>
                    <span>{collected ? '✓' : '⭐'}</span>
                  </span>
                );
              })}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Stars Left</div>
                <div className="text-xl font-extrabold text-amber-400 mt-1">{mazeStars.length} / 5</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Moves Taken</div>
                <div className="text-xl font-extrabold text-white font-mono mt-1">{mazeMovesCount}</div>
              </div>
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
                <div className="text-[10px] text-slate-500 font-bold uppercase">Reward</div>
                <div className="text-xl font-extrabold text-emerald-400 mt-1">+25 XP</div>
              </div>
            </div>

            {mazeCompleted ? (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs space-y-2 animate-fadeIn">
                <div className="font-bold text-sm">🎉 Super Grandmaster Move!</div>
                <p>You navigated the star maze in {mazeMovesCount} moves! You earned +25 XP and the Knight Maze Star Master badge.</p>
                <button
                  type="button"
                  onClick={resetMaze}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
                >
                  Play Maze Again 🔄
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={resetMaze}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Reset Maze 🔄
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 2. PAWN PROMOTION SPRINT ── */}
      {activeMode === 'sprint' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-emerald-500/30 bg-slate-950">
              <ChessboardComponent
                position={getSprintBoardFen()}
                onSquareClick={handleSprintSquareClick}
                onPieceDrop={handleSprintPieceDrop}
                arePiecesDraggable={true}
                customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
                customLightSquareStyle={{ backgroundColor: '#64748b' }}
              />
            </div>
            <div className="mt-3 text-xs text-slate-400 flex items-center gap-4">
              <span>White Pawn: <strong className="text-emerald-400 uppercase font-mono">{sprintWhitePawn}</strong></span>
              <span>Computer Pawn: <strong className="text-rose-400 uppercase font-mono">{sprintBlackPawn}</strong></span>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Pawn Promotion Sprint Race</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                  Race to Rank 8!
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pawns can hop <strong>2 squares</strong> on their very first move from rank 2, then <strong>1 square</strong> at a time. Click buttons or drag the pawn directly on the board!
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                disabled={!!sprintWinner || sprintWhitePawn[1] !== '2'}
                onClick={() => handlePawnSprintStep(2)}
                className="flex-1 p-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl text-xs shadow-lg disabled:opacity-40 transition-all text-center"
              >
                🚀 Double Step (2 Squares)
                <span className="block text-[10px] font-normal opacity-80 mt-0.5">Starting square bonus</span>
              </button>
              <button
                type="button"
                disabled={!!sprintWinner}
                onClick={() => handlePawnSprintStep(1)}
                className="flex-1 p-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 disabled:opacity-40 transition-all text-center"
              >
                🚶 Single Step (1 Square)
                <span className="block text-[10px] font-normal opacity-80 mt-0.5">Careful forward march</span>
              </button>
            </div>

            {sprintWinner && (
              <div className={`p-4 rounded-2xl border text-xs space-y-2 animate-fadeIn ${
                sprintWinner === 'white'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
              }`}>
                <div className="font-bold text-sm">
                  {sprintWinner === 'white' ? '👑 Queen Promoted! You Won!' : '🏁 Black Pawn Reached First!'}
                </div>
                <p>
                  {sprintWinner === 'white'
                    ? 'Super sprint! You showed mastery of pawn promotion and earned +25 XP!'
                    : 'The computer reached the back rank first. Try starting with the 2-square double step next time!'}
                </p>
                <button
                  type="button"
                  onClick={resetSprint}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
                >
                  Race Again 🔄
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 3. KING'S CASTLE ESCAPE ── */}
      {activeMode === 'escape' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6 flex flex-col items-center">
            <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-blue-500/30 bg-slate-950">
              <ChessboardComponent
                position={getEscapeBoardFen()}
                onSquareClick={handleEscapeMove}
                onPieceDrop={handleEscapePieceDrop}
                arePiecesDraggable={true}
                customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
                customLightSquareStyle={{ backgroundColor: '#475569' }}
              />
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Target Safe Haven: <strong className="text-blue-400 font-mono uppercase">g1 Castle Square</strong>
            </div>
          </div>

          <div className="lg:col-span-6 space-y-4">
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>King’s Castle Escape</span>
                <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-bold">
                  Castling Protection
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                The center lines are under attack by enemy rooks! Click on square <strong>g1</strong> or drag the King to safely tuck behind your wall of pawns.
              </p>
            </div>

            {escapeCompleted ? (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs space-y-2 animate-fadeIn">
                <div className="font-bold text-sm">🏰 King is Safe in the Castle!</div>
                <p>Castling tucks your King into safety behind a wall of pawns and brings your Rook into active play! +25 XP awarded.</p>
                <button
                  type="button"
                  onClick={resetEscape}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all"
                >
                  Play Escape Again 🔄
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleEscapeMove('g1')}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl shadow transition-all"
                >
                  🏰 Castle King to g1!
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── 4. CHESS SUPERHERO QUESTS ── */}
      {activeMode === 'heroes' && (
        <div className="space-y-6">
          {/* Hero Selection Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {CHESS_HEROES.map((hero) => {
              const isSelected = activeHero.id === hero.id;
              const isUnlocked = heroBadgeUnlocked.includes(hero.id);
              return (
                <button
                  key={hero.id}
                  type="button"
                  onClick={() => selectHero(hero)}
                  className={`p-4 rounded-2xl border text-left transition-all relative ${
                    isSelected
                      ? 'bg-slate-800 border-amber-400 shadow-xl'
                      : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="text-3xl mb-1">{hero.emoji}</div>
                  <div className="text-xs font-bold text-white truncate">{hero.name}</div>
                  <div className="text-[10px] text-slate-400 truncate">{hero.title}</div>
                  {isUnlocked && (
                    <span className="absolute top-2 right-2 text-xs">⭐</span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Hero Challenge Board */}
          <div className={`p-6 rounded-3xl border bg-gradient-to-br from-slate-900 to-slate-950 ${activeHero.colorClass} shadow-xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center`}>
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full max-w-[340px] aspect-square rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700 bg-slate-950">
                <ChessboardComponent
                  position={heroBoardFen}
                  onPieceDrop={handleHeroPieceDrop}
                  onSquareClick={handleHeroSquareClick}
                  arePiecesDraggable={true}
                  customSquareStyles={getHeroCustomSquareStyles()}
                  customDarkSquareStyle={{ backgroundColor: '#334155' }}
                  customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                />
              </div>
              <div className="mt-3 text-xs text-slate-300">
                Target: Drag or click {activeHero.name} to <strong className="text-amber-400 uppercase font-mono">{activeHero.targetSquare}</strong>!
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{activeHero.emoji}</span>
                  <div>
                    <h3 className="font-extrabold text-base text-white">{activeHero.name}</h3>
                    <p className="text-xs text-amber-300 font-bold">{activeHero.title}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 italic">&ldquo;{activeHero.motto}&rdquo;</p>
              </div>

              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl space-y-1">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Superpower</div>
                <p className="text-xs text-slate-200">{activeHero.power}</p>
              </div>

              {heroCompleted ? (
                <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs space-y-2 animate-fadeIn">
                  <div className="font-bold text-sm">🎉 {activeHero.name} Badge Earned!</div>
                  <p>You proved mastery of {activeHero.name}&apos;s movement superpower! +25 XP awarded.</p>
                  <button
                    type="button"
                    onClick={() => selectHero(activeHero)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all"
                  >
                    Play Drill Again 🔄
                  </button>
                </div>
              ) : (
                <p className="text-xs text-slate-400">
                  Drag {activeHero.name} across the board to square <span className="font-mono text-amber-400 font-bold">{activeHero.targetSquare.toUpperCase()}</span> or click the square to unlock the superhero badge!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
