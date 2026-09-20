'use client';

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Chess } from 'chess.js';
import dynamic from 'next/dynamic';
import { wrapChessboard } from '@/components/dashboard/ui/ChessboardWrapper';
import { TACTICAL_QUIZ_QUESTIONS, type TacticalQuestion, type TacticalOption } from '@/lib/bot-training/tacticalQuizData';
import { playChessSound, speakCoachAdvice } from '@/utils/chessAudio';
import { playMoveSound, playCaptureSound, playCheckSound, playVictoryFanfare, playBoingSound } from '@/utils/kidAudio';

const ChessboardComponent = dynamic(
  () => import('react-chessboard').then((mod) => wrapChessboard(mod.Chessboard)),
  { ssr: false }
) as any;

export interface BoardTheme {
  id: string;
  name: string;
  darkSquare: string;
  lightSquare: string;
  accent: string;
  icon: string;
}

export const QUEST_BOARD_THEMES: Record<string, BoardTheme> = {
  tournament: {
    id: 'tournament',
    name: 'Tournament Emerald',
    darkSquare: '#769656',
    lightSquare: '#eeeed2',
    accent: '#10b981',
    icon: '🌲',
  },
  wood: {
    id: 'wood',
    name: 'Classic Wood',
    darkSquare: '#b58863',
    lightSquare: '#f0d9b5',
    accent: '#d97706',
    icon: '🪵',
  },
  slate: {
    id: 'slate',
    name: 'Midnight Slate',
    darkSquare: '#475569',
    lightSquare: '#cbd5e1',
    accent: '#64748b',
    icon: '🌌',
  },
  ocean: {
    id: 'ocean',
    name: 'Ice Blue',
    darkSquare: '#2563eb',
    lightSquare: '#e0e7ff',
    accent: '#3b82f6',
    icon: '❄️',
  },
};

interface TacticalQuestArenaProps {
  onXpEarned?: (xp: number) => void;
  voiceEnabled?: boolean;
  soundEnabled?: boolean;
}

export default function TacticalQuestArena({
  onXpEarned,
  voiceEnabled = true,
  soundEnabled = true,
}: TacticalQuestArenaProps) {
  // Navigation & Quest Index
  const [activeQuestIndex, setActiveQuestIndex] = useState<number>(0);
  const currentQuest = TACTICAL_QUIZ_QUESTIONS[activeQuestIndex] || TACTICAL_QUIZ_QUESTIONS[0];

  // Board Theme & Orientation State (Decisions Q2 & Q3)
  const [currentThemeId, setCurrentThemeId] = useState<string>('tournament');
  const theme = QUEST_BOARD_THEMES[currentThemeId] || QUEST_BOARD_THEMES.tournament;
  const [isFlippedManual, setIsFlippedManual] = useState<boolean | null>(null);

  // Derive board orientation: Default to player's turn side (Q3) unless manually flipped
  const boardOrientation: 'white' | 'black' = useMemo(() => {
    if (isFlippedManual !== null) {
      return isFlippedManual ? 'black' : 'white';
    }
    return currentQuest.turn === 'b' ? 'black' : 'white';
  }, [isFlippedManual, currentQuest.turn]);

  // Chess Game State for the active position
  const [game, setGame] = useState<Chess>(() => new Chess(currentQuest.fen));
  const [boardFen, setBoardFen] = useState<string>(currentQuest.fen);

  // Interaction & Solution States
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState<boolean>(false);
  const [isCorrectSolve, setIsCorrectSolve] = useState<boolean | null>(null);
  const [isRefuting, setIsRefuting] = useState<boolean>(false);
  const [pinnedWarning, setPinnedWarning] = useState<string | null>(null);

  // Lifelines & Assist Features (Decisions Q16 & Q19)
  const [fiftyFiftyUsed, setFiftyFiftyUsed] = useState<boolean>(false);
  const [hiddenOptionIndices, setHiddenOptionIndices] = useState<number[]>([]);
  const [questStatuses, setQuestStatuses] = useState<Record<number, 'solved' | 'failed' | 'current'>>({
    0: 'current',
  });
  const [scoreCount, setScoreCount] = useState<number>(0);
  const [showXpParticle, setShowXpParticle] = useState<boolean>(false);
  const [showGrandTrophyModal, setShowGrandTrophyModal] = useState<boolean>(false);

  // Timers ref for refutation auto-reset (Decision Q29)
  const autoResetTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Reset/Initialize position when active quest changes
  useEffect(() => {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);

    const newGame = new Chess(currentQuest.fen);
    setGame(newGame);
    setBoardFen(currentQuest.fen);
    setSelectedSquare(null);
    setSelectedOptionIndex(null);
    setIsSubmitted(false);
    setIsCorrectSolve(null);
    setIsRefuting(false);
    setPinnedWarning(null);
    setFiftyFiftyUsed(false);
    setHiddenOptionIndices([]);
    setIsFlippedManual(null); // Reset manual flip so auto-orient applies for new quest

    setQuestStatuses((prev) => ({
      ...prev,
      [activeQuestIndex]: prev[activeQuestIndex] || 'current',
    }));

    // Pre-move animation if setupFen is available (Decision Q24)
    if (currentQuest.setupFen && currentQuest.threatMove) {
      const setupGame = new Chess(currentQuest.setupFen);
      setGame(setupGame);
      setBoardFen(currentQuest.setupFen);

      const animTimer = setTimeout(() => {
        try {
          setupGame.move({
            from: currentQuest.threatMove!.from,
            to: currentQuest.threatMove!.to,
          });
          setGame(new Chess(setupGame.fen()));
          setBoardFen(setupGame.fen());
          if (soundEnabled) playMoveSound();
        } catch {}
      }, 500);

      return () => clearTimeout(animTimer);
    }
  }, [activeQuestIndex, currentQuest, soundEnabled]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    };
  }, []);

  // 50/50 Lifeline handler (Decision Q16)
  const handleUseFiftyFifty = () => {
    if (fiftyFiftyUsed || isSubmitted) return;
    setFiftyFiftyUsed(true);

    const wrongIndices = currentQuest.options
      .map((opt, idx) => (!opt.isCorrect ? idx : -1))
      .filter((idx) => idx !== -1);

    // Shuffle and pick 2 wrong options to hide
    const shuffledWrong = [...wrongIndices].sort(() => 0.5 - Math.random());
    const toHide = shuffledWrong.slice(0, 2);
    setHiddenOptionIndices(toHide);

    try {
      playBoingSound();
    } catch {}
  };

  // Replay threat move (Decision Q24)
  const handleReplayThreat = () => {
    if (!currentQuest.setupFen || !currentQuest.threatMove) return;
    const setupGame = new Chess(currentQuest.setupFen);
    setGame(setupGame);
    setBoardFen(currentQuest.setupFen);

    setTimeout(() => {
      try {
        setupGame.move({
          from: currentQuest.threatMove!.from,
          to: currentQuest.threatMove!.to,
        });
        setGame(new Chess(setupGame.fen()));
        setBoardFen(setupGame.fen());
        if (soundEnabled) playMoveSound();
      } catch {}
    }, 400);
  };

  // Reset board to initial quest position (Decision Q29)
  const handleResetBoard = useCallback(() => {
    if (autoResetTimerRef.current) clearTimeout(autoResetTimerRef.current);
    const freshGame = new Chess(currentQuest.fen);
    setGame(freshGame);
    setBoardFen(currentQuest.fen);
    setSelectedSquare(null);
    setIsRefuting(false);
    setPinnedWarning(null);
    if (!isSubmitted) {
      setSelectedOptionIndex(null);
    }
  }, [currentQuest.fen, isSubmitted]);

  // Handle move execution on the board or via option click (Decisions Q1, Q6, Q9, Q12)
  const executeMoveAction = useCallback(
    (moveUci: string, matchedOptionIdx?: number) => {
      if (isSubmitted || isRefuting) return;

      const from = moveUci.slice(0, 2);
      const to = moveUci.slice(2, 4);
      const promotion = moveUci.slice(4, 5) || undefined;

      // Find matching option if not explicitly passed
      const targetOptionIdx =
        matchedOptionIdx !== undefined
          ? matchedOptionIdx
          : currentQuest.options.findIndex((opt) => opt.moveUci === moveUci);

      const chosenOption = targetOptionIdx !== -1 ? currentQuest.options[targetOptionIdx] : null;
      setSelectedOptionIndex(targetOptionIdx !== -1 ? targetOptionIdx : null);

      // Attempt move in chess engine
      try {
        const moveRes = game.move({ from, to, promotion: promotion || 'q' });
        if (!moveRes) return;

        setBoardFen(game.fen());
        if (soundEnabled) {
          if (moveRes.captured) playCaptureSound();
          else playMoveSound();
        }

        // Evaluate if correct or blunder
        const isCorrect = chosenOption?.isCorrect ?? false;
        setIsSubmitted(true);
        setIsCorrectSolve(isCorrect);

        if (isCorrect) {
          // Success! (Decision Q12)
          setQuestStatuses((prev) => ({ ...prev, [activeQuestIndex]: 'solved' }));
          setScoreCount((s) => s + 1);
          setShowXpParticle(true);
          setTimeout(() => setShowXpParticle(false), 2500);

          if (soundEnabled) {
            playVictoryFanfare();
            try { playChessSound('quiz_correct'); } catch {}
          }
          if (voiceEnabled) {
            speakCoachAdvice(`Excellent! ${chosenOption?.explanation || 'Great move!'}`, { force: true });
          }

          if (onXpEarned) {
            onXpEarned(currentQuest.xpReward);
          }

          // Check if all 10 completed
          const nextSolvedCount = scoreCount + 1;
          if (nextSolvedCount >= TACTICAL_QUIZ_QUESTIONS.length) {
            setShowGrandTrophyModal(true);
          }
        } else {
          // Blunder/Wrong move! (Decisions Q6 & Q29)
          setQuestStatuses((prev) => ({ ...prev, [activeQuestIndex]: 'failed' }));
          if (soundEnabled) {
            try { playChessSound('quiz_wrong'); } catch {}
          }

          // Check for refutation move by opponent (e.g. White plays 4. Qxf7#)
          if (chosenOption?.refutationUci) {
            setIsRefuting(true);
            const refFrom = chosenOption.refutationUci.slice(0, 2);
            const refTo = chosenOption.refutationUci.slice(2, 4);

            setTimeout(() => {
              try {
                const refMove = game.move({ from: refFrom, to: refTo });
                if (refMove) {
                  setBoardFen(game.fen());
                  if (soundEnabled) {
                    if (refMove.captured) playCaptureSound();
                    else playMoveSound();
                    if (game.inCheck()) playCheckSound();
                  }
                }
              } catch {}

              // Auto-reset after 3 seconds so students can try again (Decision Q29)
              autoResetTimerRef.current = setTimeout(() => {
                handleResetBoard();
                setIsSubmitted(false);
                setIsCorrectSolve(null);
                setSelectedOptionIndex(null);
              }, 3000);
            }, 600);
          } else {
            // General auto-reset after 3 seconds
            autoResetTimerRef.current = setTimeout(() => {
              handleResetBoard();
              setIsSubmitted(false);
              setIsCorrectSolve(null);
              setSelectedOptionIndex(null);
            }, 3000);
          }
        }
      } catch (err) {
        console.warn('Move execution error:', err);
      }
    },
    [
      isSubmitted,
      isRefuting,
      currentQuest,
      game,
      soundEnabled,
      voiceEnabled,
      activeQuestIndex,
      scoreCount,
      onXpEarned,
      handleResetBoard,
    ]
  );

  // Board Piece Drop (Drag & Drop) Handler (Decisions Q1 & Q8)
  const handlePieceDrop = useCallback(
    (sourceSquare: string, targetSquare: string) => {
      if (isSubmitted || isRefuting) return false;

      // Handle Pinned piece attempt (Decision Q20)
      if (currentQuest.pinnedSquares && sourceSquare === currentQuest.pinnedSquares.source) {
        setPinnedWarning(`This piece is pinned to your King on ${currentQuest.pinnedSquares.king.toUpperCase()}! Moving it is illegal.`);
        try { playBoingSound(); } catch {}
        setTimeout(() => setPinnedWarning(null), 3000);
        return false;
      }

      const moveUci = `${sourceSquare}${targetSquare}`;
      const matchingOptIdx = currentQuest.options.findIndex(
        (opt) => opt.moveUci && (opt.moveUci === moveUci || opt.moveUci.startsWith(moveUci))
      );

      if (matchingOptIdx !== -1) {
        executeMoveAction(currentQuest.options[matchingOptIdx].moveUci || moveUci, matchingOptIdx);
        return true;
      }

      // If legal move in engine, execute it
      try {
        const testGame = new Chess(game.fen());
        const move = testGame.move({ from: sourceSquare, to: targetSquare, promotion: 'q' });
        if (move) {
          executeMoveAction(moveUci);
          return true;
        }
      } catch {}

      return false;
    },
    [isSubmitted, isRefuting, currentQuest, game, executeMoveAction]
  );

  // Click-to-Move Square Click Handler (Decisions Q8 & Q23)
  const handleSquareClick = useCallback(
    (square: string) => {
      if (isSubmitted || isRefuting) return;

      // If a square was already selected and clicked another square -> execute move
      if (selectedSquare) {
        if (selectedSquare === square) {
          setSelectedSquare(null);
          return;
        }
        const moveUci = `${selectedSquare}${square}`;
        const matchingOptIdx = currentQuest.options.findIndex(
          (opt) => opt.moveUci && (opt.moveUci === moveUci || opt.moveUci.startsWith(moveUci))
        );

        if (matchingOptIdx !== -1) {
          executeMoveAction(currentQuest.options[matchingOptIdx].moveUci || moveUci, matchingOptIdx);
          setSelectedSquare(null);
          return;
        }

        try {
          const testGame = new Chess(game.fen());
          const move = testGame.move({ from: selectedSquare, to: square, promotion: 'q' });
          if (move) {
            executeMoveAction(moveUci);
            setSelectedSquare(null);
            return;
          }
        } catch {}

        setSelectedSquare(null);
      }

      // Check if clicking on friendly piece to select
      const piece = game.get(square as any);
      if (piece && piece.color === currentQuest.turn) {
        // Pinned piece check (Decision Q20)
        if (currentQuest.pinnedSquares && square === currentQuest.pinnedSquares.source) {
          setPinnedWarning(`This piece is pinned to your King on ${currentQuest.pinnedSquares.king.toUpperCase()}!`);
          try { playBoingSound(); } catch {}
          setTimeout(() => setPinnedWarning(null), 3000);
          return;
        }
        setSelectedSquare(square);
      } else {
        setSelectedSquare(null);
      }
    },
    [isSubmitted, isRefuting, selectedSquare, currentQuest, game, executeMoveAction]
  );

  // Destination dots & square styles (Decisions Q23 & Q25)
  const customSquareStyles = useMemo(() => {
    const styles: Record<string, React.CSSProperties> = {};

    // Highlight selected source square
    if (selectedSquare) {
      styles[selectedSquare] = {
        backgroundColor: 'rgba(245, 158, 11, 0.4)',
        boxShadow: 'inset 0 0 0 3px rgba(245, 158, 11, 0.9)',
      };

      // Destination legal dots & capture rings
      try {
        const legalMoves = game.moves({ square: selectedSquare as any, verbose: true });
        for (const m of legalMoves) {
          const isCapture = !!m.captured;
          styles[m.to] = isCapture
            ? {
                background: 'radial-gradient(circle, transparent 60%, rgba(239, 68, 68, 0.7) 64%)',
                borderRadius: '50%',
              }
            : {
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.65) 24%, transparent 26%)',
                borderRadius: '50%',
              };
        }
      } catch {}
    }

    // Checked King Crimson Radial Beacon (Decision Q25)
    if (game.inCheck()) {
      const turn = game.turn();
      const board = game.board();
      for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
          const p = board[r][c];
          if (p && p.type === 'k' && p.color === turn) {
            const file = String.fromCharCode(97 + c);
            const rank = 8 - r;
            const sq = `${file}${rank}`;
            styles[sq] = {
              background:
                'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.85) 0%, rgba(220, 38, 38, 0.35) 70%, transparent 100%)',
              animation: 'pulse 1.5s infinite',
            };
          }
        }
      }
    }

    // Pinned square highlight
    if (currentQuest.pinnedSquares) {
      styles[currentQuest.pinnedSquares.source] = {
        boxShadow: 'inset 0 0 0 2.5px #f43f5e',
      };
    }

    return styles;
  }, [selectedSquare, game, currentQuest]);

  // Tactical Arrows (Decision Q5)
  const boardArrows = useMemo(() => {
    const arr: Array<{ startSquare: string; endSquare: string; color: string }> = [];

    // Threat arrows (Amber / Red)
    if (currentQuest.threatArrows && !isCorrectSolve) {
      for (const [from, to] of currentQuest.threatArrows) {
        arr.push({
          startSquare: from,
          endSquare: to,
          color: 'rgba(239, 68, 68, 0.85)',
        });
      }
    }

    // Solution arrow (Glowing Green on solve)
    if (isCorrectSolve && currentQuest.solutionArrow) {
      arr.push({
        startSquare: currentQuest.solutionArrow[0],
        endSquare: currentQuest.solutionArrow[1],
        color: 'rgba(16, 185, 129, 0.95)',
      });
    }

    return arr;
  }, [currentQuest, isCorrectSolve]);

  return (
    <div className="space-y-4 font-sans text-slate-100 max-w-7xl mx-auto">
      {/* ═══════════════════════════════════════════════════════════════════
          TOP HEADER — SCORE TALLY & 10-QUEST STEPPER BAR (Decision Q14)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shrink-0">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-black text-white tracking-tight">
                Interactive Tactical Quests
              </h2>
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                10 Challenges
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Master opening traps, pins, forks, and checkmate defense with instant interactive feedback.
            </p>
          </div>
        </div>

        {/* Quest Score & XP */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Score</span>
            <span className="text-sm font-black text-amber-400">
              {scoreCount} / {TACTICAL_QUIZ_QUESTIONS.length} Solved
            </span>
          </div>

          <div className="h-8 w-px bg-slate-800" />

          <div className="text-right relative">
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Reward</span>
            <span className="text-sm font-black text-emerald-400">+{currentQuest.xpReward} XP</span>
            {showXpParticle && (
              <span className="absolute -top-4 right-0 text-xs font-black text-emerald-400 animate-bounce">
                +{currentQuest.xpReward} XP!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 10-Step Progress Stepper Bar (Decision Q14) */}
      <div className="bg-slate-950/80 border border-slate-800/90 rounded-xl p-2 shadow-inner flex items-center justify-between gap-1 overflow-x-auto">
        {TACTICAL_QUIZ_QUESTIONS.map((q, idx) => {
          const isCurrent = activeQuestIndex === idx;
          const status = questStatuses[idx];
          const isSolved = status === 'solved';
          const isFailed = status === 'failed';

          let badgeColor = 'bg-slate-900 border-slate-800 text-slate-500 hover:border-slate-700';
          if (isCurrent) {
            badgeColor = 'bg-amber-500/20 border-amber-500 text-amber-300 ring-2 ring-amber-500/30';
          } else if (isSolved) {
            badgeColor = 'bg-emerald-500/20 border-emerald-500 text-emerald-300';
          } else if (isFailed) {
            badgeColor = 'bg-rose-500/20 border-rose-500 text-rose-300';
          }

          return (
            <button
              key={q.id}
              type="button"
              onClick={() => setActiveQuestIndex(idx)}
              className={`flex-1 min-w-[56px] py-1.5 px-2 rounded-lg border text-xs font-black transition-all flex items-center justify-center gap-1 cursor-pointer ${badgeColor}`}
              title={`Quest ${idx + 1}: ${q.title}`}
            >
              <span>Q{idx + 1}</span>
              {isSolved && <span className="text-[10px]">✓</span>}
              {isFailed && <span className="text-[10px]">✕</span>}
            </button>
          );
        })}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          MAIN BALANCED MASTER LAYOUT (50/50 SPLIT — Decision Q4 & Q22)
      ═══════════════════════════════════════════════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ── LEFT COLUMN (CHESSBOARD & CONTROLS) ── */}
        <div className="lg:col-span-6 space-y-3">
          {/* Board Header Toolbar (Decisions Q17 & Q18) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-2.5 shadow-md flex items-center justify-between gap-2">
            {/* Dynamic Turn & Objective Badge (Decision Q18) */}
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-950 border border-slate-800 text-xs font-bold text-slate-200">
                <span className="text-base">{currentQuest.turn === 'b' ? '♟️' : '♙'}</span>
                <span>{currentQuest.turn === 'b' ? 'Black to Move' : 'White to Move'}</span>
              </span>
            </div>

            {/* Board Controls: Flip, Theme, 50/50, Reset */}
            <div className="flex items-center gap-1.5">
              {/* 50/50 Lifeline Button (Decision Q16) */}
              <button
                type="button"
                onClick={handleUseFiftyFifty}
                disabled={fiftyFiftyUsed || isSubmitted}
                className={`px-2.5 py-1 text-xs font-black rounded-xl border transition-all flex items-center gap-1 ${
                  fiftyFiftyUsed
                    ? 'bg-slate-900 border-slate-800 text-slate-600 cursor-not-allowed'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 border-amber-500/40 text-amber-300 shadow-xs cursor-pointer'
                }`}
                title="50/50 Lifeline: Eliminate 2 wrong options"
              >
                <span>50:50</span>
              </button>

              {/* Flip Board Button (Decision Q3) */}
              <button
                type="button"
                onClick={() => setIsFlippedManual((prev) => (prev === null ? boardOrientation === 'white' : !prev))}
                className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center text-sm shadow-xs transition-colors cursor-pointer"
                title="Flip Board Perspective"
              >
                🔄
              </button>

              {/* Board Theme Picker (Decision Q2) */}
              <div className="relative group">
                <select
                  value={currentThemeId}
                  onChange={(e) => setCurrentThemeId(e.target.value)}
                  className="px-2.5 py-1 text-xs font-bold rounded-xl bg-slate-950 border border-slate-800 text-slate-300 focus:outline-none focus:border-purple-500 cursor-pointer shadow-xs"
                  title="Switch Board Theme"
                >
                  {Object.values(QUEST_BOARD_THEMES).map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Reset Position Button (Decision Q29) */}
              <button
                type="button"
                onClick={handleResetBoard}
                className="w-8 h-8 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center text-xs shadow-xs transition-colors cursor-pointer"
                title="Reset Position"
              >
                ↺
              </button>
            </div>
          </div>

          {/* Warning Banner if piece is pinned (Decision Q20) */}
          {pinnedWarning && (
            <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-bold px-3 py-2 rounded-xl flex items-center gap-2 animate-in fade-in">
              <span>⚠️</span>
              <span>{pinnedWarning}</span>
            </div>
          )}

          {/* Refutation Alert Banner (Decision Q6) */}
          {isRefuting && (
            <div className="bg-rose-900/90 border border-rose-500 text-rose-100 text-xs font-black px-3 py-2 rounded-xl flex items-center justify-between gap-2 shadow-lg animate-pulse">
              <span className="flex items-center gap-1.5">
                <span>💥</span>
                <span>Opponent delivers punishing counter-move! Resetting in 3s...</span>
              </span>
              <button
                type="button"
                onClick={handleResetBoard}
                className="px-2 py-0.5 bg-white/20 hover:bg-white/30 rounded text-[10px] uppercase font-bold"
              >
                Try Now
              </button>
            </div>
          )}

          {/* ── THE CHESSBOARD (Decisions Q1, Q2, Q3, Q10, Q11, Q21) ── */}
          <div className="relative w-full max-w-[500px] aspect-square mx-auto rounded-2xl overflow-hidden border-2 border-slate-800/90 shadow-2xl bg-slate-950 select-none">
            <ChessboardComponent
              position={boardFen}
              boardOrientation={boardOrientation}
              arePiecesDraggable={!isSubmitted && !isRefuting}
              onPieceDrop={handlePieceDrop}
              onSquareClick={handleSquareClick}
              useDefaultPieces={true} // Crisp Native High-DPI Vector SVGs (Decision Q10)
              showBoardNotation={true} // High-contrast in-square coordinates (Decision Q11)
              animationDuration={250} // 250ms smooth tournament speed (Decision Q21)
              customDarkSquareStyle={{ backgroundColor: theme.darkSquare }}
              customLightSquareStyle={{ backgroundColor: theme.lightSquare }}
              customSquareStyles={customSquareStyles}
              customArrows={boardArrows}
            />
          </div>

          {/* Compact Move Notation Ribbon & PGN Strip (Decision Q27) */}
          {currentQuest.notationHistory && (
            <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl px-3 py-2 text-xs flex items-center justify-between gap-2 text-slate-400 overflow-x-auto">
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Setup:</span>
                <span className="font-mono text-slate-300">{currentQuest.notationHistory.join(' ')}</span>
              </div>
              {currentQuest.threatMove && (
                <button
                  type="button"
                  onClick={handleReplayThreat}
                  className="text-[10px] font-bold text-amber-400 hover:text-amber-300 hover:underline shrink-0 cursor-pointer flex items-center gap-1"
                >
                  <span>▶</span> Replay Move
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT COLUMN (QUESTION, OPTIONS & COACH INSIGHTS) ── */}
        <div className="lg:col-span-6 space-y-4">
          {/* Quest Card Title & Objective */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{currentQuest.icon}</span>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-400 font-black uppercase tracking-wider">
                      {currentQuest.theme}
                    </span>
                    {/* Difficulty Badge with Stars (Decision Q28) */}
                    <span className="text-[10px] text-slate-400 font-bold">
                      {currentQuest.difficulty === 'Beginner'
                        ? '★☆☆ Beginner'
                        : currentQuest.difficulty === 'Intermediate'
                        ? '★★☆ Intermediate'
                        : '★★★ Tactical'}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-white tracking-tight">
                    {currentQuest.title}
                  </h3>
                </div>
              </div>

              <span className="text-xs font-mono font-bold bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-slate-300">
                Quest {activeQuestIndex + 1} of {TACTICAL_QUIZ_QUESTIONS.length}
              </span>
            </div>

            {/* Problem Description */}
            <div className="text-xs sm:text-sm font-medium text-slate-200 leading-relaxed bg-slate-950/70 p-4 rounded-xl border border-slate-800/80">
              {currentQuest.question}
            </div>

            {/* Objective Banner */}
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-bold flex items-center gap-2">
              <span>🎯</span>
              <span>{currentQuest.objective}</span>
            </div>

            {/* Multiple Choice Option Cards (Decision Q13) */}
            <div className="space-y-2.5">
              {currentQuest.options.map((opt, idx) => {
                if (hiddenOptionIndices.includes(idx)) {
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-xl border border-slate-900 bg-slate-950/30 text-slate-600 text-xs italic line-through opacity-40 select-none"
                    >
                      Option {String.fromCharCode(65 + idx)} eliminated by 50/50
                    </div>
                  );
                }

                const isSelected = selectedOptionIndex === idx;
                let btnStyle = 'border-slate-800 bg-slate-950/80 hover:border-slate-700 text-slate-200 hover:bg-slate-950';

                if (isSubmitted) {
                  if (opt.isCorrect) {
                    btnStyle =
                      'border-emerald-500 bg-emerald-950/40 text-emerald-100 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-500';
                  } else if (isSelected && !opt.isCorrect) {
                    btnStyle =
                      'border-rose-500 bg-rose-950/40 text-rose-100 ring-1 ring-rose-500';
                  } else {
                    btnStyle = 'border-slate-900 bg-slate-950/40 text-slate-600 opacity-50';
                  }
                } else if (isSelected) {
                  btnStyle =
                    'border-amber-500 bg-amber-500/15 text-white ring-1 ring-amber-500 shadow-xs';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={isSubmitted || isRefuting}
                    onClick={() => {
                      if (opt.moveUci) {
                        executeMoveAction(opt.moveUci, idx);
                      } else {
                        // For pure concept quests without UCI moves
                        setSelectedOptionIndex(idx);
                        setIsSubmitted(true);
                        setIsCorrectSolve(opt.isCorrect);
                        if (opt.isCorrect) {
                          setQuestStatuses((prev) => ({ ...prev, [activeQuestIndex]: 'solved' }));
                          setScoreCount((s) => s + 1);
                          if (soundEnabled) playVictoryFanfare();
                          if (voiceEnabled) speakCoachAdvice(`Correct! ${opt.explanation}`, { force: true });
                          if (onXpEarned) onXpEarned(currentQuest.xpReward);
                        } else {
                          setQuestStatuses((prev) => ({ ...prev, [activeQuestIndex]: 'failed' }));
                          if (soundEnabled) try { playChessSound('quiz_wrong'); } catch {}
                        }
                      }
                    }}
                    className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-start gap-3 text-xs font-semibold cursor-pointer ${btnStyle}`}
                  >
                    <span className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[11px] shrink-0 text-slate-300 mt-0.5">
                      {String.fromCharCode(65 + idx)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="leading-snug">{opt.text}</div>
                    </div>
                    {isSubmitted && opt.isCorrect && <span className="text-emerald-400 font-black text-sm">✅</span>}
                    {isSubmitted && isSelected && !opt.isCorrect && <span className="text-rose-400 font-black text-sm">❌</span>}
                  </button>
                );
              })}
            </div>

            {/* Post-Submit Explanation & AI Coach Card (Decisions Q12 & Q15) */}
            {isSubmitted && selectedOptionIndex !== null && (
              <div className="space-y-3 pt-2 animate-in fade-in">
                <div
                  className={`p-4 rounded-xl border text-xs leading-relaxed ${
                    isCorrectSolve
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-100'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-100'
                  }`}
                >
                  <div className="font-black text-sm mb-1.5 flex items-center gap-1.5">
                    <span>{isCorrectSolve ? '🎉 EXCELLENT MOVE!' : '❌ TACTICAL MISTAKE!'}</span>
                  </div>
                  <p>{currentQuest.options[selectedOptionIndex].explanation}</p>
                </div>

                {/* AI Coach Card (Decision Q15) */}
                <div className="bg-slate-950 border border-amber-500/30 rounded-xl p-3.5 flex items-start gap-3 text-xs">
                  <div className="w-9 h-9 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg shrink-0">
                    👨‍🏫
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
                        Coach Grandmaster Tip
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          speakCoachAdvice(
                            `${currentQuest.options[selectedOptionIndex].explanation}. Coach tip: ${currentQuest.coachTip}`,
                            { force: true }
                          )
                        }
                        className="px-2 py-0.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[10px] font-bold border border-amber-500/40 flex items-center gap-1 cursor-pointer"
                        title="Listen to Coach Voice"
                      >
                        <span>🗣️</span>
                        <span>Listen</span>
                      </button>
                    </div>
                    <p className="text-slate-300 leading-relaxed italic">{currentQuest.coachTip}</p>
                  </div>
                </div>

                {/* Next Quest / Retry Buttons */}
                <div className="flex gap-3 pt-1">
                  {!isCorrectSolve && (
                    <button
                      type="button"
                      onClick={handleResetBoard}
                      className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      ↺ Try Again
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      const nextIdx = (activeQuestIndex + 1) % TACTICAL_QUIZ_QUESTIONS.length;
                      setActiveQuestIndex(nextIdx);
                    }}
                    className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    {activeQuestIndex + 1 < TACTICAL_QUIZ_QUESTIONS.length ? 'Next Quest ➡️' : '🔁 Start Over'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          GRAND TROPHY COMPLETION MODAL (Decision Q19)
      ═══════════════════════════════════════════════════════════════════ */}
      {showGrandTrophyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl max-w-md w-full p-6 shadow-2xl text-center space-y-4">
            <div className="text-5xl animate-bounce">🏆</div>
            <h3 className="text-xl font-black text-white tracking-tight">Tactical Master!</h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              Congratulations! You have completed all 10 Interactive Tactical Quests. You masterfully identified opening traps, pins, forks, and checkmate defense patterns!
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs font-bold text-amber-400">
              Score: {scoreCount} / {TACTICAL_QUIZ_QUESTIONS.length} Solved • +{TACTICAL_QUIZ_QUESTIONS.reduce((acc, q) => acc + q.xpReward, 0)} Total XP Earned!
            </div>
            <button
              type="button"
              onClick={() => setShowGrandTrophyModal(false)}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg transition-transform hover:scale-105 cursor-pointer"
            >
              Claim Rewards & Continue 🚀
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
