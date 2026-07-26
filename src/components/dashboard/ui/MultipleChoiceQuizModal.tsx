'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface MultipleChoiceQuizModalProps {
  isOpen: boolean;
  onClose: () => void;
  questions?: QuizQuestion[];
}

export default function MultipleChoiceQuizModal({
  isOpen,
  onClose,
  questions = [
    {
      id: 'q1',
      question: 'What is the primary tactical motif when two pieces are in line with an attacking piece of higher value?',
      options: ['A) Skewer', 'B) Pin', 'C) Fork', 'D) Discovered Attack'],
      correctIndex: 0,
      explanation: 'A Skewer is similar to a pin, but the more valuable piece is in front of the weaker piece!',
    },
    {
      id: 'q2',
      question: 'What is the best move to achieve checkmate in 1 when King is on h8 and Pawn on g7?',
      options: ['A) 1. Qh7#', 'B) 1. Qf8#', 'C) 1. Qg7#', 'D) 1. Qe8#'],
      correctIndex: 2,
      explanation: '1. Qg7# supported by a bishop or rook delivers instant checkmate!',
    },
  ],
}: MultipleChoiceQuizModalProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const currentQ = questions[currentIdx];

  const handleSelectOption = (idx: number) => {
    if (selectedIndex !== null) return;
    setSelectedIndex(idx);
    if (idx === currentQ.correctIndex) {
      setScore((prev) => prev + 1);
    }
  };

  const handleNext = () => {
    if (currentIdx + 1 < questions.length) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedIndex(null);
    } else {
      setSubmitted(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-lg">
              ❓
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-indigo-300">
                Tactical Knowledge Quiz
              </h3>
              <p className="text-xs text-slate-400">Test your chess understanding and tactical motifs.</p>
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

        {submitted ? (
          <div className="p-6 bg-slate-950 border border-slate-800 rounded-2xl text-center space-y-3">
            <div className="text-4xl">🏆</div>
            <h4 className="text-base font-bold text-emerald-400">Quiz Completed!</h4>
            <p className="text-xs text-slate-300 font-mono">
              Score: <strong className="text-amber-400 text-sm">{score} / {questions.length}</strong> ({Math.round((score / questions.length) * 100)}%)
            </p>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={onClose}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold w-full py-2 text-xs"
            >
              Close Quiz
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between text-xs font-bold text-slate-400">
              <span>Question {currentIdx + 1} of {questions.length}</span>
              <span className="text-amber-400">Score: {score}</span>
            </div>

            <h4 className="text-sm font-bold text-white leading-relaxed">{currentQ.question}</h4>

            <div className="space-y-2">
              {currentQ.options.map((opt, idx) => {
                const isSelected = selectedIndex === idx;
                const isCorrect = idx === currentQ.correctIndex;
                let bgClass = 'bg-slate-950 border-slate-800 hover:border-indigo-500/50 text-slate-200';

                if (selectedIndex !== null) {
                  if (isCorrect) bgClass = 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300';
                  else if (isSelected) bgClass = 'bg-red-500/20 border-red-500/50 text-red-300';
                }

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={selectedIndex !== null}
                    onClick={() => handleSelectOption(idx)}
                    className={`w-full p-3 border rounded-xl text-xs font-bold text-left transition-all ${bgClass}`}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {selectedIndex !== null && (
              <div className="p-3 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-2">
                <p className="text-xs text-indigo-200">
                  💡 <strong>Explanation:</strong> {currentQ.explanation}
                </p>
                <button
                  type="button"
                  onClick={handleNext}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-lg shadow-md"
                >
                  {currentIdx + 1 < questions.length ? 'Next Question ➔' : 'View Final Results 🏆'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
