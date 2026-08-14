'use client';

import React, { useState } from 'react';

export interface EngineCandidateLine {
  rank: number;
  move: string;
  eval: string;
  pv: string[];
}

interface EngineAnalysisPanelProps {
  lines: EngineCandidateLine[];
  depth?: number;
  isSearching?: boolean;
  onSelectLine?: (move: string) => void;
  language?: 'en' | 'hi';
  studentLevel?: 'Beginner' | 'Intermediate' | 'Advanced';
}

export default function EngineAnalysisPanel({
  lines,
  depth = 12,
  isSearching = false,
  onSelectLine,
  language = 'en',
  studentLevel = 'Beginner',
}: EngineAnalysisPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const isHindi = language === 'hi';

  if (studentLevel === 'Beginner') {
    // Hide Multi-PV lines for Beginner students to keep interface simple
    return null;
  }

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white bg-slate-800/80 border border-slate-700/60 rounded-xl px-3 py-1.5 transition-colors"
      >
        <span>⚙️</span>
        <span>{isHindi ? 'इंजन विश्लेषण दिखाएं (Stockfish)' : 'Show Engine Analysis (Stockfish)'}</span>
        {isSearching && <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />}
      </button>
    );
  }

  return (
    <div className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-3 space-y-2 text-xs">
      <div className="flex items-center justify-between border-b border-slate-700/60 pb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-200">🤖 Stockfish 16</span>
          <span className="text-slate-500 font-mono">Depth {depth}</span>
          {isSearching && (
            <span className="text-amber-400 animate-pulse text-[10px]">Analyzing...</span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="text-slate-400 hover:text-white transition-colors"
        >
          ✕
        </button>
      </div>

      {lines.length === 0 ? (
        <div className="text-slate-500 py-2 text-center">
          {isSearching ? 'Calculating best moves...' : 'No engine evaluation available'}
        </div>
      ) : (
        <div className="space-y-1.5">
          {lines.map((line) => (
            <div
              key={line.rank}
              onClick={() => onSelectLine?.(line.move)}
              className="flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 rounded-lg p-2 transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-2 font-mono">
                <span className="text-slate-500 font-bold">#{line.rank}</span>
                <span className="font-bold text-white group-hover:text-blue-300 transition-colors">
                  {line.move}
                </span>
                <span className="text-slate-400 text-[11px] truncate max-w-[180px]">
                  {line.pv.slice(0, 4).join(' ')}
                </span>
              </div>
              <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[11px] ${
                line.eval.startsWith('+') ? 'bg-emerald-950 text-emerald-300 border border-emerald-800/40' :
                line.eval.startsWith('-') ? 'bg-red-950 text-red-300 border border-red-800/40' :
                'bg-slate-700 text-slate-200'
              }`}>
                {line.eval}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
