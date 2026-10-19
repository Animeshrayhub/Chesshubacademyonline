'use client';

import React, { useMemo, useRef, useEffect, useState } from 'react';
import { type MoveData, type ClassroomBookmark } from '@/lib/classroom-v2/types';
import { analyzeMoveHistory, type MoveEvaluation } from '@/lib/classroom-v2/chessEvaluator';
import { generateLessonPgn, downloadPgnFile, copyPgnToClipboard } from '@/lib/classroom-v2/pgnExporter';

interface ClassroomNotationProps {
  moves: MoveData[];
  currentMoveIndex: number;
  onNavigateMove?: (moveIndex: number) => void;
  isCoach: boolean;
  className?: string;
  initialFen?: string;
  bookmarks?: ClassroomBookmark[];
  gameTitle?: string;
  coachName?: string;
}

export default function ClassroomNotation({
  moves = [],
  currentMoveIndex = -1,
  onNavigateMove,
  isCoach,
  className = '',
  initialFen,
  bookmarks = [],
  gameTitle,
  coachName,
}: ClassroomNotationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedPgn, setCopiedPgn] = useState(false);

  // Toggle state for evaluation score and accuracy badges
  const [showEvalBadges, setShowEvalBadges] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('classroom_notation_show_eval');
        if (saved !== null) return saved === 'true';
      } catch {}
    }
    return true;
  });

  const handleToggleEvalBadges = () => {
    setShowEvalBadges((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('classroom_notation_show_eval', String(next));
      } catch {}
      return next;
    });
  };

  const handleExportPgn = async () => {
    if (moves.length === 0) return;
    const pgn = generateLessonPgn({
      className: gameTitle || 'ChessHub Academy Live Class',
      coachName: coachName || 'Coach',
      moves,
      initialFen,
      bookmarks,
    });
    downloadPgnFile(`${gameTitle || 'ChessHub_Lesson'}_${new Date().toISOString().split('T')[0]}`, pgn);
    await copyPgnToClipboard(pgn);
    setCopiedPgn(true);
    setTimeout(() => setCopiedPgn(false), 2500);
  };

  // Compute real-time evaluations and annotation badges for all moves
  const moveEvaluations = useMemo(() => {
    if (!showEvalBadges || moves.length === 0) return new Map<number, MoveEvaluation>();
    return analyzeMoveHistory(moves, initialFen);
  }, [moves, showEvalBadges, initialFen]);

  // Group moves by turn (White and Black pairs)
  const movePairs = useMemo(() => {
    const pairs: Array<{
      turnNumber: number;
      whiteMove?: MoveData;
      whiteIndex?: number;
      blackMove?: MoveData;
      blackIndex?: number;
    }> = [];

    for (let i = 0; i < moves.length; i += 2) {
      const turnNumber = Math.floor(i / 2) + 1;
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];

      pairs.push({
        turnNumber,
        whiteMove,
        whiteIndex: i,
        blackMove,
        blackIndex: blackMove ? i + 1 : undefined,
      });
    }

    return pairs;
  }, [moves]);

  // Auto-scroll to active move
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [moves.length, currentMoveIndex]);

  // Helper to render move badge
  const renderMoveBadge = (evalData?: MoveEvaluation, isActive?: boolean) => {
    if (!showEvalBadges || !evalData) return null;

    let badgeColors = 'bg-slate-800/90 text-slate-400 border-slate-700/80';
    if (evalData.annotation === 'blunder') {
      badgeColors = isActive
        ? 'bg-rose-950 text-rose-200 border-rose-400'
        : 'bg-rose-950/70 text-rose-300 border-rose-800/70';
    } else if (evalData.annotation === 'mistake') {
      badgeColors = isActive
        ? 'bg-amber-950 text-amber-200 border-amber-400'
        : 'bg-amber-950/70 text-amber-300 border-amber-800/70';
    } else if (evalData.annotation === 'inaccuracy') {
      badgeColors = isActive
        ? 'bg-yellow-950 text-yellow-200 border-yellow-400'
        : 'bg-yellow-950/70 text-yellow-300 border-yellow-800/70';
    } else if (evalData.annotation === 'best') {
      badgeColors = isActive
        ? 'bg-emerald-950 text-emerald-200 border-emerald-400'
        : 'bg-emerald-950/70 text-emerald-300 border-emerald-800/70';
    } else if (evalData.annotation === 'book') {
      badgeColors = isActive
        ? 'bg-sky-950 text-sky-200 border-sky-400'
        : 'bg-sky-950/70 text-sky-300 border-sky-800/70';
    }

    return (
      <span
        className={`ml-1 px-1 py-0.2 rounded text-[9px] font-mono border inline-flex items-center gap-0.5 leading-none shrink-0 ${badgeColors}`}
        title={`Eval: ${evalData.scoreText} ${evalData.annotation ? `(${evalData.annotation.toUpperCase()})` : ''}`}
      >
        <span>{evalData.scoreText}</span>
        {evalData.glyph && <span className="font-black text-[10px]">{evalData.glyph}</span>}
      </span>
    );
  };

  return (
    <div
      id="classroom-notation"
      className={`flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}
    >
      {/* Header with Title and Eval Toggle */}
      <div className="h-9 bg-slate-950/80 px-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-xs text-slate-300 tracking-wide uppercase">
            Moves ({moves.length})
          </span>
          <button
            type="button"
            onClick={handleToggleEvalBadges}
            className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border transition-colors flex items-center gap-1 cursor-pointer ${
              showEvalBadges
                ? 'bg-blue-600/30 text-blue-300 border-blue-500/50 shadow-xs'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title="Toggle Inline Move Quality and Real-Time Evaluation Badges"
          >
            <span>📊</span>
            <span>{showEvalBadges ? 'Evals ON' : 'Evals OFF'}</span>
          </button>
          <button
            type="button"
            disabled={moves.length === 0}
            onClick={handleExportPgn}
            className="px-2 py-0.5 rounded-lg text-[10px] font-bold border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white disabled:opacity-40 transition-colors flex items-center gap-1 cursor-pointer active:scale-95"
            title="Export / Download game moves and coach notes as PGN file"
          >
            <span>{copiedPgn ? '✓' : '📥'}</span>
            <span>{copiedPgn ? 'Copied' : 'PGN'}</span>
          </button>
        </div>
        <span className="text-[10px] text-slate-500 font-mono">
          {currentMoveIndex >= 0 ? `Move ${currentMoveIndex + 1}` : 'Start'}
        </span>
      </div>

      {/* Move List Table */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 space-y-0.5 text-xs font-mono select-none">
        {movePairs.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-500 text-xs text-center p-4">
            No moves played yet. Make moves on the board to build notation.
          </div>
        ) : (
          movePairs.map((pair) => (
            <div
              key={pair.turnNumber}
              className="grid grid-cols-[30px_1fr_1fr] items-center gap-1 px-1.5 py-0.5 rounded hover:bg-slate-800/40 transition-colors"
            >
              <span className="text-slate-500 font-bold text-[11px]">{pair.turnNumber}.</span>

              {/* White Move */}
              <button
                type="button"
                disabled={!onNavigateMove}
                onClick={() => pair.whiteIndex !== undefined && onNavigateMove?.(pair.whiteIndex)}
                className={`text-left px-2 py-1 rounded font-bold transition-all flex items-center justify-between group cursor-pointer ${
                  currentMoveIndex === pair.whiteIndex
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <span className="truncate">{pair.whiteMove?.san || ''}</span>
                {pair.whiteIndex !== undefined &&
                  renderMoveBadge(moveEvaluations.get(pair.whiteIndex), currentMoveIndex === pair.whiteIndex)}
              </button>

              {/* Black Move */}
              {pair.blackMove ? (
                <button
                  type="button"
                  disabled={!onNavigateMove}
                  onClick={() => pair.blackIndex !== undefined && onNavigateMove?.(pair.blackIndex)}
                  className={`text-left px-2 py-1 rounded font-bold transition-all flex items-center justify-between group cursor-pointer ${
                    currentMoveIndex === pair.blackIndex
                      ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                      : 'text-slate-200 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <span className="truncate">{pair.blackMove.san}</span>
                  {pair.blackIndex !== undefined &&
                    renderMoveBadge(moveEvaluations.get(pair.blackIndex), currentMoveIndex === pair.blackIndex)}
                </button>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
      </div>

      {/* Navigation Controls */}
      {Boolean(onNavigateMove) && (
        <div className="h-10 bg-slate-950 border-t border-slate-800 px-2 flex items-center justify-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onNavigateMove?.(-1)}
            className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            title="Start position"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={() => onNavigateMove?.(Math.max(-1, currentMoveIndex - 1))}
            className="p-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            title="Previous move (← Arrow Key)"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => onNavigateMove?.(Math.min(moves.length - 1, currentMoveIndex + 1))}
            className="p-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            title="Next move (→ Arrow Key)"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => onNavigateMove?.(moves.length - 1)}
            className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
            title="Latest position"
          >
            ⏭
          </button>
        </div>
      )}
    </div>
  );
}
