'use client';

import React, { useState } from 'react';
import { type ClassroomQuizState, type UserRole } from '@/lib/classroom-v2/types';

interface ClassroomQuizProps {
  quiz: ClassroomQuizState | null;
  isCoach: boolean;
  onStartQuiz?: (question: string, options: string[], correctIndex: number, explanation: string) => void;
  onCloseQuiz?: () => void;
  onRevealQuiz?: () => void;
  onSubmitAnswer?: (quizId: string, selectedOptionIndex: number) => Promise<boolean>;
  className?: string;
}

export default function ClassroomQuiz({
  quiz,
  isCoach,
  onStartQuiz,
  onCloseQuiz,
  onRevealQuiz,
  onSubmitAnswer,
  className = '',
}: ClassroomQuizProps) {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form for Coach to launch a new quiz
  const [questionInput, setQuestionInput] = useState('');
  const [optionsInput, setOptionsInput] = useState(['', '', '', '']);
  const [correctOptionIndex, setCorrectOptionIndex] = useState(0);
  const [explanationInput, setExplanationInput] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (selectedOption === null || !quiz || hasSubmitted || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (onSubmitAnswer) {
        await onSubmitAnswer(quiz.quizId, selectedOption);
        setHasSubmitted(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateQuiz = (e: React.FormEvent) => {
    e.preventDefault();
    if (!questionInput.trim() || optionsInput.some((o) => !o.trim())) return;
    onStartQuiz?.(
      questionInput.trim(),
      optionsInput.map((o) => o.trim()),
      correctOptionIndex,
      explanationInput.trim()
    );
    setIsCreating(false);
    setQuestionInput('');
    setOptionsInput(['', '', '', '']);
    setExplanationInput('');
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="h-9 bg-slate-950/80 px-3 border-b border-slate-800 flex items-center justify-between">
        <span className="font-extrabold text-xs text-slate-300 tracking-wide uppercase">
          Live Quiz {quiz ? `• ${quiz.status.toUpperCase()}` : ''}
        </span>
        {isCoach && !quiz && !isCreating && (
          <button
            type="button"
            onClick={() => setIsCreating(true)}
            className="px-2 py-0.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shadow-sm"
          >
            + Create Question
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Coach Quiz Creator */}
        {isCoach && isCreating && (
          <form onSubmit={handleCreateQuiz} className="space-y-3 bg-slate-850 p-3 rounded-xl border border-slate-700">
            <h4 className="text-xs font-bold text-slate-200">New Quiz Question</h4>
            <input
              type="text"
              placeholder="e.g., What is the best move for White?"
              value={questionInput}
              onChange={(e) => setQuestionInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-blue-500"
              required
            />

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 font-bold block">Options (Select correct option radio)</label>
              {optionsInput.map((opt, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct_option"
                    checked={correctOptionIndex === idx}
                    onChange={() => setCorrectOptionIndex(idx)}
                    className="accent-emerald-500"
                  />
                  <input
                    type="text"
                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                    value={opt}
                    onChange={(e) => {
                      const updated = [...optionsInput];
                      updated[idx] = e.target.value;
                      setOptionsInput(updated);
                    }}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
                    required
                  />
                </div>
              ))}
            </div>

            <input
              type="text"
              placeholder="Explanation (revealed after quiz ends)"
              value={explanationInput}
              onChange={(e) => setExplanationInput(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:outline-none"
            />

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-3 py-1 rounded-lg text-xs font-bold bg-slate-800 text-slate-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow"
              >
                Launch Question
              </button>
            </div>
          </form>
        )}

        {/* Active Quiz View */}
        {quiz ? (
          <div className="space-y-4">
            <div className="p-3 bg-slate-800/60 border border-slate-750 rounded-xl space-y-1">
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Active Question</span>
              <p className="text-sm font-bold text-white leading-snug">{quiz.question}</p>
            </div>

            {/* Options List */}
            <div className="space-y-2">
              {quiz.options.map((option, idx) => {
                const isSelected = selectedOption === idx;
                const isRevealed = quiz.status === 'revealed';
                const isCorrect = isRevealed && quiz.correctIndex === idx;
                const isWrongSelection = isRevealed && isSelected && quiz.correctIndex !== idx;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={hasSubmitted || quiz.status !== 'active'}
                    onClick={() => setSelectedOption(idx)}
                    className={`w-full text-left p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between ${
                      isCorrect
                        ? 'bg-emerald-600/30 border-emerald-500 text-emerald-200'
                        : isWrongSelection
                        ? 'bg-rose-600/30 border-rose-500 text-rose-200'
                        : isSelected
                        ? 'bg-blue-600/30 border-blue-500 text-blue-200 shadow-md'
                        : 'bg-slate-800/40 border-slate-750 hover:bg-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-slate-700 flex items-center justify-center text-[10px] font-black">
                        {String.fromCharCode(65 + idx)}
                      </span>
                      <span>{option}</span>
                    </div>

                    {isCorrect && <span className="text-emerald-400 font-extrabold">✓ Correct</span>}
                    {isWrongSelection && <span className="text-rose-400 font-extrabold">✕ Wrong</span>}
                  </button>
                );
              })}
            </div>

            {/* Student Submit Button */}
            {!isCoach && quiz.status === 'active' && (
              <button
                type="button"
                disabled={selectedOption === null || hasSubmitted || isSubmitting}
                onClick={handleSubmit}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white font-black text-xs transition-all shadow-md"
              >
                {hasSubmitted ? '✓ Answer Submitted' : 'Submit Answer'}
              </button>
            )}

            {/* Revealed Explanation */}
            {quiz.status === 'revealed' && quiz.explanation && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl space-y-1">
                <span className="text-[10px] font-bold text-emerald-400 uppercase">Coach Explanation</span>
                <p className="text-xs text-slate-200">{quiz.explanation}</p>
              </div>
            )}

            {/* Coach Management Controls */}
            {isCoach && (
              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                {quiz.status === 'active' && (
                  <button
                    type="button"
                    onClick={onCloseQuiz}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold shadow"
                  >
                    Close Submissions
                  </button>
                )}

                {quiz.status === 'closed' && (
                  <button
                    type="button"
                    onClick={onRevealQuiz}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                  >
                    Reveal Solution to Students
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsCreating(true)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
                >
                  Next Question
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-40 flex flex-col items-center justify-center text-center text-slate-500 p-4">
            <span className="text-2xl mb-1">🎯</span>
            <p className="text-xs font-bold text-slate-400">No active quiz</p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {isCoach ? 'Click "+ Create Question" above to launch a quiz.' : 'Waiting for Coach to start a quiz.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
