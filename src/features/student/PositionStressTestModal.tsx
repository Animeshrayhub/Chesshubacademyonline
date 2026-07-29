'use client';

import React, { useState, useEffect } from 'react';

interface PositionStressTestModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TEST_POSITIONS = [
  {
    title: 'Tactical Evaluation #1',
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    correctAnswer: 'white',
    explanation: 'White has strategic initiative attacking f7 with Bishop and Knight.',
  },
  {
    title: 'Endgame Stress Test #2',
    fen: '8/8/p7/1P6/8/8/8/k6K w - - 0 1',
    correctAnswer: 'white',
    explanation: 'Passed pawn on b5 promotes faster than Black pawn on a6.',
  },
  {
    title: 'Equal Position Test #3',
    fen: 'r1bqk2r/pppp1ppp/2n2n2/4p3/4P3/2N2N2/PPPP1PPP/R1BQKB1R w KQkq - 4 4',
    correctAnswer: 'equal',
    explanation: 'Symmetrical Four Knights position with equal pawn structures.',
  },
];

export default function PositionStressTestModal({
  isOpen,
  onClose,
}: PositionStressTestModalProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(30);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [isFinished, setIsFinished] = useState(false);

  useEffect(() => {
    if (!isOpen || isFinished) return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, isFinished]);

  if (!isOpen) return null;

  const currentPos = TEST_POSITIONS[currentIndex];

  const handleSelect = (answer: string) => {
    setSelectedAnswer(answer);
    if (answer === currentPos.correctAnswer) {
      setScore((prev) => prev + 1);
    }
    setTimeout(() => {
      if (currentIndex + 1 < TEST_POSITIONS.length) {
        setCurrentIndex((prev) => prev + 1);
        setSelectedAnswer(null);
      } else {
        setIsFinished(true);
      }
    }, 600);
  };

  const handleReset = () => {
    setCurrentIndex(0);
    setTimeLeft(30);
    setSelectedAnswer(null);
    setScore(0);
    setIsFinished(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg shadow-2xl text-white space-y-6">
        <div className="flex justify-between items-center border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⚡</span>
            <h3 className="font-heading font-bold text-lg text-amber-400">
              30s Position Stress Test
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {!isFinished ? (
          <div className="space-y-4">
            <div className="flex justify-between items-center text-xs font-bold">
              <span className="text-slate-400">
                Question {currentIndex + 1} of {TEST_POSITIONS.length}
              </span>
              <span className="px-3 py-1 bg-red-500/10 border border-red-500/30 text-red-400 rounded-full font-mono font-extrabold animate-pulse">
                ⏱️ {timeLeft}s remaining
              </span>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2 text-center">
              <span className="text-xs text-amber-300 font-bold block">{currentPos.title}</span>
              <div className="font-mono text-[11px] text-slate-300 truncate bg-slate-900 p-2 rounded-xl border border-slate-800">
                {currentPos.fen}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <p className="text-xs text-slate-300 font-bold text-center mb-3">
                Who holds the winning advantage in this position?
              </p>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleSelect('white')}
                  className={`py-3 px-3 rounded-xl font-bold border transition-all ${
                    selectedAnswer === 'white'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-gold'
                      : 'bg-slate-950 border-slate-800 text-white hover:border-slate-700'
                  }`}
                >
                  ⚪ White Winning
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect('equal')}
                  className={`py-3 px-3 rounded-xl font-bold border transition-all ${
                    selectedAnswer === 'equal'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-gold'
                      : 'bg-slate-950 border-slate-800 text-white hover:border-slate-700'
                  }`}
                >
                  ⚖️ Equal Position
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect('black')}
                  className={`py-3 px-3 rounded-xl font-bold border transition-all ${
                    selectedAnswer === 'black'
                      ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-gold'
                      : 'bg-slate-950 border-slate-800 text-white hover:border-slate-700'
                  }`}
                >
                  ⬛ Black Winning
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto text-3xl shadow-gold">
              🏆
            </div>
            <h4 className="font-heading font-extrabold text-lg text-white">
              Stress Test Complete!
            </h4>
            <p className="text-xs text-slate-300">
              You scored <strong className="text-amber-400 font-mono text-base">{score} / {TEST_POSITIONS.length}</strong> under 30s clock pressure.
            </p>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs text-slate-400 text-left space-y-1.5">
              <p className="font-bold text-white">📊 Time Management Diagnostic:</p>
              <p>• Your evaluation pace: <span className="text-emerald-400 font-bold">Fast & Intuitive</span></p>
              <p>• Tactical alertness: <span className="text-amber-400 font-bold">High</span></p>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={handleReset}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs"
              >
                🔄 Retry Test
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-gold"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
