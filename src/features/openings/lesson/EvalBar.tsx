'use client';

import React from 'react';
import { getEvalPercentage } from '@/lib/openings/eval-helpers';

interface EvalBarProps {
  evalStr?: string | null;
  orientation?: 'white' | 'black';
  height?: string;
  width?: string;
  horizontal?: boolean;
  className?: string;
}

export default function EvalBar({
  evalStr,
  orientation = 'white',
  height = '100%',
  width = '24px',
  horizontal = false,
  className = '',
}: EvalBarProps) {
  const whitePct = getEvalPercentage(evalStr);
  const isBlackOrientation = orientation === 'black';

  // Format displayed badge
  const displayScore = evalStr ?? '0.0';

  if (horizontal) {
    // Horizontal layout for mobile or compact view
    return (
      <div className={`flex items-center gap-2 w-full ${className}`}>
        <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-700 relative">
          <div
            className="h-full bg-slate-100 transition-all duration-500 ease-out"
            style={{ width: `${isBlackOrientation ? 100 - whitePct : whitePct}%` }}
          />
        </div>
        <span className="text-xs font-mono font-bold text-slate-200 min-w-[40px] text-right">
          {displayScore}
        </span>
      </div>
    );
  }

  // Vertical layout (default, placed alongside the chessboard)
  return (
    <div
      className={`relative bg-slate-950 rounded-lg border border-slate-800 overflow-hidden flex flex-col justify-between select-none shadow-md ${className}`}
      style={{ width, height }}
      title={`Engine Evaluation: ${displayScore}`}
    >
      {/* Black portion (top if white orientation, bottom if black orientation) */}
      <div
        className="w-full bg-slate-900 transition-all duration-500 ease-out flex items-start justify-center pt-1"
        style={{ height: `${isBlackOrientation ? whitePct : 100 - whitePct}%` }}
      >
        {!isBlackOrientation && whitePct < 50 && (
          <span className="text-[10px] font-mono font-bold text-slate-200 leading-none">
            {displayScore}
          </span>
        )}
        {isBlackOrientation && whitePct >= 50 && (
          <span className="text-[10px] font-mono font-bold text-slate-200 leading-none">
            {displayScore}
          </span>
        )}
      </div>

      {/* White portion (bottom if white orientation, top if black orientation) */}
      <div
        className="w-full bg-slate-100 transition-all duration-500 ease-out flex items-end justify-center pb-1"
        style={{ height: `${isBlackOrientation ? 100 - whitePct : whitePct}%` }}
      >
        {!isBlackOrientation && whitePct >= 50 && (
          <span className="text-[10px] font-mono font-bold text-slate-900 leading-none">
            {displayScore}
          </span>
        )}
        {isBlackOrientation && whitePct < 50 && (
          <span className="text-[10px] font-mono font-bold text-slate-900 leading-none">
            {displayScore}
          </span>
        )}
      </div>
    </div>
  );
}
