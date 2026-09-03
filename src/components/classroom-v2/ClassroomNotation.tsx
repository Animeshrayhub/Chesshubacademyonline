'use client';

import React, { useMemo, useRef, useEffect } from 'react';
import { type MoveData } from '@/lib/classroom-v2/types';

interface ClassroomNotationProps {
  moves: MoveData[];
  currentMoveIndex: number;
  onNavigateMove?: (moveIndex: number) => void;
  isCoach: boolean;
  className?: string;
}

export default function ClassroomNotation({
  moves = [],
  currentMoveIndex = -1,
  onNavigateMove,
  isCoach,
  className = '',
}: ClassroomNotationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      id="classroom-notation"
      className={`flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className="h-9 bg-slate-950/80 px-3 border-b border-slate-800 flex items-center justify-between">
        <span className="font-extrabold text-xs text-slate-300 tracking-wide uppercase">
          Notation ({moves.length} moves)
        </span>
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
              className="grid grid-cols-[36px_1fr_1fr] items-center px-2 py-1 rounded hover:bg-slate-800/60 transition-colors"
            >
              <span className="text-slate-500 font-bold text-[11px]">{pair.turnNumber}.</span>

              {/* White Move */}
              <button
                type="button"
                disabled={!isCoach && !onNavigateMove}
                onClick={() => pair.whiteIndex !== undefined && onNavigateMove?.(pair.whiteIndex)}
                className={`text-left px-2 py-0.5 rounded font-bold transition-colors ${
                  currentMoveIndex === pair.whiteIndex
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'text-slate-200 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {pair.whiteMove?.san || ''}
              </button>

              {/* Black Move */}
              {pair.blackMove ? (
                <button
                  type="button"
                  disabled={!isCoach && !onNavigateMove}
                  onClick={() => pair.blackIndex !== undefined && onNavigateMove?.(pair.blackIndex)}
                  className={`text-left px-2 py-0.5 rounded font-bold transition-colors ${
                    currentMoveIndex === pair.blackIndex
                      ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                      : 'text-slate-200 hover:text-white hover:bg-slate-700/50'
                  }`}
                >
                  {pair.blackMove.san}
                </button>
              ) : (
                <span />
              )}
            </div>
          ))
        )}
      </div>

      {/* Navigation Controls for Coach */}
      {isCoach && (
        <div className="h-10 bg-slate-950 border-t border-slate-800 px-2 flex items-center justify-center gap-1">
          <button
            type="button"
            onClick={() => onNavigateMove?.(-1)}
            className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            title="Start position"
          >
            ⏮
          </button>
          <button
            type="button"
            onClick={() => onNavigateMove?.(Math.max(-1, currentMoveIndex - 1))}
            className="p-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            title="Previous move"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={() => onNavigateMove?.(Math.min(moves.length - 1, currentMoveIndex + 1))}
            className="p-1.5 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            title="Next move"
          >
            ▶
          </button>
          <button
            type="button"
            onClick={() => onNavigateMove?.(moves.length - 1)}
            className="p-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors"
            title="Latest position"
          >
            ⏭
          </button>
        </div>
      )}
    </div>
  );
}
