'use client';

import React, { useState, useId } from 'react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  timerSec: number | null;
}

interface QuizAnswer {
  studentName: string;
  studentId: string;
  answerIndex: number;
  answeredAt: string;
}

interface StudentInfo {
  firstName: string;
  lastName: string;
  email: string;
  studentProfileId?: string;
  userId?: string;
}

interface ClassroomQuizTabProps {
  isCoach: boolean;
  activeQuiz: QuizQuestion | null;
  quizAnswers: QuizAnswer[];
  myQuizAnswer: number | null;
  quizRevealed: boolean;
  quizTimeLeft: number | null;
  quizBank: QuizQuestion[];
  students: StudentInfo[];
  onLaunchQuiz: (q: QuizQuestion) => void;
  onReveal: () => void;
  onEndQuiz: () => void;
  onStudentAnswer: (answerIndex: number) => void;
  onSaveToBank: (q: QuizQuestion) => void;
}

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_COLORS = [
  { bg: 'bg-blue-600/20', border: 'border-blue-500/40', text: 'text-blue-200', hover: 'hover:bg-blue-600/40' },
  { bg: 'bg-amber-600/20', border: 'border-amber-500/40', text: 'text-amber-200', hover: 'hover:bg-amber-600/40' },
  { bg: 'bg-emerald-600/20', border: 'border-emerald-500/40', text: 'text-emerald-200', hover: 'hover:bg-emerald-600/40' },
  { bg: 'bg-rose-600/20', border: 'border-rose-500/40', text: 'text-rose-200', hover: 'hover:bg-rose-600/40' },
];

const DEFAULT_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q_def_1',
    question: 'What is the point value of a Rook in standard chess relative scoring?',
    options: ['3 Points', '5 Points', '9 Points', '1 Point'],
    correctIndex: 1,
    timerSec: 30,
  },
  {
    id: 'q_def_2',
    question: 'Which chess piece is the only one capable of jumping over other pieces?',
    options: ['Bishop', 'Rook', 'Knight', 'Queen'],
    correctIndex: 2,
    timerSec: 30,
  },
  {
    id: 'q_def_3',
    question: 'What is it called when a pawn reaches the enemy back rank (8th rank)?',
    options: ['En Passant', 'Promotion', 'Castling', 'Checkmate'],
    correctIndex: 1,
    timerSec: 30,
  },
  {
    id: 'q_def_4',
    question: 'Which tactical move attacks two or more enemy pieces simultaneously with a single piece?',
    options: ['Pin', 'Skewer', 'Fork', 'Battery'],
    correctIndex: 2,
    timerSec: 30,
  },
  {
    id: 'q_def_5',
    question: 'What is the special move involving the King and a Rook for king safety?',
    options: ['En Passant', 'Promotion', 'Castling', 'Fianchetto'],
    correctIndex: 2,
    timerSec: 30,
  },
  {
    id: 'q_def_6',
    question: 'What happens when a King is attacked and has no legal moves to escape or block?',
    options: ['Stalemate', 'Checkmate', 'Draw by Repetition', 'Resignation'],
    correctIndex: 1,
    timerSec: 30,
  },
  {
    id: 'q_def_7',
    question: 'In the opening phase of a game, control of which board area is most essential?',
    options: ['Flanks', 'Center (d4, e4, d5, e5)', 'Back Rank', 'Corners'],
    correctIndex: 1,
    timerSec: 30,
  },
  {
    id: 'q_def_8',
    question: 'Which piece can move diagonally any number of open squares?',
    options: ['Rook', 'Bishop', 'Knight', 'Pawn'],
    correctIndex: 1,
    timerSec: 30,
  },
  {
    id: 'q_def_9',
    question: 'What is the result of a game when a player has no legal moves but is NOT in check?',
    options: ['Win for White', 'Win for Black', 'Stalemate (Draw)', 'Loss for Active Player'],
    correctIndex: 2,
    timerSec: 30,
  },
  {
    id: 'q_def_10',
    question: 'What is a "Pin" in chess tactics?',
    options: [
      'A piece is restricted because moving it exposes a higher-value piece behind it',
      'Attacking the enemy King with two pieces simultaneously',
      'Pawn capture moving diagonally past another pawn',
      'Promoting a pawn to a second Queen'
    ],
    correctIndex: 0,
    timerSec: 30,
  },
];

export default function ClassroomQuizTab({
  isCoach,
  activeQuiz,
  quizAnswers,
  myQuizAnswer,
  quizRevealed,
  quizTimeLeft,
  quizBank: propQuizBank,
  students,
  onLaunchQuiz,
  onReveal,
  onEndQuiz,
  onStudentAnswer,
  onSaveToBank,
}: ClassroomQuizTabProps) {
  const effectiveBank = propQuizBank && propQuizBank.length > 0 ? propQuizBank : DEFAULT_QUIZ_QUESTIONS;
  const quizBank = effectiveBank;
  const uid = useId();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showBank, setShowBank] = useState(false);
  const [draftQuestion, setDraftQuestion] = useState('');
  const [draftOptions, setDraftOptions] = useState(['', '', '', '']);
  const [draftCorrect, setDraftCorrect] = useState(0);
  const [draftTimer, setDraftTimer] = useState<number | null>(null);

  const resetForm = () => {
    setDraftQuestion('');
    setDraftOptions(['', '', '', '']);
    setDraftCorrect(0);
    setDraftTimer(null);
    setShowCreateForm(false);
  };

  const handleLaunch = () => {
    if (!draftQuestion.trim() || draftOptions.some((o) => !o.trim())) return;
    const q: QuizQuestion = {
      id: `q_${Date.now()}`,
      question: draftQuestion.trim(),
      options: draftOptions.map((o) => o.trim()),
      correctIndex: draftCorrect,
      timerSec: draftTimer,
    };
    onSaveToBank(q);
    onLaunchQuiz(q);
    resetForm();
  };

  const handleLoadFromBank = (q: QuizQuestion) => {
    setDraftQuestion(q.question);
    setDraftOptions([...q.options]);
    setDraftCorrect(q.correctIndex);
    setDraftTimer(q.timerSec);
    setShowBank(false);
    setShowCreateForm(true);
  };

  // ── STUDENT VIEW ─────────────────────────────────────────────────────────
  if (!isCoach) {
    return (
      <div className="flex-1 overflow-y-auto p-3 bg-[#0d0d1a] space-y-3">
        {!activeQuiz ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <span className="text-4xl">❓</span>
            <p className="text-xs font-bold text-[#888899]">Waiting for coach to launch a quiz question…</p>
            <p className="text-[10px] text-[#555577]">You will be notified automatically when it starts.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {quizTimeLeft !== null && quizTimeLeft > 0 && !quizRevealed && (
              <div className={`flex items-center justify-center gap-2 py-1.5 rounded-lg font-mono font-extrabold text-sm ${quizTimeLeft <= 5 ? 'bg-red-950/80 text-red-300 animate-pulse' : 'bg-[#1a1a32] text-amber-300'}`}>
                ⏱ {quizTimeLeft}s
              </div>
            )}
            <div className="bg-[#1a1a32] border border-[#2a2a4a] rounded-xl p-3">
              <p className="text-xs font-extrabold text-white leading-relaxed">{activeQuiz.question}</p>
            </div>
            <div className="space-y-2">
              {activeQuiz.options.map((opt, i) => {
                const colors = OPTION_COLORS[i];
                const isSelected = myQuizAnswer === i;
                const isCorrect = quizRevealed && i === activeQuiz.correctIndex;
                const isWrong = quizRevealed && isSelected && i !== activeQuiz.correctIndex;
                let extraClass = '';
                if (isCorrect) extraClass = 'bg-emerald-700/40 border-emerald-400 text-emerald-200 ring-2 ring-emerald-400';
                else if (isWrong) extraClass = 'bg-red-700/30 border-red-400/60 text-red-300';
                else if (isSelected) extraClass = `${colors.bg} ${colors.border} ${colors.text} ring-1 ring-white/30`;
                else if (myQuizAnswer !== null) extraClass = `${colors.bg} ${colors.border} ${colors.text} opacity-50`;
                else extraClass = `${colors.bg} ${colors.border} ${colors.text} ${colors.hover}`;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={myQuizAnswer !== null || quizRevealed}
                    onClick={() => onStudentAnswer(i)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${extraClass} disabled:cursor-not-allowed`}
                  >
                    <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-[11px] font-extrabold flex-shrink-0">
                      {isCorrect ? '✓' : isWrong ? '✗' : OPTION_LABELS[i]}
                    </span>
                    <span className="text-xs font-semibold">{opt}</span>
                  </button>
                );
              })}
            </div>
            {quizRevealed && (
              <div className={`p-3 rounded-xl text-center text-xs font-extrabold ${myQuizAnswer === activeQuiz.correctIndex ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40' : 'bg-red-900/30 text-red-300 border border-red-700/30'}`}>
                {myQuizAnswer === null
                  ? "⏰ Time's up! You didn't answer."
                  : myQuizAnswer === activeQuiz.correctIndex
                  ? '🎉 Correct! Well done!'
                  : `❌ Incorrect. Correct answer: ${OPTION_LABELS[activeQuiz.correctIndex]}`}
              </div>
            )}
            {myQuizAnswer !== null && !quizRevealed && (
              <div className="p-2 bg-[#1a1a32] border border-[#2a2a4a] rounded-xl text-center text-xs text-[#8888cc]">
                ✅ Answer submitted — waiting for coach to reveal…
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── COACH VIEW ────────────────────────────────────────────────────────────
  const totalStudents = students.length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0d1a]">
      {activeQuiz ? (
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-[10px] font-extrabold text-[#888899] uppercase tracking-widest">Active Quiz</p>
            <div className="flex gap-2">
              {!quizRevealed && (
                <button type="button" onClick={onReveal} className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-extrabold rounded transition-colors">
                  👁 Reveal Answer
                </button>
              )}
              <button type="button" onClick={onEndQuiz} className="px-2.5 py-1 bg-red-800/60 hover:bg-red-700/80 text-red-200 text-[10px] font-bold rounded border border-red-700/40 transition-colors">
                End Quiz
              </button>
            </div>
          </div>
          {quizTimeLeft !== null && quizTimeLeft > 0 && !quizRevealed && (
            <div className={`text-center font-mono font-extrabold text-sm py-1 rounded-lg ${quizTimeLeft <= 5 ? 'bg-red-950/80 text-red-300 animate-pulse' : 'bg-[#1a1a32] text-amber-300'}`}>
              ⏱ {quizTimeLeft}s remaining
            </div>
          )}
          <div className="bg-[#1a1a32] border border-[#2a2a4a] rounded-xl p-3">
            <p className="text-xs font-bold text-white">{activeQuiz.question}</p>
          </div>
          <div className="space-y-2">
            <p className="text-[10px] font-bold text-[#555577] uppercase tracking-widest">
              Responses: {quizAnswers.length} / {totalStudents}
            </p>
            {activeQuiz.options.map((opt, i) => {
              const count = quizAnswers.filter((a) => a.answerIndex === i).length;
              const pct = totalStudents > 0 ? Math.round((count / totalStudents) * 100) : 0;
              const isCorrect = i === activeQuiz.correctIndex;
              const colors = OPTION_COLORS[i];
              return (
                <div key={i} className="space-y-0.5">
                  <div className="flex items-center justify-between text-[10px] font-bold">
                    <span className={colors.text}>{OPTION_LABELS[i]}: {opt.slice(0, 28)}{opt.length > 28 ? '…' : ''}</span>
                    <span className={isCorrect && quizRevealed ? 'text-emerald-400 font-extrabold' : 'text-[#888899]'}>{count}{isCorrect && quizRevealed ? ' ✓' : ''}</span>
                  </div>
                  <div className="h-4 bg-[#1a1a2a] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${isCorrect && quizRevealed ? 'bg-emerald-500' : 'bg-[#3a3a6a]'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
          {quizAnswers.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#555577] uppercase">Responses:</p>
              {quizAnswers.map((a) => (
                <div key={a.studentId} className="flex items-center gap-2 text-[10px] bg-[#1a1a2a] rounded px-2 py-1">
                  <span className="font-bold text-white">{a.studentName}</span>
                  <span className={`px-1 rounded font-extrabold ${a.answerIndex === activeQuiz.correctIndex ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
                    {OPTION_LABELS[a.answerIndex]}{quizRevealed && (a.answerIndex === activeQuiz.correctIndex ? ' ✓' : ' ✗')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="p-3 space-y-3">
          <p className="text-[10px] font-extrabold text-[#888899] uppercase tracking-widest">In-Class Quiz</p>
          {!showCreateForm && (
            <div className="flex gap-2">
              <button type="button" onClick={() => { setShowCreateForm(true); setShowBank(false); }} className="flex-1 py-2.5 bg-[#c84b31] hover:bg-[#d55339] text-white text-[11px] font-extrabold rounded-xl transition-colors flex items-center justify-center gap-1.5">
                <span>✏️</span><span>Create Question</span>
              </button>
              <button type="button" onClick={() => setShowBank((v) => !v)} className="flex-1 py-2.5 bg-[#1a1a32] hover:bg-[#252548] border border-[#2a2a4a] text-[#aaaacc] text-[11px] font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5">
                <span>📚</span><span>Bank ({quizBank.length})</span>
              </button>
            </div>
          )}
          {showBank && !showCreateForm && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {quizBank.length === 0 ? (
                <p className="text-xs text-[#555577] italic text-center py-4">No saved questions yet.</p>
              ) : (
                quizBank.map((q) => (
                  <div key={q.id} className="bg-[#1a1a32] border border-[#2a2a4a] rounded-xl p-3 cursor-pointer hover:border-[#c84b31]/60 transition-colors" onClick={() => handleLoadFromBank(q)}>
                    <p className="text-xs font-bold text-white leading-tight mb-1">{q.question}</p>
                    <div className="flex gap-1 flex-wrap">
                      {q.options.map((o, i) => (
                        <span key={i} className={`text-[9px] px-1.5 py-0.5 rounded ${i === q.correctIndex ? 'bg-emerald-900/50 text-emerald-300' : 'bg-[#252548] text-[#666688]'}`}>
                          {OPTION_LABELS[i]}: {o.slice(0, 16)}{o.length > 16 ? '…' : ''}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
          {showCreateForm && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-extrabold text-white">New Quiz Question</p>
                <button type="button" onClick={resetForm} className="text-[10px] text-[#888899] hover:text-white transition-colors">✕ Cancel</button>
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#888899] uppercase mb-1">Question</label>
                <textarea rows={2} value={draftQuestion} onChange={(e) => setDraftQuestion(e.target.value)} placeholder="e.g. What is the best move for white here?" className="w-full bg-[#1a1a32] border border-[#2a2a4a] rounded-lg px-2.5 py-2 text-xs text-white placeholder-[#444466] focus:outline-none focus:border-[#c84b31] resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[#888899] uppercase mb-1">Options <span className="text-[#555577] normal-case">(click to mark correct)</span></label>
                {draftOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button type="button" onClick={() => setDraftCorrect(i)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 transition-all ${draftCorrect === i ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-transparent border-[#3a3a5a] text-[#666688] hover:border-[#8888cc]'}`}>
                      {draftCorrect === i ? '✓' : OPTION_LABELS[i]}
                    </button>
                    <input id={`${uid}-opt-${i}`} type="text" value={opt} onChange={(e) => { const next = [...draftOptions]; next[i] = e.target.value; setDraftOptions(next); }} placeholder={`Option ${OPTION_LABELS[i]}`} className="flex-1 bg-[#1a1a32] border border-[#2a2a4a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#444466] focus:outline-none focus:border-[#c84b31]" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#888899] uppercase mb-1">Countdown Timer</label>
                <div className="flex gap-2">
                  {([null, 15, 30, 60] as Array<number | null>).map((t) => (
                    <button key={String(t)} type="button" onClick={() => setDraftTimer(t)} className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${draftTimer === t ? 'bg-[#c84b31] border-[#c84b31] text-white' : 'bg-[#1a1a32] border-[#2a2a4a] text-[#888899] hover:border-[#c84b31]/60'}`}>
                      {t === null ? 'None' : `${t}s`}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={handleLaunch} disabled={!draftQuestion.trim() || draftOptions.some((o) => !o.trim())} className="w-full py-3 bg-gradient-to-r from-[#c84b31] to-rose-600 hover:from-[#d55339] hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                🚀 Launch Question to Students
              </button>
            </div>
          )}
          {!showCreateForm && !showBank && (
            <div className="text-center py-8">
              <p className="text-[11px] text-[#555577]">Create a question or load one from your saved bank.</p>
              <p className="text-[10px] text-[#444466] mt-1">Students will see it instantly on their screen.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
