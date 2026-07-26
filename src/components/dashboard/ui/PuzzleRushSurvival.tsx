'use client';

import React, { useState, useEffect } from 'react';
import ChessWorkspace from './ChessWorkspace';

export default function PuzzleRushSurvival() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(12);
  const [gameOver, setGameOver] = useState(false);

  const handleStartGame = () => {
    setIsPlaying(true);
    setLives(3);
    setScore(0);
    setGameOver(false);
  };

  const handleCorrectSolve = () => {
    setScore((prev) => {
      const next = prev + 1;
      if (next > highScore) setHighScore(next);
      return next;
    });
  };

  const handleWrongMove = () => {
    setLives((prev) => {
      const next = prev - 1;
      if (next <= 0) {
        setIsPlaying(false);
        setGameOver(true);
      }
      return next;
    });
  };

  return (
    <div className="bg-gradient-to-br from-red-950 via-slate-900 to-slate-950 border border-red-500/30 rounded-3xl p-6 shadow-xl text-white space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-xl shadow-md">
            ⚡
          </div>
          <div>
            <h3 className="font-heading font-bold text-base text-red-400">
              Puzzle Rush Survival Mode
            </h3>
            <p className="text-xs text-slate-400">
              Solve as many puzzles as possible with 3 lives!
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center">
            <span className="text-[10px] text-slate-400 font-bold block uppercase">High Score</span>
            <span className="text-sm font-extrabold text-amber-400 font-mono">🏆 {highScore}</span>
          </div>
        </div>
      </div>

      {!isPlaying && !gameOver && (
        <div className="p-6 bg-slate-950/70 border border-slate-800 rounded-2xl text-center space-y-4">
          <div className="text-4xl">⚡</div>
          <h4 className="text-base font-bold text-white">3 Lives • Infinite Puzzles</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Test your speed calculation and tactical vision under pressure. One wrong move costs 1 life!
          </p>
          <button
            type="button"
            onClick={handleStartGame}
            className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all active:scale-95 flex items-center gap-2 mx-auto"
          >
            <span>⚡ Start Puzzle Rush</span>
          </button>
        </div>
      )}

      {isPlaying && (
        <div className="space-y-4">
          {/* Game Stats Bar */}
          <div className="flex items-center justify-between bg-slate-950 p-3 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-1">
              <span className="text-xs font-bold text-slate-400 mr-1">LIVES:</span>
              {Array.from({ length: 3 }).map((_, i) => (
                <span key={i} className="text-lg">
                  {i < lives ? '❤️' : '🖤'}
                </span>
              ))}
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-bold block uppercase">CURRENT SCORE</span>
              <span className="text-xl font-extrabold text-emerald-400 font-mono">{score}</span>
            </div>
          </div>

          {/* Interactive Workspace */}
          <div className="bg-slate-950 p-2 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs text-slate-400 font-bold">Puzzle #{score + 1}</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleWrongMove}
                  className="px-2.5 py-1 bg-red-500/20 text-red-300 border border-red-500/30 text-[11px] font-bold rounded-lg hover:bg-red-500/30"
                >
                  ✖ Wrong Move (-1 Life)
                </button>
                <button
                  type="button"
                  onClick={handleCorrectSolve}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all"
                >
                  ✓ Solved (+1 Point)
                </button>
              </div>
            </div>
            <ChessWorkspace readOnly={false} />
          </div>
        </div>
      )}

      {gameOver && (
        <div className="p-6 bg-slate-950 border border-red-500/40 rounded-2xl text-center space-y-3">
          <div className="text-4xl">💀</div>
          <h4 className="text-base font-bold text-red-400">Game Over!</h4>
          <p className="text-xs text-slate-300 font-mono">
            You solved <strong className="text-emerald-400 font-extrabold text-sm">{score}</strong> puzzles correctly!
          </p>
          <button
            type="button"
            onClick={handleStartGame}
            className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-md transition-all active:scale-95"
          >
            🔄 Try Again / Play Rush
          </button>
        </div>
      )}
    </div>
  );
}
