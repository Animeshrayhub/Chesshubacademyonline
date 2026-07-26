'use client';

import React, { useState, useEffect } from 'react';
import ChessWorkspace from './ChessWorkspace';

interface StudentBattleArenaProps {
  studentName?: string;
}

export default function StudentBattleArena({ studentName = 'Student' }: StudentBattleArenaProps) {
  const [inBattle, setInBattle] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    let timer: any = null;
    if (inBattle && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
        // Random chance opponent solves a puzzle
        if (Math.random() < 0.15) {
          setOpponentScore((prev) => prev + 1);
        }
      }, 1000);
    } else if (timeLeft === 0 && inBattle) {
      setInBattle(false);
      setGameOver(true);
    }
    return () => clearInterval(timer);
  }, [inBattle, timeLeft]);

  const handleStartDuel = () => {
    setInBattle(true);
    setTimeLeft(60);
    setPlayerScore(0);
    setOpponentScore(0);
    setGameOver(false);
  };

  const handleSolvePuzzlePoint = () => {
    setPlayerScore((prev) => prev + 1);
  };

  return (
    <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-950 border border-indigo-500/30 rounded-3xl p-5 shadow-xl text-white space-y-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-2xl shadow-lg">
            ⚔️
          </div>
          <div>
            <h3 className="font-heading font-bold text-sm text-indigo-300 flex items-center gap-2">
              <span>1v1 Tactical Speed Duel Arena</span>
              <span className="text-[10px] bg-red-500/20 border border-red-500/40 text-red-300 px-2 py-0.5 rounded-full font-bold animate-pulse">
                Live Duel
              </span>
            </h3>
            <p className="text-xs text-slate-400">Challenge classmates to a 60-second puzzle speed duel!</p>
          </div>
        </div>

        {inBattle && (
          <div className="bg-slate-950 border border-indigo-500/40 px-3 py-1.5 rounded-2xl text-center">
            <span className="text-[10px] text-slate-400 font-bold block">TIME LEFT</span>
            <span className="text-sm font-extrabold text-amber-400 font-mono">⏱️ {timeLeft}s</span>
          </div>
        )}
      </div>

      {!inBattle && !gameOver && (
        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-xs font-bold text-slate-200">Ready for a 60-second Tactics Duel?</h4>
            <p className="text-[11px] text-slate-400">
              Test your calculation speed against an Academy bot or classmate. Most puzzles solved wins!
            </p>
          </div>
          <button
            type="button"
            onClick={handleStartDuel}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all active:scale-95 whitespace-nowrap flex items-center gap-2"
          >
            <span>⚔️ Start 60s Duel</span>
          </button>
        </div>
      )}

      {inBattle && (
        <div className="space-y-4">
          {/* Scoreboard */}
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-emerald-500/10 border border-emerald-500/30 p-3 rounded-2xl">
              <span className="text-[10px] text-emerald-400 font-bold uppercase block">{studentName} (You)</span>
              <span className="text-2xl font-extrabold text-white font-mono">{playerScore} pts</span>
            </div>
            <div className="bg-purple-500/10 border border-purple-500/30 p-3 rounded-2xl">
              <span className="text-[10px] text-purple-400 font-bold uppercase block">Academy Opponent</span>
              <span className="text-2xl font-extrabold text-white font-mono">{opponentScore} pts</span>
            </div>
          </div>

          {/* Interactive Workspace */}
          <div className="bg-slate-950 p-2 border border-slate-800 rounded-2xl">
            <div className="flex items-center justify-between px-2 py-1 mb-2">
              <span className="text-xs text-slate-400 font-bold">Tactical Puzzle Position</span>
              <button
                type="button"
                onClick={handleSolvePuzzlePoint}
                className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all"
              >
                ✓ Solve Position (+1 Pt)
              </button>
            </div>
            <ChessWorkspace readOnly={false} />
          </div>
        </div>
      )}

      {gameOver && (
        <div className="p-5 bg-slate-950 border border-indigo-500/30 rounded-2xl text-center space-y-3">
          <div className="text-4xl">{playerScore > opponentScore ? '🏆' : playerScore === opponentScore ? '🤝' : '⚔️'}</div>
          <h4 className="text-sm font-bold text-indigo-300">
            {playerScore > opponentScore
              ? 'Victory! You won the Speed Duel!'
              : playerScore === opponentScore
              ? 'Draw Game! Great effort!'
              : 'Match Completed! Keep Practicing!'}
          </h4>
          <p className="text-xs text-slate-400 font-mono">
            Final Score: You ({playerScore}) - Opponent ({opponentScore})
          </p>
          <button
            type="button"
            onClick={handleStartDuel}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md transition-all"
          >
            🔄 Rematch / Play Again
          </button>
        </div>
      )}
    </div>
  );
}
