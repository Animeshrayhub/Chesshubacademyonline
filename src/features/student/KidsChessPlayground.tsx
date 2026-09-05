'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
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
import { awardPlaygroundXpAction } from '@/actions/students';
import { getStudentPuzzleStats, saveStudentPuzzleStats } from '@/lib/puzzles/progress';

const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

// Universal square sanitizer that extracts 'e4' from any string or object
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

// ── 1. KNIGHT'S STAR MAZE DATA (5 TYPES / LEVELS) ────────────────────────────
export interface MazeLevel {
  id: number;
  title: string;
  ruleTag: string;
  description: string;
  knightStart: string;
  stars: string[];
  traps: string[];
}

export const MAZE_LEVELS: MazeLevel[] = [
  {
    id: 1,
    title: 'Type 1: The First L-Hop',
    ruleTag: '2+1 L-Shape Jumps',
    description: 'Hop your white knight across the board collecting 3 golden stars. No traps on this training hop!',
    knightStart: 'b1',
    stars: ['c3', 'e4', 'f6'],
    traps: [],
  },
  {
    id: 2,
    title: 'Type 2: The Double Fork',
    ruleTag: 'Royal Fork Angles',
    description: 'Jump to squares that fork multiple stars! Collect 4 stars in minimum moves.',
    knightStart: 'd4',
    stars: ['b5', 'c6', 'e6', 'f5'],
    traps: ['c4', 'e4'],
  },
  {
    id: 3,
    title: 'Type 3: Trap Dodger',
    ruleTag: 'Dodge Red Danger Squares',
    description: 'Red squares are trapped by enemy arrows! Collect all 5 stars without stepping on any red trap square.',
    knightStart: 'a1',
    stars: ['c2', 'e3', 'd5', 'f6', 'h7'],
    traps: ['b3', 'd4', 'f5', 'g2'],
  },
  {
    id: 4,
    title: 'Type 4: Corner to Corner Leap',
    ruleTag: 'Long-Range Maneuver',
    description: 'Navigate your Knight from bottom-left corner across to the top-right corner to collect 5 stars!',
    knightStart: 'a1',
    stars: ['b3', 'd2', 'f3', 'e5', 'h8'],
    traps: ['c4', 'd4', 'f4'],
  },
  {
    id: 5,
    title: 'Type 5: Grandmaster Labyrinth',
    ruleTag: 'Master Knight Navigation',
    description: 'Collect all 6 stars through a tight labyrinth of trap squares. True Knight mastery!',
    knightStart: 'd1',
    stars: ['b2', 'a4', 'c5', 'e6', 'g5', 'h7'],
    traps: ['c3', 'e3', 'd4', 'f4'],
  },
];

// ── 2. PAWN PROMOTION SPRINT DATA (5 TYPES / LEVELS) ─────────────────────────
export interface SprintLevel {
  id: number;
  title: string;
  ruleTag: string;
  description: string;
  whitePawnStart: string;
  blackPawnStart: string;
  obstacleSquare?: string;
  targetRank: number;
  promotionPiece: 'Q' | 'N';
  explanation: string;
}

export const SPRINT_LEVELS: SprintLevel[] = [
  {
    id: 1,
    title: 'Type 1: The 2-Square Launchpad',
    ruleTag: '2 Squares from Starting Rank 2',
    description: 'Pawns can hop 2 squares on their very first move! Sprint your White pawn to rank 8 to crown a Queen.',
    whitePawnStart: 'e2',
    blackPawnStart: 'a7',
    targetRank: 8,
    promotionPiece: 'Q',
    explanation: 'Pawns can move 2 squares only on their very first move, then 1 square at a time!',
  },
  {
    id: 2,
    title: 'Type 2: Head-to-Head Speed Race',
    ruleTag: 'Tempo Advantage',
    description: 'Both pawns start on rank 2/7. Make sure you use the 2-square step on turn 1 to win the race!',
    whitePawnStart: 'd2',
    blackPawnStart: 'e7',
    targetRank: 8,
    promotionPiece: 'Q',
    explanation: 'You reached rank 8 first! Moving 2 squares on turn 1 gave you the winning tempo!',
  },
  {
    id: 3,
    title: 'Type 3: Diagonal Capture Sprint',
    ruleTag: 'Pawns Capture 1 Square Diagonally',
    description: 'An enemy pawn is on f5! Pawns capture 1 square diagonally! Capture f5 and sprint to promote!',
    whitePawnStart: 'e4',
    blackPawnStart: 'f5',
    targetRank: 8,
    promotionPiece: 'Q',
    explanation: 'Great diagonal capture! Pawns move forward, but capture diagonally!',
  },
  {
    id: 4,
    title: 'Type 4: Flank Pawn Sprint',
    ruleTag: 'Edge Runner Promotion',
    description: 'Run your h-pawn up the board edge against the computer’s c-pawn. Can you promote first?',
    whitePawnStart: 'h2',
    blackPawnStart: 'c7',
    targetRank: 8,
    promotionPiece: 'Q',
    explanation: 'Flank pawn promoted! You dominated the board edge!',
  },
  {
    id: 5,
    title: 'Type 5: Underpromotion to Knight',
    ruleTag: 'Underpromotion Master Trick',
    description: 'Reach rank 8 and promote into a Knight to deliver a surprise royal fork!',
    whitePawnStart: 'e7',
    blackPawnStart: 'a3',
    targetRank: 8,
    promotionPiece: 'N',
    explanation: 'Incredible underpromotion! You proved pawns can promote to any piece (Queen, Rook, Bishop, or Knight)!',
  },
];

// ── 3. KING'S CASTLE ESCAPE DATA (5 CASTLING RULE TYPES) ─────────────────────
export interface CastleLevel {
  id: number;
  title: string;
  ruleTag: string;
  description: string;
  color: 'white' | 'black';
  fen: string;
  kingStart: string;
  targetSquare: string;
  rookStart: string;
  rookTarget: string;
  explanation: string;
  blockedSquare?: string;
  blockWarning?: string;
}

export const CASTLE_LEVELS: CastleLevel[] = [
  {
    id: 1,
    title: 'Type 1: White Kingside Castle (O-O)',
    ruleTag: 'King hops 2 squares to g1, Rook hops to f1',
    description: 'Tuck the White King into kingside safety behind the f2, g2, h2 pawn wall! Drag King from e1 to g1.',
    color: 'white',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    kingStart: 'e1',
    targetSquare: 'g1',
    rookStart: 'h1',
    rookTarget: 'f1',
    explanation: 'Awesome! In Kingside castling, King hops 2 squares to g1, and Rook hops over to f1!',
  },
  {
    id: 2,
    title: 'Type 2: White Queenside Castle (O-O-O)',
    ruleTag: 'King hops 2 squares to c1, Rook hops to d1',
    description: 'Queenside castling moves the King to the left! Drag White King from e1 to c1. Watch the Rook leap to d1!',
    color: 'white',
    fen: 'r3k2r/pppq1ppp/2np1n2/2b1p1B1/2B1P1b1/2NP1N2/PPPQ1PPP/R3K2R w KQkq - 4 8',
    kingStart: 'e1',
    targetSquare: 'c1',
    rookStart: 'a1',
    rookTarget: 'd1',
    explanation: 'Perfect! In Queenside castling, King hops 2 squares to c1, and Rook hops over to d1!',
  },
  {
    id: 3,
    title: 'Type 3: Black Kingside Castle (O-O)',
    ruleTag: 'Black King hops from e8 to g8!',
    description: 'Now play as Black! Escape the center attack by castling your Black King from e8 to g8 behind your pawn fortress!',
    color: 'black',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R b KQkq - 5 4',
    kingStart: 'e8',
    targetSquare: 'g8',
    rookStart: 'h8',
    rookTarget: 'f8',
    explanation: 'Fantastic! Black King safely castled from e8 to g8, and Black Rook jumped to f8!',
  },
  {
    id: 4,
    title: 'Type 4: Cannot Castle Through Check!',
    ruleTag: 'Rule: No castling through attacked squares',
    description: 'The enemy Bishop on a6 is firing across f1! In official rules, King CANNOT castle through an attacked square! Click g1 to see why it is illegal.',
    color: 'white',
    fen: 'r3k2r/ppp2ppp/b2p1n2/4p3/4P3/8/PPPP1PPP/RNB1K2R w KQkq - 0 1',
    kingStart: 'e1',
    targetSquare: 'g1',
    rookStart: 'h1',
    rookTarget: 'f1',
    blockedSquare: 'f1',
    blockWarning: 'Illegal Move! The enemy Bishop controls f1! In official chess rules, a King can never castle through or into check!',
    explanation: 'Rule mastered! You learned that you cannot castle if any square the King passes through is under attack!',
  },
  {
    id: 5,
    title: 'Type 5: Castle & Attack with Rook Battery',
    ruleTag: 'Castle to seize open files',
    description: 'Castling is both defense and attack! Castle Queenside (e1 to c1) to activate your Rook directly down the open d-file!',
    color: 'white',
    fen: '3rk2r/pppb1ppp/8/8/8/8/PPP1PPPP/R3KBNR w KQk - 0 10',
    kingStart: 'e1',
    targetSquare: 'c1',
    rookStart: 'a1',
    rookTarget: 'd1',
    explanation: 'Brilliant! Castle complete and Rook controls the open file with maximum power!',
  },
];

// ── 4. SUPERHERO QUESTS DATA (5 HEROES) ──────────────────────────────────────
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

interface KidsChessPlaygroundProps {
  initialXp?: number;
  studentName?: string;
}

export default function KidsChessPlayground({
  initialXp = 0,
  studentName = 'Champion',
}: KidsChessPlaygroundProps) {
  const [activeMode, setActiveMode] = useState<PlaygroundMode>('maze');
  const [soundMuted, setSoundMuted] = useState(false);
  const [currentXp, setCurrentXp] = useState(initialXp);
  const [awardedChallenges, setAwardedChallenges] = useState<string[]>([]);
  const [floatingReward, setFloatingReward] = useState<{ xp: number; text: string } | null>(null);
  const [isAwardingXp, setIsAwardingXp] = useState(false);

  // ── 1. Knight's Star Maze State (5 Types) ───────────────────────────────────
  const [mazeLevelIdx, setMazeLevelIdx] = useState(0);
  const activeMazeLevel = MAZE_LEVELS[mazeLevelIdx];
  const [mazeStars, setMazeStars] = useState<string[]>(activeMazeLevel.stars);
  const [mazeKnightSquare, setMazeKnightSquare] = useState(activeMazeLevel.knightStart);
  const [mazeMovesCount, setMazeMovesCount] = useState(0);
  const [mazeCompleted, setMazeCompleted] = useState(false);

  // ── 2. Pawn Sprint State (5 Types) ──────────────────────────────────────────
  const [sprintLevelIdx, setSprintLevelIdx] = useState(0);
  const activeSprintLevel = SPRINT_LEVELS[sprintLevelIdx];
  const [sprintWhitePawn, setSprintWhitePawn] = useState(activeSprintLevel.whitePawnStart);
  const [sprintBlackPawn, setSprintBlackPawn] = useState(activeSprintLevel.blackPawnStart);
  const [sprintWinner, setSprintWinner] = useState<'white' | 'black' | null>(null);

  // ── 3. King Escape State (5 Castling Rule Types) ────────────────────────────
  const [castleLevelIdx, setCastleLevelIdx] = useState(0);
  const activeCastleLevel = CASTLE_LEVELS[castleLevelIdx];
  const [escapeKingSquare, setEscapeKingSquare] = useState(activeCastleLevel.kingStart);
  const [escapeCompleted, setEscapeCompleted] = useState(false);
  const [escapeWarning, setEscapeWarning] = useState('');

  // ── 4. Superhero Quests State (5 Heroes) ───────────────────────────────────
  const [activeHero, setActiveHero] = useState<ChessHero>(CHESS_HEROES[0]);
  const [heroBoardFen, setHeroBoardFen] = useState(CHESS_HEROES[0].fen);
  const [heroCompleted, setHeroCompleted] = useState(false);
  const [heroBadgeUnlocked, setHeroBadgeUnlocked] = useState<string[]>([]);

  useEffect(() => {
    setCurrentXp(initialXp);
  }, [initialXp]);

  useEffect(() => {
    setSoundMuted(isSoundMuted());

    const handleXpUpdate = (e: any) => {
      if (e.detail?.xp != null) {
        setCurrentXp(e.detail.xp);
      }
    };
    window.addEventListener('chesshub_xp_updated', handleXpUpdate);
    return () => window.removeEventListener('chesshub_xp_updated', handleXpUpdate);
  }, []);

  const handleToggleSound = () => {
    const next = toggleSoundMute();
    setSoundMuted(next);
  };

  const handleAwardPlaygroundXp = async (amount: number, challengeTitle: string) => {
    if (awardedChallenges.includes(challengeTitle)) return;
    setAwardedChallenges((prev) => [...prev, challengeTitle]);
    const nextXp = currentXp + amount;
    setCurrentXp(nextXp);
    setFloatingReward({ xp: amount, text: challengeTitle });
    setTimeout(() => setFloatingReward(null), 4500);

    try {
      setIsAwardingXp(true);
      const res = await awardPlaygroundXpAction(amount, challengeTitle);
      if (res.success && res.data?.xp != null) {
        setCurrentXp(res.data.xp);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('chesshub_xp_updated', { detail: { xp: res.data.xp } }));
          const local = getStudentPuzzleStats();
          if (local) {
            local.xp = res.data.xp;
            saveStudentPuzzleStats(local);
          }
        }
      }
    } catch (err) {
      console.error('Error awarding playground XP:', err);
    } finally {
      setIsAwardingXp(false);
    }
  };

  // ── Switch Maze Level ──────────────────────────────────────────────────────
  const selectMazeLevel = (idx: number) => {
    setMazeLevelIdx(idx);
    const lvl = MAZE_LEVELS[idx];
    setMazeStars(lvl.stars);
    setMazeKnightSquare(lvl.knightStart);
    setMazeMovesCount(0);
    setMazeCompleted(false);
    speakCheer(`${lvl.title}! ${lvl.ruleTag}`);
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

    if (activeMazeLevel.traps.includes(square)) {
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
        speakCheer('Fantastic hopping! You collected all stars and mastered this level!');
        handleAwardPlaygroundXp(25, `Knight's Star Maze: ${activeMazeLevel.title}`);
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

  // ── Switch Sprint Level ────────────────────────────────────────────────────
  const selectSprintLevel = (idx: number) => {
    setSprintLevelIdx(idx);
    const lvl = SPRINT_LEVELS[idx];
    setSprintWhitePawn(lvl.whitePawnStart);
    setSprintBlackPawn(lvl.blackPawnStart);
    setSprintWinner(null);
    speakCheer(`${lvl.title}! ${lvl.ruleTag}`);
  };

  const handlePawnSprintStep = (stepCount: 1 | 2) => {
    if (sprintWinner) return;

    const col = sprintWhitePawn[0];
    const currentRow = parseInt(sprintWhitePawn[1], 10);

    // Validation: 2 squares only allowed on rank 2
    if (stepCount === 2 && currentRow !== 2) {
      playBoingSound();
      speakCheer('Pawns can only move 2 squares from their starting square on rank 2!');
      return;
    }

    // Check diagonal capture level (Type 3)
    let nextCol = col;
    let nextRow = currentRow + stepCount;

    if (activeSprintLevel.id === 3 && currentRow === 4 && sprintBlackPawn === 'f5') {
      // Diagonal capture on f5
      nextCol = 'f';
      nextRow = 5;
      playCaptureSound();
    } else {
      playMoveSound();
    }

    if (nextRow > 8) return;

    const nextSquare = `${nextCol}${nextRow}`;
    setSprintWhitePawn(nextSquare);

    if (nextRow === activeSprintLevel.targetRank) {
      setSprintWinner('white');
      playVictoryFanfare();
      speakCheer(`Pawn reached rank 8 and crowned into a ${activeSprintLevel.promotionPiece === 'N' ? 'Knight' : 'Queen'}! Race won!`);
      handleAwardPlaygroundXp(25, `Pawn Sprint: ${activeSprintLevel.title}`);
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
          speakCheer('Black reached rank 1 first! Try using the 2-square step on turn 1 to win!');
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

    // Type 3 diagonal capture
    if (activeSprintLevel.id === 3 && curRow === 4 && targetSq === 'f5') {
      handlePawnSprintStep(1);
      return;
    }

    if (tgtCol !== curCol) {
      playBoingSound();
      speakCheer('Pawns move straight forward unless capturing diagonally!');
      return;
    }

    const diff = tgtRow - curRow;
    if (diff === 1) {
      handlePawnSprintStep(1);
    } else if (diff === 2 && curRow === 2) {
      handlePawnSprintStep(2);
    } else {
      playBoingSound();
      speakCheer('Click 1 square forward, or 2 squares from the starting line!');
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

  // ── Switch Castling Level (5 Rules Types) ───────────────────────────────────
  const selectCastleLevel = (idx: number) => {
    setCastleLevelIdx(idx);
    const lvl = CASTLE_LEVELS[idx];
    setEscapeKingSquare(lvl.kingStart);
    setEscapeCompleted(false);
    setEscapeWarning('');
    speakCheer(`${lvl.title}! ${lvl.ruleTag}`);
  };

  const handleCastleMove = (rawTarget: any) => {
    if (escapeCompleted) return;
    const targetSq = extractSquare(rawTarget);
    if (!targetSq) return;

    // Check Type 4: Cannot castle through check
    if (activeCastleLevel.id === 4) {
      if (targetSq === 'g1') {
        playBoingSound();
        setEscapeWarning(activeCastleLevel.blockWarning || 'Cannot castle through check!');
        speakCheer('Illegal Move! In official chess rules, a King can never castle through or into check!');
        return;
      }
    }

    // Valid Castling Drop / Click
    if (targetSq === activeCastleLevel.targetSquare) {
      setEscapeKingSquare(targetSq);
      setEscapeCompleted(true);
      setEscapeWarning('');
      playVictoryFanfare();
      speakCheer(activeCastleLevel.explanation);
      handleAwardPlaygroundXp(25, `King's Castle Escape: ${activeCastleLevel.title}`);
    } else {
      playBoingSound();
      speakCheer(`Move your King to ${activeCastleLevel.targetSquare.toUpperCase()} to complete the castle!`);
    }
  };

  const handleCastlePieceDrop = (arg0: any, arg1?: any): boolean => {
    const from = extractSquare(arg0?.sourceSquare || arg0);
    const to = extractSquare(arg0?.targetSquare || arg1);
    if (!from || !to) return false;

    // Check that ONLY the player's King is being moved
    if (from !== activeCastleLevel.kingStart) {
      playBoingSound();
      speakCheer(`Drag the King on ${activeCastleLevel.kingStart.toUpperCase()} to castle!`);
      return false;
    }

    handleCastleMove(to);
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
      handleAwardPlaygroundXp(30, `Superhero Badge: ${activeHero.name}`);
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

    // White pawn
    if (sprintWhitePawn && sprintWhitePawn.length >= 2) {
      const wCol = sprintWhitePawn.charCodeAt(0) - 97;
      const wRow = 8 - parseInt(sprintWhitePawn[1], 10);
      if (wRow >= 0 && wRow < 8 && wCol >= 0 && wCol < 8) {
        board[wRow][wCol] = sprintWhitePawn[1] === '8' ? activeSprintLevel.promotionPiece : 'P';
      }
    }

    // Black pawn
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

  const getCastleBoardFen = (): string => {
    try {
      const chess = new Chess(activeCastleLevel.fen);
      if (escapeCompleted) {
        // Castled position! Move King and Rook to their target squares
        chess.remove(activeCastleLevel.kingStart as any);
        chess.remove(activeCastleLevel.rookStart as any);
        const kingColor = activeCastleLevel.color === 'white' ? 'w' : 'b';
        chess.put({ type: 'k', color: kingColor }, activeCastleLevel.targetSquare as any);
        chess.put({ type: 'r', color: kingColor }, activeCastleLevel.rookTarget as any);
      }
      return chess.fen();
    } catch {
      return activeCastleLevel.fen;
    }
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
    activeMazeLevel.traps.forEach((sq) => {
      styles[sq] = {
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.6) 40%, rgba(239, 68, 68, 0.2) 65%, transparent 70%)',
        boxShadow: 'inset 0 0 10px rgba(239, 68, 68, 0.9)',
      };
    });
    return styles;
  };

  const getCastleCustomSquareStyles = () => {
    const styles: Record<string, React.CSSProperties> = {};
    styles[activeCastleLevel.targetSquare] = {
      background: 'radial-gradient(circle, rgba(59, 130, 246, 0.7) 35%, rgba(59, 130, 246, 0.2) 65%, transparent 70%)',
      boxShadow: 'inset 0 0 14px rgba(59, 130, 246, 0.9)',
      border: '2px dashed #3b82f6',
    };
    if (activeCastleLevel.blockedSquare) {
      styles[activeCastleLevel.blockedSquare] = {
        background: 'radial-gradient(circle, rgba(239, 68, 68, 0.7) 35%, rgba(239, 68, 68, 0.2) 65%, transparent 70%)',
        boxShadow: 'inset 0 0 12px rgba(239, 68, 68, 0.9)',
        border: '2px solid #ef4444',
      };
    }
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

  // Only allow dragging the active pieces
  const isCastlePieceDraggable = ({ piece }: { piece: string }): boolean => {
    if (activeCastleLevel.color === 'white') {
      return piece === 'wK';
    } else {
      return piece === 'bK';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Live Account XP Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <Link
          href="/dashboard/student"
          className="inline-flex items-center gap-1.5 text-xs font-black text-amber-400 hover:text-amber-300 transition-colors"
        >
          <span>←</span>
          <span>Back to Student Dashboard</span>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3.5 py-1.5 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-300 font-mono text-xs font-black flex items-center gap-1.5 shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <span>⚡</span>
            <span>{currentXp} XP in Live Account</span>
            {isAwardingXp && <span className="text-[10px] text-amber-200 animate-pulse">(Saving...)</span>}
          </div>
          <Link
            href="/dashboard/student#pet-gear"
            className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-slate-950 font-black text-xs shadow-gold transition-all flex items-center gap-1.5 active:scale-95"
          >
            <span>🎩</span>
            <span>Gear & Hats Shop</span>
            <span className="text-sm">➔</span>
          </Link>
        </div>
      </div>

      {/* Floating Victory XP Toast */}
      {floatingReward && (
        <div className="fixed top-6 right-6 z-50 p-4 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-amber-500 text-white shadow-2xl border-2 border-amber-300 flex items-center gap-3 animate-bounce max-w-sm">
          <div className="text-3xl">🎉</div>
          <div>
            <div className="font-black text-sm text-yellow-200">+{floatingReward.xp} Real XP Earned!</div>
            <div className="text-xs text-white/90 truncate">{floatingReward.text}</div>
            <div className="text-[10px] text-emerald-200 font-semibold">Credited live to your profile in database!</div>
          </div>
        </div>
      )}

      {/* Hero Arcade Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 border-2 border-slate-800 rounded-3xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/30 to-purple-500/30 border-2 border-amber-400/60 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(245,158,11,0.35)] flex-shrink-0 animate-pulse">
            🎮
          </div>
          <div className="space-y-1 text-left">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-black text-white tracking-wide">Kids Chess Playground & Hero Academy</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-black uppercase tracking-wider shadow">
                ★ 4 Chapters
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/30">
                20 Interactive Levels
              </span>
            </div>
            <p className="text-xs text-slate-300 max-w-xl font-medium">
              Hello <strong className="text-amber-300">{studentName}</strong>! Master Knight moves, Pawn promotions, and King castling rules to earn real XP for your Companion Hats & Gear!
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleSound}
          className={`relative z-10 px-4 py-2.5 rounded-2xl text-xs font-black border transition-all flex items-center gap-2 whitespace-nowrap shadow-lg ${
            soundMuted
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300 hover:bg-rose-500/25'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
          }`}
        >
          <span>{soundMuted ? '🔇 Voice & Sounds Muted' : '🔊 Cheering Voice ON'}</span>
        </button>
      </div>

      {/* Main Chapter Navigation Cards (4 Distinct Themes) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => setActiveMode('maze')}
          className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 relative overflow-hidden ${
            activeMode === 'maze'
              ? 'bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 text-slate-950 border-amber-300 shadow-[0_0_25px_rgba(245,158,11,0.45)] scale-[1.02]'
              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-amber-500/40 hover:bg-slate-900'
          }`}
        >
          <span className="text-2xl">⭐</span>
          <div className="truncate">
            <div className={`text-xs font-black tracking-wide ${activeMode === 'maze' ? 'text-slate-950' : 'text-amber-400'}`}>
              Chapter 1
            </div>
            <div className={`text-xs font-extrabold truncate ${activeMode === 'maze' ? 'text-slate-900' : 'text-white'}`}>
              Knight’s Star Maze
            </div>
            <div className={`text-[10px] ${activeMode === 'maze' ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
              5 Star Challenges
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('sprint')}
          className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 relative overflow-hidden ${
            activeMode === 'sprint'
              ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 text-slate-950 border-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.45)] scale-[1.02]'
              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:bg-slate-900'
          }`}
        >
          <span className="text-2xl">🏃</span>
          <div className="truncate">
            <div className={`text-xs font-black tracking-wide ${activeMode === 'sprint' ? 'text-slate-950' : 'text-emerald-400'}`}>
              Chapter 2
            </div>
            <div className={`text-xs font-extrabold truncate ${activeMode === 'sprint' ? 'text-slate-900' : 'text-white'}`}>
              Pawn Sprint
            </div>
            <div className={`text-[10px] ${activeMode === 'sprint' ? 'text-slate-800 font-bold' : 'text-slate-400'}`}>
              5 Promotion Races
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('escape')}
          className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 relative overflow-hidden ${
            activeMode === 'escape'
              ? 'bg-gradient-to-r from-blue-600 via-indigo-500 to-blue-500 text-white border-blue-300 shadow-[0_0_25px_rgba(59,130,246,0.45)] scale-[1.02]'
              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-blue-500/40 hover:bg-slate-900'
          }`}
        >
          <span className="text-2xl">🏰</span>
          <div className="truncate">
            <div className={`text-xs font-black tracking-wide ${activeMode === 'escape' ? 'text-white' : 'text-blue-400'}`}>
              Chapter 3
            </div>
            <div className={`text-xs font-extrabold truncate ${activeMode === 'escape' ? 'text-blue-50' : 'text-white'}`}>
              King’s Castle Escape
            </div>
            <div className={`text-[10px] ${activeMode === 'escape' ? 'text-blue-200 font-bold' : 'text-slate-400'}`}>
              5 Official Rules
            </div>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setActiveMode('heroes')}
          className={`p-3.5 rounded-2xl border text-left transition-all flex items-center gap-3 relative overflow-hidden ${
            activeMode === 'heroes'
              ? 'bg-gradient-to-r from-purple-600 via-fuchsia-500 to-rose-500 text-white border-rose-300 shadow-[0_0_25px_rgba(168,85,247,0.45)] scale-[1.02]'
              : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-purple-500/40 hover:bg-slate-900'
          }`}
        >
          <span className="text-2xl">🦸</span>
          <div className="truncate">
            <div className={`text-xs font-black tracking-wide ${activeMode === 'heroes' ? 'text-white' : 'text-rose-400'}`}>
              Chapter 4
            </div>
            <div className={`text-xs font-extrabold truncate ${activeMode === 'heroes' ? 'text-rose-50' : 'text-white'}`}>
              Superhero Quests
            </div>
            <div className={`text-[10px] ${activeMode === 'heroes' ? 'text-rose-200 font-bold' : 'text-slate-400'}`}>
              5 Hero Powers
            </div>
          </div>
        </button>
      </div>

      {/* ── 1. KNIGHT'S STAR MAZE (5 TYPES) ── */}
      {activeMode === 'maze' && (
        <div className="space-y-4">
          {/* 5 Levels Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {MAZE_LEVELS.map((lvl, idx) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => selectMazeLevel(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  mazeLevelIdx === idx
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 border-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.5)] font-black scale-105'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-amber-500/40 hover:bg-slate-900'
                }`}
              >
                {lvl.title}
              </button>
            ))}
          </div>

          <div className="bg-gradient-to-br from-amber-950/30 via-slate-950 to-indigo-950/40 border-2 border-amber-500/30 rounded-3xl p-6 shadow-[0_0_35px_rgba(245,158,11,0.12)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(245,158,11,0.25)] border-4 border-amber-400/60 bg-slate-950">
                <ChessboardComponent
                  position={getMazeBoardFen()}
                  onSquareClick={handleMazeSquareClick}
                  onPieceDrop={handleMazePieceDrop}
                  isDraggablePiece={({ piece }: { piece: string }) => piece === 'wN'}
                  arePiecesDraggable={true}
                  customSquareStyles={getMazeCustomSquareStyles()}
                  customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
                  customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                />
              </div>
              <div className="flex items-center gap-4 mt-3 text-xs text-slate-300">
                <span className="flex items-center gap-1.5"><span className="text-amber-400">⭐</span> Stars Remaining: <strong className="text-amber-300 font-mono">{mazeStars.length}</strong></span>
                {activeMazeLevel.traps.length > 0 && (
                  <span className="flex items-center gap-1.5"><span className="text-rose-400">💥</span> Red Traps: <strong className="text-rose-300 font-mono">{activeMazeLevel.traps.length}</strong></span>
                )}
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">{activeMazeLevel.title}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40">
                    {activeMazeLevel.ruleTag}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeMazeLevel.description}
                </p>
              </div>

              {/* Target Stars Checklist */}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-slate-400 font-bold">Stars:</span>
                {activeMazeLevel.stars.map((sq) => {
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
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Stars Left</div>
                  <div className="text-xl font-extrabold text-amber-400 mt-1">{mazeStars.length} / {activeMazeLevel.stars.length}</div>
                </div>
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Moves Taken</div>
                  <div className="text-xl font-extrabold text-white font-mono mt-1">{mazeMovesCount}</div>
                </div>
                <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Reward</div>
                  <div className="text-xl font-extrabold text-emerald-400 mt-1">+25 XP</div>
                </div>
              </div>

              {mazeCompleted ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-slate-900 to-amber-500/20 border-2 border-emerald-500/40 text-emerald-300 text-xs space-y-3 animate-fadeIn shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-sm flex items-center gap-1.5 text-white">
                      <span>🎉</span>
                      <span>Level Mastered!</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black border border-emerald-500/30">
                      +25 Real XP Saved
                    </span>
                  </div>
                  <p className="text-slate-200">
                    You conquered {activeMazeLevel.title} in {mazeMovesCount} moves! XP has been credited to your live profile.
                  </p>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {mazeLevelIdx < MAZE_LEVELS.length - 1 && (
                      <button
                        type="button"
                        onClick={() => selectMazeLevel(mazeLevelIdx + 1)}
                        className="px-4 py-2 bg-gradient-to-r from-amber-400 to-yellow-400 hover:from-amber-300 hover:to-yellow-300 text-slate-950 font-black rounded-xl transition-all shadow-gold flex items-center gap-1"
                      >
                        <span>Next Level</span>
                        <span>➡️</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => selectMazeLevel(mazeLevelIdx)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                    >
                      Play Again 🔄
                    </button>
                    <Link
                      href="/dashboard/student#pet-gear"
                      className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white font-black rounded-xl transition-all border border-indigo-400/30 flex items-center gap-1.5 shadow"
                    >
                      <span>🎩</span>
                      <span>Spend in Gear Shop</span>
                      <span>➔</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => selectMazeLevel(mazeLevelIdx)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors"
                >
                  Reset Level 🔄
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 2. PAWN PROMOTION SPRINT (5 TYPES) ── */}
      {activeMode === 'sprint' && (
        <div className="space-y-4">
          {/* 5 Levels Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {SPRINT_LEVELS.map((lvl, idx) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => selectSprintLevel(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  sprintLevelIdx === idx
                    ? 'bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 border-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.5)] font-black scale-105'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-emerald-500/40 hover:bg-slate-900'
                }`}
              >
                {lvl.title}
              </button>
            ))}
          </div>

          <div className="bg-gradient-to-br from-emerald-950/30 via-slate-950 to-teal-950/40 border-2 border-emerald-500/30 rounded-3xl p-6 shadow-[0_0_35px_rgba(16,185,129,0.12)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(16,185,129,0.25)] border-4 border-emerald-400/60 bg-slate-950">
                <ChessboardComponent
                  position={getSprintBoardFen()}
                  onSquareClick={handleSprintSquareClick}
                  onPieceDrop={handleSprintPieceDrop}
                  isDraggablePiece={({ piece }: { piece: string }) => piece === 'wP'}
                  arePiecesDraggable={true}
                  customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
                  customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                />
              </div>
              <div className="mt-3 text-xs text-slate-300 flex items-center gap-4">
                <span>White Pawn: <strong className="text-emerald-400 uppercase font-mono">{sprintWhitePawn}</strong></span>
                <span>Computer Pawn: <strong className="text-rose-400 uppercase font-mono">{sprintBlackPawn}</strong></span>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">{activeSprintLevel.title}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-black border border-emerald-500/40">
                    {activeSprintLevel.ruleTag}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeSprintLevel.description}
                </p>
              </div>

              {/* Pawn Sprint Track Distance Gauges */}
              <div className="space-y-2 p-3 bg-slate-950/80 border border-slate-800 rounded-xl">
                <div className="flex items-center justify-between text-[11px] font-bold">
                  <span className="text-emerald-400 flex items-center gap-1"><span>⚪</span> Your Pawn (White)</span>
                  <span className="font-mono text-white">Rank {sprintWhitePawn[1]} / 8 (Crown Queen)</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(10, ((parseInt(sprintWhitePawn[1], 10) - 2) / 6) * 100))}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[11px] font-bold pt-1">
                  <span className="text-rose-400 flex items-center gap-1"><span>⚫</span> Rival Pawn (Computer)</span>
                  <span className="font-mono text-slate-400">Rank {sprintBlackPawn[1]} / 1</span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-red-400 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(10, ((7 - parseInt(sprintBlackPawn[1], 10)) / 6) * 100))}%` }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={!!sprintWinner || sprintWhitePawn[1] !== '2'}
                  onClick={() => handlePawnSprintStep(2)}
                  className="flex-1 p-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs shadow-lg disabled:opacity-40 transition-all text-center"
                >
                  🚀 Turbo 2-Square Leap
                  <span className="block text-[10px] font-normal opacity-90 mt-0.5">Rank 2 Starting Rule</span>
                </button>
                <button
                  type="button"
                  disabled={!!sprintWinner}
                  onClick={() => handlePawnSprintStep(1)}
                  className="flex-1 p-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs border border-slate-700 disabled:opacity-40 transition-all text-center"
                >
                  🚶 1-Square March
                  <span className="block text-[10px] font-normal opacity-80 mt-0.5">Step / Capture Diagonal</span>
                </button>
              </div>

              {sprintWinner && (
                <div className={`p-4 rounded-2xl border-2 text-xs space-y-3 animate-fadeIn shadow-2xl ${
                  sprintWinner === 'white'
                    ? 'bg-gradient-to-r from-emerald-500/20 via-slate-900 to-teal-500/20 border-emerald-500/50 text-emerald-300'
                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="font-black text-sm text-white flex items-center gap-1.5">
                      <span>{sprintWinner === 'white' ? '👑' : '🏁'}</span>
                      <span>{sprintWinner === 'white' ? `Promoted to ${activeSprintLevel.promotionPiece === 'N' ? 'Knight' : 'Queen'}! You Won!` : 'Black Pawn Reached First!'}</span>
                    </div>
                    {sprintWinner === 'white' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black border border-emerald-500/30">
                        +25 Real XP Saved
                      </span>
                    )}
                  </div>
                  <p className="text-slate-200">
                    {sprintWinner === 'white'
                      ? activeSprintLevel.explanation
                      : 'The computer reached first. Try starting with the 2-square double step to seize the tempo!'}
                  </p>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {sprintLevelIdx < SPRINT_LEVELS.length - 1 && (
                      <button
                        type="button"
                        onClick={() => selectSprintLevel(sprintLevelIdx + 1)}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl transition-all shadow-lg flex items-center gap-1"
                      >
                        <span>Next Level</span>
                        <span>➡️</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => selectSprintLevel(sprintLevelIdx)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                    >
                      Race Again 🔄
                    </button>
                    <Link
                      href="/dashboard/student#pet-gear"
                      className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white font-black rounded-xl transition-all border border-indigo-400/30 flex items-center gap-1.5 shadow"
                    >
                      <span>🎩</span>
                      <span>Spend in Gear Shop</span>
                      <span>➔</span>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 3. KING'S CASTLE ESCAPE & RULES (5 CASTLING RULE TYPES) ── */}
      {activeMode === 'escape' && (
        <div className="space-y-4">
          {/* 5 Rules Types Selector */}
          <div className="flex items-center gap-2 flex-wrap">
            {CASTLE_LEVELS.map((lvl, idx) => (
              <button
                key={lvl.id}
                type="button"
                onClick={() => selectCastleLevel(idx)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                  castleLevelIdx === idx
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-500 text-white border-blue-300 shadow-[0_0_15px_rgba(59,130,246,0.5)] font-black scale-105'
                    : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:border-blue-500/40 hover:bg-slate-900'
                }`}
              >
                {lvl.title}
              </button>
            ))}
          </div>

          <div className="bg-gradient-to-br from-blue-950/30 via-slate-950 to-indigo-950/40 border-2 border-blue-500/30 rounded-3xl p-6 shadow-[0_0_35px_rgba(59,130,246,0.12)] grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full max-w-[360px] aspect-square rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(59,130,246,0.25)] border-4 border-blue-400/60 bg-slate-950">
                <ChessboardComponent
                  position={getCastleBoardFen()}
                  boardOrientation={activeCastleLevel.color}
                  onSquareClick={handleCastleMove}
                  onPieceDrop={handleCastlePieceDrop}
                  isDraggablePiece={isCastlePieceDraggable}
                  arePiecesDraggable={true}
                  customSquareStyles={getCastleCustomSquareStyles()}
                  customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
                  customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                />
              </div>
              <div className="mt-3 text-xs text-slate-300 flex items-center gap-3">
                <span>Playing as: <strong className="uppercase font-black text-amber-400">{activeCastleLevel.color}</strong></span>
                <span>Safe Haven: <strong className="text-blue-400 font-mono uppercase font-black">{activeCastleLevel.targetSquare}</strong></span>
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-black text-white">{activeCastleLevel.title}</h2>
                  <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 text-[10px] font-black border border-blue-500/40">
                    {activeCastleLevel.ruleTag}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {activeCastleLevel.description}
                </p>
              </div>

              {escapeWarning && (
                <div className="p-3 bg-rose-500/15 border-2 border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold animate-shake">
                  ⚠️ {escapeWarning}
                </div>
              )}

              {escapeCompleted ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-blue-500/20 via-slate-900 to-indigo-500/20 border-2 border-blue-500/40 text-blue-300 text-xs space-y-3 animate-fadeIn shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-sm flex items-center gap-1.5 text-white">
                      <span>🏰</span>
                      <span>Castling Mastered!</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 font-mono font-black border border-blue-500/30">
                      +25 Real XP Saved
                    </span>
                  </div>
                  <p className="text-slate-200">{activeCastleLevel.explanation}</p>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    {castleLevelIdx < CASTLE_LEVELS.length - 1 && (
                      <button
                        type="button"
                        onClick={() => selectCastleLevel(castleLevelIdx + 1)}
                        className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 hover:from-blue-500 hover:to-indigo-400 text-white font-black rounded-xl transition-all shadow-lg flex items-center gap-1"
                      >
                        <span>Next Rule Level</span>
                        <span>➡️</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => selectCastleLevel(castleLevelIdx)}
                      className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
                    >
                      Play Again 🔄
                    </button>
                    <Link
                      href="/dashboard/student#pet-gear"
                      className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white font-black rounded-xl transition-all border border-indigo-400/30 flex items-center gap-1.5 shadow"
                    >
                      <span>🎩</span>
                      <span>Spend in Gear Shop</span>
                      <span>➔</span>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleCastleMove(activeCastleLevel.targetSquare)}
                    className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-500 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-black rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
                  >
                    <span>🏰</span>
                    <span>Castle King to {activeCastleLevel.targetSquare.toUpperCase()}! (O-O / O-O-O)</span>
                  </button>
                  <p className="text-[11px] text-slate-400 text-center font-medium">
                    (You can also drag the King directly to {activeCastleLevel.targetSquare.toUpperCase()})
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── 4. CHESS SUPERHERO QUESTS (5 HEROES) ── */}
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
                  className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden ${
                    isSelected
                      ? 'bg-slate-800 border-2 border-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.35)] scale-105'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="text-3xl mb-1">{hero.emoji}</div>
                  <div className="text-xs font-black text-white truncate">{hero.name}</div>
                  <div className="text-[10px] text-slate-300 truncate font-semibold">{hero.title}</div>
                  {isUnlocked && (
                    <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-400/40 text-[9px] font-black text-amber-300">
                      ⭐ UNLOCKED
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Hero Challenge Board */}
          <div className={`p-6 rounded-3xl border-2 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 ${activeHero.colorClass} shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-6 items-center`}>
            <div className="lg:col-span-6 flex flex-col items-center">
              <div className="w-full max-w-[340px] aspect-square rounded-2xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.2)] border-4 border-slate-700 bg-slate-950">
                <ChessboardComponent
                  position={heroBoardFen}
                  onPieceDrop={handleHeroPieceDrop}
                  onSquareClick={handleHeroSquareClick}
                  isDraggablePiece={({ piece }: { piece: string }) => piece.startsWith('w')}
                  arePiecesDraggable={true}
                  customSquareStyles={getHeroCustomSquareStyles()}
                  customDarkSquareStyle={{ backgroundColor: '#1e293b' }}
                  customLightSquareStyle={{ backgroundColor: '#cbd5e1' }}
                />
              </div>
              <div className="mt-3 text-xs text-slate-300">
                Target: Drag or click {activeHero.name} to <strong className="text-amber-400 uppercase font-mono font-black">{activeHero.targetSquare}</strong>!
              </div>
            </div>

            <div className="lg:col-span-6 space-y-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-3xl">{activeHero.emoji}</span>
                  <div>
                    <h3 className="font-black text-base text-white">{activeHero.name}</h3>
                    <p className="text-xs text-amber-300 font-bold">{activeHero.title}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-300 italic">&ldquo;{activeHero.motto}&rdquo;</p>
              </div>

              <div className="p-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl space-y-1">
                <div className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Superpower</div>
                <p className="text-xs text-slate-200 leading-relaxed">{activeHero.power}</p>
              </div>

              {heroCompleted ? (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/20 via-slate-900 to-amber-500/20 border-2 border-emerald-500/40 text-emerald-300 text-xs space-y-3 animate-fadeIn shadow-2xl">
                  <div className="flex items-center justify-between">
                    <div className="font-extrabold text-sm flex items-center gap-1.5 text-white">
                      <span>🎉</span>
                      <span>{activeHero.name} Badge Earned!</span>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-black border border-emerald-500/30">
                      +30 Real XP Saved
                    </span>
                  </div>
                  <p className="text-slate-200">
                    You proved mastery of {activeHero.name}&apos;s movement superpower! Badge and XP are saved to your account.
                  </p>
                  <div className="flex gap-2 pt-1 flex-wrap">
                    <button
                      type="button"
                      onClick={() => selectHero(activeHero)}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all shadow"
                    >
                      Play Drill Again 🔄
                    </button>
                    <Link
                      href="/dashboard/student#pet-gear"
                      className="px-4 py-2 bg-indigo-600/80 hover:bg-indigo-500 text-white font-black rounded-xl transition-all border border-indigo-400/30 flex items-center gap-1.5 shadow"
                    >
                      <span>🎩</span>
                      <span>Spend in Gear Shop</span>
                      <span>➔</span>
                    </Link>
                  </div>
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
