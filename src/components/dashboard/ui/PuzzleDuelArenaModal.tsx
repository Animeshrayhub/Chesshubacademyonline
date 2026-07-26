'use client';

import React, { useState, useEffect } from 'react';
import ChessWorkspace from './ChessWorkspace';

interface PuzzleDuelArenaModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName?: string;
}

const DUEL_PUZZLES = [
  { id: '1', fen: '1k6/6Q1/1K6/8/8/8/8/8 w - - 0 1', solution: 'Qb7#', name: 'Queen Mate' },
  { id: '2', fen: '1k6/6R1/1K6/8/8/8/8/8 w - - 0 1', solution: 'Rc8#', name: 'Rook Back-Rank' },
  { id: '3', fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4', solution: 'Nf7', name: 'Fried Liver Fork' },
  { id: '4', fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/1bB1P3/2N2N2/PPPP1PPP/R1BQK2R w KQkq - 0 5', solution: 'O-O', name: 'Castling Pin Break' },
];

export default function PuzzleDuelArenaModal({
  isOpen,
  onClose,
  studentName = 'Aarav Sharma',
}: PuzzleDuelArenaModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [botScore, setBotScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [isPlaying, setIsPlaying] = useState(false);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    let timer: any;
    if (isPlaying && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);

        // Random bot score simulation
        if (Math.random() < 0.15) {
          setBotScore((prev) => prev + 1);
        }
      }, 1000);
    } else if (timeLeft === 0 && isPlaying) {
      setIsPlaying(false);
      setGameOver(true);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeLeft]);

  if (!isOpen) return null;

  const handleStartDuel = () => {
    setUserScore(0);
    setBotScore(0);
    setTimeLeft(60);
    setCurrentIdx(0);
    setIsPlaying(true);
    setGameOver(false);
  };

  const handleSolveSuccess = () => {
    setUserScore((prev) => prev + 1);
    setCurrentIdx((prev) => (prev + 1) % DUEL_PUZZLES.length);
  };

  const currentPuzzle = DUEL_PUZZLES[currentIdx];

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-3xl space-y-4 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-lg">
              ⚔️
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-amber-400">
                1v1 Student Puzzle Duel Arena
              </h3>
              <p className="text-xs text-slate-400">60-Second Speed Tactics Challenge</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Scoreboard & Timer Header */}
        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl flex items-center justify-between text-center">
          <div className="space-y-0.5">
            <span className="text-[10px] text-amber-400 font-bold uppercase">{studentName} (You)</span>
            <p className="text-2xl font-black font-mono text-white">{userScore} pts</p>
          </div>

          <div className="space-y-1">
            <div className="text-xl font-black font-mono text-amber-400 bg-slate-900 px-4 py-1 rounded-xl border border-amber-500/30">
              ⏱️ {timeLeft}s
            </div>
            <span className="text-[10px] text-slate-400">Speed Challenge</span>
          </div>

          <div className="space-y-0.5">
            <span className="text-[10px] text-purple-400 font-bold uppercase">Grandmaster Bot</span>
            <p className="text-2xl font-black font-mono text-white">{botScore} pts</p>
          </div>
        </div>

        {/* Start / Victory Screen */}
        {!isPlaying && !gameOver && (
          <div className="p-8 text-center space-y-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="text-4xl">⚔️</div>
            <h4 className="text-lg font-bold text-white">Ready for 1v1 Speed Tactics Duel?</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Solve as many tactics puzzles as possible in 60 seconds against the AI bot to earn +150 XP!
            </p>
            <button
              type="button"
              onClick={handleStartDuel}
              className="px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
            >
              🚀 Start 60s Puzzle Duel Match
            </button>
          </div>
        )}

        {gameOver && (
          <div className="p-8 text-center space-y-4 bg-slate-950 border border-slate-800 rounded-2xl">
            <div className="text-4xl">{userScore >= botScore ? '🏆' : '🤝'}</div>
            <h4 className="text-lg font-bold text-amber-400">
              {userScore >= botScore ? 'Victory! You Won the Match!' : 'Match Finished!'}
            </h4>
            <p className="text-xs text-slate-300 font-mono">
              Final Score: <strong className="text-amber-400">{userScore}</strong> vs{' '}
              <strong className="text-purple-400">{botScore}</strong> | Earned <span className="text-emerald-400 font-bold">+150 XP</span>
            </p>
            <button
              type="button"
              onClick={handleStartDuel}
              className="px-6 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition-all"
            >
              🔄 Play Again
            </button>
          </div>
        )}

        {/* Active Board Workspace */}
        {isPlaying && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold px-1">
              <span className="text-amber-400">Puzzle #{currentIdx + 1}: {currentPuzzle.name}</span>
              <button
                type="button"
                onClick={handleSolveSuccess}
                className="px-3 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold rounded-lg"
              >
                ✓ Sim Solved (+1 Pt)
              </button>
            </div>
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-3 h-80 flex items-center justify-center">
              <ChessWorkspace readOnly={true} initialFen={currentPuzzle.fen} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
