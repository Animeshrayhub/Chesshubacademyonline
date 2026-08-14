'use client';
import React, { useEffect, useRef, useState } from 'react';

export interface MoveEntry {
  moveNumber: number;
  white?: string;
  black?: string;
  whiteIdx: number;
  blackIdx?: number;
}

interface ClassroomMoveNotationProps {
  moves: string[]; // flat SAN list e.g. ['e4','e5','Nf3','Nc6',...]
  currentIndex: number; // which move is currently active (-1 = start, 0 = 1.e4, 1 = 1..e5, etc.)
  onJumpToMove: (idx: number) => void;
  showMovesForParticipants: boolean;
  isCoach: boolean;
}

export default function ClassroomMoveNotation({
  moves,
  currentIndex,
  onJumpToMove,
  showMovesForParticipants,
  isCoach,
}: ClassroomMoveNotationProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  // Auto-scroll to current move
  useEffect(() => {
    const el = listRef.current?.querySelector('.current-move');
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [currentIndex, moves]);

  // Keyboard Left / Right arrow keys listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        onJumpToMove(Math.max(-1, currentIndex - 1));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        onJumpToMove(Math.min(moves.length - 1, currentIndex + 1));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, moves, onJumpToMove]);

  // Toggle Play / Pause auto-play stepper
  const handleTogglePlay = () => {
    if (!isPlaying) {
      if (currentIndex >= moves.length - 1) {
        onJumpToMove(-1);
      }
      setIsPlaying(true);
    } else {
      setIsPlaying(false);
    }
  };

  // Auto-play move stepper interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        if (currentIndex < moves.length - 1) {
          onJumpToMove(currentIndex + 1);
        } else {
          setIsPlaying(false);
        }
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isPlaying, currentIndex, moves, onJumpToMove]);

  // Mouse wheel scrolling over move list
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY > 0) {
      onJumpToMove(Math.min(moves.length - 1, currentIndex + 1));
    } else if (e.deltaY < 0) {
      onJumpToMove(Math.max(-1, currentIndex - 1));
    }
  };

  // Build move pairs
  const pairs: MoveEntry[] = [];
  for (let i = 0; i < moves.length; i += 2) {
    pairs.push({
      moveNumber: Math.floor(i / 2) + 1,
      white: moves[i],
      black: moves[i + 1],
      whiteIdx: i,
      blackIdx: i + 1 < moves.length ? i + 1 : undefined,
    });
  }

  const getPgnString = () => {
    let pgnStr = '[Event "ChessHub Live Classroom"]\n[Site "ChessHub Academy"]\n[Result "*"]\n\n';
    pairs.forEach((p) => {
      pgnStr += `${p.moveNumber}. ${p.white} ${p.black || ''} `;
    });
    return pgnStr.trim();
  };

  const handleCopyPgn = () => {
    navigator.clipboard.writeText(getPgnString());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPgn = () => {
    const pgnText = getPgnString();
    const blob = new Blob([pgnText], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `ChessHub_Game_${Date.now()}.pgn`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isCoach && !showMovesForParticipants) {
    return (
      <div className="flex items-center justify-center h-full text-[11px] text-[#555577] text-center px-4">
        <p>🔒 Move notation is hidden by coach</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#0d0d1a]">
      {/* Header bar with PGN export/copy & Play button */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#121226] border-b border-[#222244] text-[10px] text-[#8888aa] font-bold">
        <div className="flex items-center gap-2">
          <span>NOTATION ({moves.length})</span>
          {moves.length > 0 && (
            <button
              type="button"
              onClick={handleTogglePlay}
              className={`px-2 py-0.5 rounded text-[9px] font-extrabold transition-all border ${
                isPlaying
                  ? 'bg-amber-500 text-slate-950 border-amber-400 animate-pulse'
                  : 'bg-[#1a1a32] text-[#ccccee] border-[#2a2a4a] hover:bg-[#252548]'
              }`}
              title="Auto-play moves step-by-step"
            >
              {isPlaying ? '⏸ PAUSE' : '▶ PLAY'}
            </button>
          )}
        </div>

        {moves.length > 0 && (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleCopyPgn}
              className="px-2 py-0.5 bg-[#1e1e3a] hover:bg-[#2a2a4a] text-[#ccccee] rounded border border-[#2a2a4a] transition-all text-[9px]"
              title="Copy FIDE PGN to Clipboard"
            >
              {copied ? '✓ COPIED' : '📋 COPY'}
            </button>
            <button
              type="button"
              onClick={handleDownloadPgn}
              className="px-2 py-0.5 bg-purple-900/50 hover:bg-purple-800 text-purple-200 rounded border border-purple-700/60 transition-all text-[9px]"
              title="Download PGN File"
            >
              💾 .PGN
            </button>
          </div>
        )}
      </div>

      {/* Move notation list */}
      <div
        ref={listRef}
        onWheel={handleWheel}
        className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5 text-[13px] font-mono select-none"
      >
        {/* Starting position button */}
        <button
          type="button"
          onClick={() => onJumpToMove(-1)}
          className={`w-full text-left px-2.5 py-1 rounded text-[11px] font-sans font-semibold transition-all ${
            currentIndex === -1
              ? 'current-move bg-[#c84b31] text-white font-extrabold shadow'
              : 'text-[#7777aa] hover:bg-[#1a1a32] hover:text-white'
          }`}
        >
          🏁 Starting Position
        </button>

        {moves.length === 0 && (
          <div className="py-8 text-center text-[11px] text-[#444466] italic">
            No moves played yet. Make moves on the board to build notation.
          </div>
        )}

        {pairs.map((pair) => (
          <div key={pair.moveNumber} className="flex items-center gap-1">
            {/* Move number */}
            <span className="text-[#555577] text-[11px] font-bold w-7 shrink-0 text-right pr-1">
              {pair.moveNumber}.
            </span>

            {/* White move */}
            <button
              type="button"
              onClick={() => onJumpToMove(pair.whiteIdx)}
              className={`
                flex-1 text-left px-2.5 py-1 rounded transition-all font-bold cursor-pointer
                ${currentIndex === pair.whiteIdx
                  ? 'current-move bg-[#c84b31] text-white shadow-md'
                  : 'text-[#ddddee] hover:bg-[#1e1e3e] hover:text-white'
                }
              `}
            >
              {pair.white}
            </button>

            {/* Black move */}
            {pair.black !== undefined ? (
              <button
                type="button"
                onClick={() => pair.blackIdx !== undefined && onJumpToMove(pair.blackIdx)}
                className={`
                  flex-1 text-left px-2.5 py-1 rounded transition-all font-bold cursor-pointer
                  ${currentIndex === pair.blackIdx
                    ? 'current-move bg-[#c84b31] text-white shadow-md'
                    : 'text-[#ddddee] hover:bg-[#1e1e3e] hover:text-white'
                  }
                `}
              >
                {pair.black}
              </button>
            ) : (
              <div className="flex-1" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
