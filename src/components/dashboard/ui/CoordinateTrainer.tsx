'use client';

import React, { useState, useEffect, useRef } from 'react';
import Button from '@/components/ui/Button';
import DashboardIcon from './DashboardIcon';

export default function CoordinateTrainer() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [targetSquare, setTargetSquare] = useState('');
  const [attempts, setAttempts] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [lastClickedSquare, setLastClickedSquare] = useState('');
  const [mute, setMute] = useState(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Load High Score from localstorage
  useEffect(() => {
    const saved = localStorage.getItem('coordinate_highscore');
    if (saved) {
      setHighScore(parseInt(saved, 10));
    }
  }, []);

  const playSound = (type: 'correct' | 'wrong' | 'complete') => {
    if (mute || typeof Audio === 'undefined') return;

    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);

      if (type === 'correct') {
        osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.25);
      } else if (type === 'wrong') {
        osc.frequency.setValueAtTime(150, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.3);
      } else if (type === 'complete') {
        osc.frequency.setValueAtTime(440, audioCtx.currentTime); // A4
        osc.frequency.setValueAtTime(554.37, audioCtx.currentTime + 0.1); // C#5
        osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.2); // E5
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        osc.start();
        osc.stop(audioCtx.currentTime + 0.5);
      }
    } catch (e) {
      // AudioContext fallback
    }
  };

  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
  const ranks = [8, 7, 6, 5, 4, 3, 2, 1];

  const pickRandomSquare = () => {
    const file = files[Math.floor(Math.random() * 8)];
    const rank = ranks[Math.floor(Math.random() * 8)];
    setTargetSquare(`${file}${rank}`);
  };

  const handleStart = () => {
    // Unlock AudioContext on initial interaction
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
    } catch (e) {}

    setIsPlaying(true);
    setScore(0);
    setAttempts(0);
    setTimeLeft(30);
    setShowResults(false);
    setLastCorrect(null);
    setLastClickedSquare('');
    pickRandomSquare();

    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleEndGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleEndGame = () => {
    setIsPlaying(false);
    setShowResults(true);
    playSound('complete');
    if (timerRef.current) clearInterval(timerRef.current);

    setHighScore((prev) => {
      if (score > prev) {
        localStorage.setItem('coordinate_highscore', score.toString());
        return score;
      }
      return prev;
    });
  };

  const handleSquareClick = (file: string, rank: number) => {
    if (!isPlaying) return;

    const clicked = `${file}${rank}`;
    setLastClickedSquare(clicked);
    setAttempts((a) => a + 1);

    if (clicked === targetSquare) {
      setScore((s) => s + 1);
      setLastCorrect(true);
      playSound('correct');
      pickRandomSquare();
    } else {
      setLastCorrect(false);
      playSound('wrong');
    }

    setTimeout(() => {
      setLastClickedSquare('');
      setLastCorrect(null);
    }, 400);
  };

  return (
    <div className="bg-white border border-border rounded-3xl shadow-card p-6 max-w-xl mx-auto flex flex-col items-center gap-6">
      <div className="w-full flex items-center justify-between border-b border-border/60 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-50 flex items-center justify-center border border-orange-100">
            <DashboardIcon iconKey="layoutDashboard" className="w-4 h-4 text-orange-600" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">Coordinate Trainer</h3>
            <p className="text-[10px] text-text-secondary">Master chess coordinates</p>
          </div>
        </div>

        {/* Audio Mute Switch */}
        <button
          onClick={() => setMute(!mute)}
          className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 focus:outline-none"
          title={mute ? 'Unmute Trainer Sounds' : 'Mute Trainer Sounds'}
        >
          {mute ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5L6 9H2v6h4l5 4V5zM23 9l-6 6M17 9l6 6"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M11 5L6 9H2v6h4l5 4V5zM15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
          )}
        </button>
      </div>

      {!isPlaying && !showResults ? (
        // Start Screen
        <div className="text-center py-10 space-y-4">
          <p className="text-xs text-text-secondary max-w-sm">
            Master the coordinate map of the chess board. Click the correct square as they are prompted. Solve as many as you can before the 30-second timer expires!
          </p>
          <div className="text-xs text-text-primary font-bold">
            High Score: <span className="text-primary text-sm">{highScore} pts</span>
          </div>
          <Button onClick={handleStart} variant="primary" className="px-6 py-2.5 font-bold uppercase tracking-wider">
            Start Coordinate Sprint
          </Button>
        </div>
      ) : showResults ? (
        // Results Screen
        <div className="text-center py-8 space-y-4">
          <h4 className="text-sm font-bold text-green-600 uppercase tracking-wider">Sprint Finished!</h4>
          <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto text-xs bg-slate-50 border border-border p-4 rounded-2xl">
            <div>
              <span className="text-[10px] text-text-secondary uppercase font-bold block">Score</span>
              <span className="text-base font-bold text-text-primary">{score} pts</span>
            </div>
            <div>
              <span className="text-[10px] text-text-secondary uppercase font-bold block">Accuracy</span>
              <span className="text-base font-bold text-text-primary">
                {attempts > 0 ? Math.round((score / attempts) * 100) : 0}%
              </span>
            </div>
          </div>
          {score >= highScore && score > 0 && (
            <div className="text-xs text-orange-600 font-bold uppercase tracking-wider animate-bounce">
              🎉 New High Score!
            </div>
          )}
          <Button onClick={handleStart} variant="primary" className="px-6 py-2.5 font-bold uppercase tracking-wider">
            Play Again
          </Button>
        </div>
      ) : (
        // Game Board Screen
        <div className="w-full flex flex-col items-center gap-4">
          {/* HUD Indicators */}
          <div className="w-full grid grid-cols-3 gap-2 text-center text-xs">
            <div className="bg-slate-50 border border-border p-2 rounded-xl">
              <span className="text-[9px] text-text-secondary uppercase font-bold block">Target</span>
              <span className="text-sm font-extrabold text-primary uppercase animate-pulse">{targetSquare}</span>
            </div>
            <div className="bg-slate-50 border border-border p-2 rounded-xl">
              <span className="text-[9px] text-text-secondary uppercase font-bold block">Timer</span>
              <span className="text-sm font-extrabold text-red-600">{timeLeft}s</span>
            </div>
            <div className="bg-slate-50 border border-border p-2 rounded-xl">
              <span className="text-[9px] text-text-secondary uppercase font-bold block">Score</span>
              <span className="text-sm font-extrabold text-green-600">{score}</span>
            </div>
          </div>

          {/* Chess grid board */}
          <div className="relative aspect-square w-full max-w-[360px] bg-slate-900 border-4 border-slate-800 rounded-xl overflow-hidden grid grid-cols-8 grid-rows-8">
            {ranks.map((rank) =>
              files.map((file) => {
                const isDark = (files.indexOf(file) + rank) % 2 === 0;
                const squareName = `${file}${rank}`;
                const isClicked = lastClickedSquare === squareName;

                let squareBg = isDark ? 'bg-[#7A583E]' : 'bg-[#E8D3B9]';
                if (isClicked) {
                  squareBg = lastCorrect ? 'bg-green-500 animate-ping' : 'bg-red-500 animate-shake';
                }

                return (
                  <button
                    key={squareName}
                    onClick={() => handleSquareClick(file, rank)}
                    className={`w-full h-full relative transition-all duration-150 flex items-center justify-center hover:brightness-105 active:scale-95 ${squareBg}`}
                  >
                    {/* Render coordinate markings on board edges */}
                    {file === 'a' && (
                      <span className={`absolute left-0.5 top-0.5 text-[8px] font-bold ${
                        isDark ? 'text-[#E8D3B9]' : 'text-[#7A583E]'
                      }`}>
                        {rank}
                      </span>
                    )}
                    {rank === 1 && (
                      <span className={`absolute right-0.5 bottom-0.5 text-[8px] font-bold ${
                        isDark ? 'text-[#E8D3B9]' : 'text-[#7A583E]'
                      }`}>
                        {file}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
