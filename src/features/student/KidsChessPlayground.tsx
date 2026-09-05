'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
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
  // Knight starts at a1. Stars to capture: c2, e3, d5, f6, h7
  const [mazeStars, setMazeStars] = useState<string[]>(['c2', 'e3', 'd5', 'f6', 'h7']);
  const [mazeKnightSquare, setMazeKnightSquare] = useState<string>('a1');
  const [mazeTraps] = useState<string[]>(['b3', 'd4']);
  const [mazeMovesCount, setMazeMovesCount] = useState(0);
  const [mazeCompleted, setMazeCompleted] = useState(false);

  // ── 2. Pawn Sprint State ────────────────────────────────────────────────────
  // White pawn on e2, Black pawn on a7
  const [sprintWhitePawn, setSprintWhitePawn] = useState('e2');
  const [sprintBlackPawn, setSprintBlackPawn] = useState('a7');
  const [sprintWinner, setSprintWinner] = useState<'white' | 'black' | null>(null);

  // ── 3. King Escape State ───────────────────────────────────────────────────
  // King on e1. Must reach g1 without landing on checked squares
  const [escapeKingSquare, setEscapeKingSquare] = useState('e1');
  const [escapeCompleted, setEscapeCompleted] = useState(false);

  // ── 4. Superhero Quest State ───────────────────────────────────────────────
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

  const isLegalKnightMove = (from: string, to: string): boolean => {
    const colDiff = Math.abs(from.charCodeAt(0) - to.charCodeAt(0));
    const rowDiff = Math.abs(parseInt(from[1]) - parseInt(to[1]));
    return (colDiff === 1 && rowDiff === 2) || (colDiff === 2 && rowDiff === 1);
  };

  const handleMazeSquareClick = (square: string) => {
    if (mazeCompleted) return;

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

  // ── 2. Pawn Sprint Logic ───────────────────────────────────────────────────
  const resetSprint = () => {
    setSprintWhitePawn('e2');
    setSprintBlackPawn('a7');
    setSprintWinner(null);
  };

  const handlePawnSprintStep = (stepCount: 1 | 2) => {
    if (sprintWinner) return;

    const col = sprintWhitePawn[0];
    const currentRow = parseInt(sprintWhitePawn[1]);

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
      const bCol = sprintBlackPawn[0];
      const bRow = parseInt(sprintBlackPawn[1]) - 1;
      const bSquare = `${bCol}${bRow}`;
      setSprintBlackPawn(bSquare);
      playMoveSound();

      if (bRow === 1) {
        setSprintWinner('black');
        playBoingSound();
        speakCheer('Black promoted first! Try moving 2 squares on turn 1 to win!');
      }
    }, 450);
  };

  // ── 3. King Escape Logic ───────────────────────────────────────────────────
  const resetEscape = () => {
    setEscapeKingSquare('e1');
    setEscapeCompleted(false);
  };

  const handleEscapeMove = (targetSq: string) => {
    if (escapeCompleted) return;
    const allowed = ['f1', 'g1'];
    if (allowed.includes(targetSq)) {
      setEscapeKingSquare(targetSq);
      playMoveSound();
      if (targetSq === 'g1') {
        setEscapeCompleted(true);
        playVictoryFanfare();
        speakCheer('The King reached the castle square safely! Castle complete!');
      } else {
        speakCheer('Good step! One more move to the castle!');
      }
    } else {
      playBoingSound();
      speakCheer('Watch out! The enemy rooks guard those squares! Move toward g1!');
    }
  };

  // ── 4. Superhero Quest Logic ───────────────────────────────────────────────
  const selectHero = (hero: ChessHero) => {
    setActiveHero(hero);
    setHeroBoardFen(hero.fen);
    setHeroCompleted(false);
    speakCheer(`Meet ${hero.name}! ${hero.motto}`);
  };

  const handleHeroPieceDrop = (sourceSquare: string, targetSquare: string): boolean => {
    if (targetSquare === activeHero.targetSquare) {
      playVictoryFanfare();
      setHeroCompleted(true);
      if (!heroBadgeUnlocked.includes(activeHero.id)) {
        setHeroBadgeUnlocked((prev) => [...prev, activeHero.id]);
      }
      speakCheer(`Heroic move! You unlocked the ${activeHero.name} superhero badge!`);
      return true;
    } else {
      playBoingSound();
      speakCheer(`Try again! Move ${activeHero.name} to ${activeHero.targetSquare}!`);
      return false;
    }
  };

  // Maze board FEN builder
  const getMazeBoardFen = (): string => {
    // Generate a simple FEN with a white knight on mazeKnightSquare
    const board = Array(8).fill(null).map(() => Array(8).fill(null));
    const kCol = mazeKnightSquare.charCodeAt(0) - 97;
    const kRow = 8 - parseInt(mazeKnightSquare[1]);
    board[kRow][kCol] = 'N';

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

  // Custom square styles for Maze stars and traps
  const getMazeCustomSquareStyles = () => {
    const styles: Record<string, React.CSSProperties> = {};
    mazeStars.forEach((sq) => {
      styles[sq] = {
        background: 'radial-gradient(circle, rgba(234, 179, 8, 0.45) 45%, transparent 46%)',
        position: 'relative',
      };
    });
    mazeTraps.forEach((sq) => {
      styles[sq] = {
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.35) 45%, transparent 46%)',
      };
    });
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
      <div className="flex border-b border-slate-800 gap-2 text-xs">
        <button
          onClick={() => setActiveMode('maze')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeMode === 'maze'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>⭐ Knight’s Star Maze</span>
        </button>
        <button
          onClick={() => setActiveMode('sprint')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeMode === 'sprint'
              ? 'border-emerald-500 text-emerald-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🏃 Pawn Promotion Sprint</span>
        </button>
        <button
          onClick={() => setActiveMode('escape')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 ${
            activeMode === 'escape'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <span>🏰 King’s Castle Escape</span>
        </button>
        <button
          onClick={() => setActiveMode('heroes')}
          className={`px-4 py-2.5 font-bold border-b-2 transition-colors flex items-center gap-2 ${
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
                customSquareStyles={getMazeCustomSquareStyles()}
                customDarkSquareStyle={{ backgroundColor: '#334155' }}
                customLightSquareStyle={{ backgroundColor: '#94a3b8' }}
              />
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5"><span className="text-amber-400">⭐</span> Collect Stars</span>
              <span className="flex items-center gap-1.5"><span className="text-rose-400">💥</span> Avoid Traps</span>
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
                Click on squares to hop your Knight in an <strong>L-shape</strong> (2 squares forward, 1 to the side). Collect all 5 golden stars while dodging the red trap squares!
              </p>
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
                position={`8/p7/8/8/8/8/4P3/8 w - - 0 1`.replace('p', sprintBlackPawn === 'a7' ? 'p' : '8').replace('P', sprintWhitePawn === 'e2' ? 'P' : '8')}
                customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
                customLightSquareStyle={{ backgroundColor: '#64748b' }}
              />
            </div>
            <div className="mt-3 text-xs text-slate-400 flex items-center gap-4">
              <span>White Pawn: <strong className="text-emerald-400 uppercase">{sprintWhitePawn}</strong></span>
              <span>Computer Pawn: <strong className="text-rose-400 uppercase">{sprintBlackPawn}</strong></span>
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
                Pawns can hop <strong>2 squares</strong> on their very first move, then <strong>1 square</strong> at a time. The first pawn to reach the opposite end transforms into a Queen!
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
                <span className="block text-[10px] font-normal opacity-80 mt-0.5">Only from starting square!</span>
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
                position={`r3k2r/8/8/8/8/8/8/4K2R w K - 0 1`}
                onSquareClick={handleEscapeMove}
                customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
                customLightSquareStyle={{ backgroundColor: '#475569' }}
              />
            </div>
            <div className="mt-3 text-xs text-slate-400">
              Target Safe Haven: <strong className="text-blue-400">g1 Castle Square</strong>
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
                The King is safe inside the castle walls! Click on the castle path squares (f1, g1) to tuck the White King into castle safety!
              </p>
            </div>

            {escapeCompleted ? (
              <div className="p-4 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs space-y-2 animate-fadeIn">
                <div className="font-bold text-sm">🏰 King is Safe in the Castle!</div>
                <p>Castling protects your King behind a wall of pawns and activates your Rook for battle! +25 XP awarded.</p>
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
                  customDarkSquareStyle={{ backgroundColor: '#334155' }}
                  customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                />
              </div>
              <div className="mt-3 text-xs text-slate-300">
                Goal: Drag {activeHero.name} to <strong className="text-amber-400 uppercase font-mono">{activeHero.targetSquare}</strong>!
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
                  Drag {activeHero.name} across the board to square <span className="font-mono text-amber-400 font-bold">{activeHero.targetSquare}</span> to unlock the superhero badge!
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
