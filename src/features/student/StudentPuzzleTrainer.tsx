'use client';

import React, { useState, useEffect } from 'react';
import { Chess } from 'chess.js';
import { getPuzzleBankAction, saveSpeedRunScoreAction } from '@/actions/puzzles';
import type { DbHomeworkPuzzle } from '@/lib/puzzles/puzzleBankService';

export default function StudentPuzzleTrainer() {
  const [puzzles, setPuzzles] = useState<DbHomeworkPuzzle[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedTheme, setSelectedTheme] = useState('ALL');

  // Interactive Game State
  const [userMoveInput, setUserMoveInput] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'neutral'; text: string }>({
    type: 'neutral',
    text: 'Analyze the position and enter your best move in UCI format (e.g. f3f7 or e2e4).',
  });

  // Hints & Stats
  const [hintLevel, setHintLevel] = useState(0);
  const [streak, setStreak] = useState(0);
  const [puzzlesSolved, setPuzzlesSolved] = useState(0);
  const [studentRating, setStudentRating] = useState(1200);

  // 60-Second Speed Run Mode
  const [isSpeedRun, setIsSpeedRun] = useState(false);
  const [timeLeft, setTimeLeft] = useState(60);
  const [speedRunScore, setSpeedRunScore] = useState(0);
  const [speedRunBest, setSpeedRunBest] = useState(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('chesshub_speedrun_best') || '0');
    }
    return 0;
  });
  const [speedRunActive, setSpeedRunActive] = useState(false);

  // Speed run countdown interval
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isSpeedRun && speedRunActive && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && speedRunActive) {
      setSpeedRunActive(false);
      const newBest = Math.max(speedRunBest, speedRunScore);
      setSpeedRunBest(newBest);
      if (typeof window !== 'undefined') {
        localStorage.setItem('chesshub_speedrun_best', String(newBest));
      }
      saveSpeedRunScoreAction(speedRunScore);
      setFeedback({
        type: 'success',
        text: `⚡ SPEED RUN COMPLETE! You solved ${speedRunScore} puzzles in 60s! Best: ${newBest}`,
      });
    }
    return () => clearInterval(timer);
  }, [isSpeedRun, speedRunActive, timeLeft, speedRunScore, speedRunBest]);

  const startSpeedRun = () => {
    setIsSpeedRun(true);
    setSpeedRunScore(0);
    setTimeLeft(60);
    setSpeedRunActive(true);
    setCurrentIndex(0);
    setUserMoveInput('');
    setFeedback({
      type: 'neutral',
      text: '⚡ SPEED RUN ACTIVE! Solve as many puzzles as you can in 60 seconds!',
    });
  };

  useEffect(() => {
    setLoading(true);
    getPuzzleBankAction({
      theme: selectedTheme,
      limit: 50,
    }).then((res) => {
      if (res.success && res.puzzles && res.puzzles.length > 0) {
        setPuzzles(res.puzzles);
        setCurrentIndex(0);
        setFeedback({
          type: 'neutral',
          text: 'Analyze the position and enter your best move in UCI format (e.g. f3f7 or e2e4).',
        });
        setHintLevel(0);
      } else {
        setPuzzles([]);
      }
      setLoading(false);
    });
  }, [selectedTheme]);

  const currentPuzzle = puzzles[currentIndex];

  const handleNextPuzzle = () => {
    if (puzzles.length === 0) return;
    const nextIdx = (currentIndex + 1) % puzzles.length;
    setCurrentIndex(nextIdx);
    setUserMoveInput('');
    setHintLevel(0);
    setFeedback({
      type: 'neutral',
      text: 'Analyze the position and enter your best move in UCI format (e.g. f3f7 or e2e4).',
    });
  };

  const handleCheckMove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPuzzle || !userMoveInput.trim()) return;

    const moveClean = userMoveInput.trim().toLowerCase();
    const expectedMove = currentPuzzle.solution[0]?.toLowerCase();

    if (moveClean === expectedMove || moveClean === currentPuzzle.solution.join('').toLowerCase()) {
      setFeedback({
        type: 'success',
        text: `🎉 Correct move (${currentPuzzle.solution.join(' ')})! Exceptional tactical vision!`,
      });
      setStreak((prev) => prev + 1);
      setPuzzlesSolved((prev) => prev + 1);
      setStudentRating((prev) => prev + 15);

      if (isSpeedRun && speedRunActive) {
        setSpeedRunScore((s) => s + 1);
        setTimeout(() => handleNextPuzzle(), 300);
      }
    } else {
      setFeedback({
        type: 'error',
        text: `❌ Incorrect move "${userMoveInput}". Try again or request a hint below!`,
      });
      setStreak(0);
      setStudentRating((prev) => Math.max(800, prev - 10));
    }
  };

  return (
    <div className="space-y-6">
      {/* 60-Second Speed Run Banner */}
      <div className="bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-blue-500/10 border border-amber-500/30 p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center text-xl font-extrabold shadow-gold animate-pulse">
            ⚡
          </div>
          <div>
            <h4 className="font-heading font-bold text-sm text-white">60-Second Tactical Speed Run</h4>
            <p className="text-xs text-slate-400">
              Personal Best: <strong className="text-amber-400 font-mono">{speedRunBest} Puzzles</strong> | Solved Today: <strong className="text-emerald-400 font-mono">{speedRunScore}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {speedRunActive && (
            <div className="px-4 py-2 bg-red-500/20 border border-red-500/40 text-red-300 font-mono font-bold text-sm rounded-xl animate-pulse">
              ⏱️ {timeLeft}s Left
            </div>
          )}

          <button
            type="button"
            onClick={startSpeedRun}
            disabled={speedRunActive}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-extrabold text-xs rounded-xl shadow-gold transition-all"
          >
            {speedRunActive ? '🔥 Speed Run Active' : '🚀 Start 60s Speed Run'}
          </button>
        </div>
      </div>
      {/* Top Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Puzzle Rating</p>
            <p className="text-xl font-extrabold font-mono text-amber-400 mt-0.5">{studentRating}</p>
          </div>
          <span className="text-2xl">⭐</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Solving Streak</p>
            <p className="text-xl font-extrabold font-mono text-emerald-400 mt-0.5">{streak} 🔥</p>
          </div>
          <span className="text-2xl">🔥</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Puzzles Solved</p>
            <p className="text-xl font-extrabold font-mono text-blue-400 mt-0.5">{puzzlesSolved}</p>
          </div>
          <span className="text-2xl">🎯</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Current Category</p>
            <select
              value={selectedTheme}
              onChange={(e) => setSelectedTheme(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg text-xs text-white font-bold px-2 py-1 mt-1 focus:outline-none"
            >
              <option value="ALL">🌟 All Themes</option>
              <option value="mate">Checkmate</option>
              <option value="fork">Fork</option>
              <option value="pin">Pin</option>
              <option value="skewer">Skewer</option>
              <option value="endgame">Endgame</option>
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center text-slate-400 text-xs font-bold space-y-2">
          <span className="text-3xl animate-spin inline-block">⏳</span>
          <p>Loading Tactical Puzzle Trainer...</p>
        </div>
      ) : !currentPuzzle ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
          <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-xl">
            🧩
          </div>
          <p className="text-sm font-bold text-white">No Puzzles Available in Selected Category</p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Switch your theme filter to &quot;All Themes&quot; to practice puzzles from your coach.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Board & Solution Card */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                    Puzzle #{currentIndex + 1} of {puzzles.length}
                  </span>
                  <h3 className="font-heading font-extrabold text-lg text-white">
                    {currentPuzzle.title}
                  </h3>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 font-mono text-xs font-bold uppercase">
                    {currentPuzzle.difficulty} ({currentPuzzle.rating})
                  </span>
                  <span className="px-2.5 py-1 rounded-full bg-blue-950 text-blue-300 font-semibold text-xs">
                    🎯 {currentPuzzle.theme}
                  </span>
                </div>
              </div>

              {/* FEN Display Area */}
              <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 text-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl">
                  ♟️
                </div>
                <div className="font-mono text-xs text-amber-300 bg-slate-900/80 p-2.5 rounded-xl border border-slate-800 select-all overflow-x-auto">
                  {currentPuzzle.fen}
                </div>
                <p className="text-[11px] text-slate-400">
                  {currentPuzzle.fen.includes(' w ') ? '⚪ White to Move' : '⬛ Black to Move'}
                </p>
              </div>

              {/* Move Input Form */}
              <form onSubmit={handleCheckMove} className="space-y-3">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={userMoveInput}
                    onChange={(e) => setUserMoveInput(e.target.value)}
                    placeholder="Enter move in UCI format (e.g. f3f7)..."
                    className="flex-grow px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-sm focus:outline-none focus:border-amber-400"
                  />
                  <button
                    type="submit"
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-gold transition-all shrink-0"
                  >
                    Submit Move
                  </button>
                </div>
              </form>

              {/* Feedback Alert */}
              <div
                className={`p-3.5 rounded-xl text-xs font-semibold ${
                  feedback.type === 'success'
                    ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-300'
                    : feedback.type === 'error'
                    ? 'bg-red-500/10 border border-red-500/30 text-red-300'
                    : 'bg-slate-800/60 border border-slate-700/60 text-slate-300'
                }`}
              >
                {feedback.text}
              </div>
            </div>

            <div className="flex justify-between items-center pt-4 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setHintLevel((prev) => Math.min(3, prev + 1))}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold rounded-xl text-xs flex items-center gap-1.5 transition-colors"
              >
                💡 Need a Hint? ({hintLevel}/3)
              </button>

              <button
                type="button"
                onClick={handleNextPuzzle}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5"
              >
                <span>Next Puzzle →</span>
              </button>
            </div>
          </div>

          {/* Hint & Explanation Sidebar */}
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4">
              <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                <span>💡 Tactical Hints</span>
              </h4>

              {hintLevel === 0 ? (
                <p className="text-xs text-slate-400 leading-relaxed italic">
                  Click &quot;Need a Hint?&quot; above if you get stuck on this tactical position.
                </p>
              ) : (
                <div className="space-y-3 text-xs">
                  {hintLevel >= 1 && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 text-amber-200 rounded-xl space-y-1">
                      <p className="font-bold text-[10px] uppercase tracking-wider text-amber-400">Hint #1:</p>
                      <p>{currentPuzzle.hint_1 || `Focus on forcing moves for ${currentPuzzle.fen.includes(' w ') ? 'White' : 'Black'}.`}</p>
                    </div>
                  )}

                  {hintLevel >= 2 && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/30 text-blue-200 rounded-xl space-y-1">
                      <p className="font-bold text-[10px] uppercase tracking-wider text-blue-400">Hint #2:</p>
                      <p>Target tactical motif: <strong className="text-white">{currentPuzzle.theme}</strong>.</p>
                    </div>
                  )}

                  {hintLevel >= 3 && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 rounded-xl space-y-1 font-mono">
                      <p className="font-bold text-[10px] uppercase tracking-wider text-emerald-400 font-sans">Full Solution:</p>
                      <p>{currentPuzzle.solution.join(' → ')}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {currentPuzzle.explanation && (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-2">
                <h4 className="font-heading font-bold text-sm text-white flex items-center gap-2">
                  <span>📖 Tactical Explanation</span>
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {currentPuzzle.explanation}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
