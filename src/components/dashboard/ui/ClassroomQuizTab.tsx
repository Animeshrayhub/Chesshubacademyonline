'use client';

import React, { useState, useEffect, useId, useCallback } from 'react';
import {
  fetchQuizQuestionsAction,
  createQuizSessionAction,
  saveQuizAnswerAction,
  endQuizSessionAction,
  saveQuizResultsAction,
  type QuizQuestionDB,
} from '@/actions/quiz';

// ── Types ─────────────────────────────────────────────────────────────────────
interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  timerSec: number | null;
  explanation?: string | null;
  topic?: string;
  difficulty?: string;
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
  classId: string;
  userId?: string;
  activeQuiz: QuizQuestion | null;
  quizAnswers: QuizAnswer[];
  myQuizAnswer: number | null;
  quizRevealed: boolean;
  quizTimeLeft: number | null;
  /** External quiz bank passed from parent (localStorage cache) */
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

// ── Coach-only DB-backed quiz bank (loaded from quiz_questions table) ─────────
function useDbQuizBank() {
  const [dbQuestions, setDbQuestions] = useState<QuizQuestion[]>([]);
  const [totalAvailable, setTotalAvailable] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchQuizQuestionsAction(50);
      if (res.success && res.data) {
        const mapped: QuizQuestion[] = res.data.map((q: QuizQuestionDB) => ({
          id: q.id,
          question: q.question,
          options: q.options,
          correctIndex: q.correct_index,
          timerSec: q.timer_sec ?? 30,
          explanation: q.explanation,
          topic: q.topic,
          difficulty: q.difficulty,
        }));
        setDbQuestions(mapped);
        setTotalAvailable(res.totalAvailable ?? mapped.length);
      } else {
        setError(res.error?.message || 'Failed to load questions from database.');
      }
    } catch (err: any) {
      setError(err.message || 'Unexpected error loading questions.');
    } finally {
      setLoading(false);
    }
  }, []);

  return { dbQuestions, totalAvailable, loading, error, load };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ClassroomQuizTab({
  isCoach,
  classId,
  userId,
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
  const uid = useId();

  // ── Coach: DB bank & session tracking ─────────────────────────────────────
  const { dbQuestions, totalAvailable, loading: dbLoading, error: dbError, load: loadDbQuestions } = useDbQuizBank();
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [quizIndex, setQuizIndex] = useState(0); // which question in the bank
  const [coachView, setCoachView] = useState<'bank' | 'create' | 'topics'>('bank');

  // Merge DB questions with prop bank (prop bank = localStorage cache for ad-hoc questions)
  const allBankQuestions: QuizQuestion[] = [
    ...dbQuestions,
    ...(propQuizBank || []).filter((p) => !dbQuestions.some((d) => d.id === p.id)),
  ];

  // ── Create form state ──────────────────────────────────────────────────────
  const [draftQuestion, setDraftQuestion] = useState('');
  const [draftOptions, setDraftOptions] = useState(['', '', '', '']);
  const [draftCorrect, setDraftCorrect] = useState(0);
  const [draftTimer, setDraftTimer] = useState<number | null>(30);

  const resetForm = () => {
    setDraftQuestion('');
    setDraftOptions(['', '', '', '']);
    setDraftCorrect(0);
    setDraftTimer(30);
    setCoachView('bank');
  };

  // ── Start a quiz session and launch the first question ────────────────────
  const handleStartDbQuiz = async () => {
    if (allBankQuestions.length === 0) return;
    const qCount = Math.min(allBankQuestions.length, 50);

    // Create persistent session
    const sessionRes = await createQuizSessionAction(classId, qCount);
    if (sessionRes.success && sessionRes.data) {
      setQuizSessionId(sessionRes.data.sessionId);
    }

    setQuizIndex(0);
    const first = allBankQuestions[0];
    onLaunchQuiz(first);
  };

  // ── Coach launches next question ──────────────────────────────────────────
  const handleNextQuestion = () => {
    const next = quizIndex + 1;
    if (next >= allBankQuestions.length) {
      // No more questions — end quiz
      handleEndQuiz();
      return;
    }
    setQuizIndex(next);
    onReveal(); // brief reveal of previous answer
    setTimeout(() => {
      onLaunchQuiz(allBankQuestions[next]);
    }, 1500);
  };

  // ── Coach ends quiz and saves results ─────────────────────────────────────
  const handleEndQuiz = async () => {
    if (quizSessionId) {
      await endQuizSessionAction(quizSessionId);
    }
    onEndQuiz();
    setQuizSessionId(null);
    setQuizIndex(0);
  };

  // ── Create + launch ad-hoc question ───────────────────────────────────────
  const handleLaunchAdHoc = async () => {
    if (!draftQuestion.trim() || draftOptions.some((o) => !o.trim())) return;
    const q: QuizQuestion = {
      id: `q_adhoc_${Date.now()}`,
      question: draftQuestion.trim(),
      options: draftOptions.map((o) => o.trim()),
      correctIndex: draftCorrect,
      timerSec: draftTimer,
    };
    onSaveToBank(q);
    onLaunchQuiz(q);
    resetForm();
  };

  // ── Student: persist answer when submitted ─────────────────────────────────
  const handleStudentAnswer = async (answerIndex: number) => {
    onStudentAnswer(answerIndex);
    // Save to DB (best-effort, non-blocking)
    if (quizSessionId && activeQuiz && userId) {
      saveQuizAnswerAction({
        quizSessionId,
        questionId: activeQuiz.id,
        studentId: userId,
        studentName: userId, // parent could pass userName; this is the studentId
        answerIndex,
        correct: answerIndex === activeQuiz.correctIndex,
      }).catch(() => {/* non-fatal */});
    }
  };

  // ── Load DB questions on first coach open ──────────────────────────────────
  useEffect(() => {
    if (isCoach && dbQuestions.length === 0 && !dbLoading) {
      loadDbQuestions();
    }
  }, [isCoach, dbQuestions.length, dbLoading, loadDbQuestions]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STUDENT VIEW
  // ─────────────────────────────────────────────────────────────────────────────
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
            {/* Timer */}
            {quizTimeLeft !== null && quizTimeLeft > 0 && !quizRevealed && (
              <div className={`flex items-center justify-center gap-2 py-1.5 rounded-lg font-mono font-extrabold text-sm ${quizTimeLeft <= 5 ? 'bg-red-950/80 text-red-300 animate-pulse' : 'bg-[#1a1a32] text-amber-300'}`}>
                ⏱ {quizTimeLeft}s
              </div>
            )}

            {/* Topic / Difficulty badge */}
            {(activeQuiz.topic || activeQuiz.difficulty) && (
              <div className="flex items-center gap-2 flex-wrap">
                {activeQuiz.topic && (
                  <span className="text-[9px] px-2 py-0.5 bg-indigo-900/40 text-indigo-300 border border-indigo-700/40 rounded-full font-bold">{activeQuiz.topic}</span>
                )}
                {activeQuiz.difficulty && (
                  <span className={`text-[9px] px-2 py-0.5 rounded-full font-bold border ${activeQuiz.difficulty === 'Advanced' ? 'bg-red-900/40 text-red-300 border-red-700/40' : activeQuiz.difficulty === 'Intermediate' ? 'bg-amber-900/40 text-amber-300 border-amber-700/40' : 'bg-emerald-900/40 text-emerald-300 border-emerald-700/40'}`}>
                    {activeQuiz.difficulty}
                  </span>
                )}
              </div>
            )}

            {/* Question */}
            <div className="bg-[#1a1a32] border border-[#2a2a4a] rounded-xl p-3">
              <p className="text-xs font-extrabold text-white leading-relaxed">{activeQuiz.question}</p>
            </div>

            {/* Options */}
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
                    onClick={() => handleStudentAnswer(i)}
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

            {/* Revealed result */}
            {quizRevealed && (
              <div>
                <div className={`p-3 rounded-xl text-center text-xs font-extrabold ${myQuizAnswer === activeQuiz.correctIndex ? 'bg-emerald-900/50 text-emerald-300 border border-emerald-700/40' : 'bg-red-900/30 text-red-300 border border-red-700/30'}`}>
                  {myQuizAnswer === null
                    ? "⏰ Time's up! You didn't answer."
                    : myQuizAnswer === activeQuiz.correctIndex
                    ? '🎉 Correct! Well done!'
                    : `❌ Incorrect. Correct: ${OPTION_LABELS[activeQuiz.correctIndex]}`}
                </div>
                {activeQuiz.explanation && (
                  <div className="mt-2 p-2.5 bg-[#1a1a2a] border border-[#2a2a4a] rounded-xl text-[11px] text-[#aaaacc] leading-relaxed">
                    💡 {activeQuiz.explanation}
                  </div>
                )}
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

  // ─────────────────────────────────────────────────────────────────────────────
  // COACH VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  const totalStudents = students.length;

  return (
    <div className="flex-1 overflow-y-auto bg-[#0d0d1a]">
      {/* ── Active Quiz View ── */}
      {activeQuiz ? (
        <div className="p-3 space-y-3">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <p className="text-[10px] font-extrabold text-[#888899] uppercase tracking-widest">Active Quiz</p>
              {allBankQuestions.length > 0 && (
                <p className="text-[10px] text-[#555577]">Question {quizIndex + 1} of {Math.min(allBankQuestions.length, 50)}</p>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {!quizRevealed && (
                <button type="button" onClick={onReveal} className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white text-[10px] font-extrabold rounded transition-colors">
                  👁 Reveal
                </button>
              )}
              {quizRevealed && quizIndex < Math.min(allBankQuestions.length, 50) - 1 && (
                <button type="button" onClick={handleNextQuestion} className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-extrabold rounded transition-colors">
                  Next →
                </button>
              )}
              <button type="button" onClick={handleEndQuiz} className="px-2.5 py-1 bg-red-800/60 hover:bg-red-700/80 text-red-200 text-[10px] font-bold rounded border border-red-700/40 transition-colors">
                End Quiz
              </button>
            </div>
          </div>

          {/* Timer */}
          {quizTimeLeft !== null && quizTimeLeft > 0 && !quizRevealed && (
            <div className={`text-center font-mono font-extrabold text-sm py-1 rounded-lg ${quizTimeLeft <= 5 ? 'bg-red-950/80 text-red-300 animate-pulse' : 'bg-[#1a1a32] text-amber-300'}`}>
              ⏱ {quizTimeLeft}s remaining
            </div>
          )}

          {/* Question */}
          <div className="bg-[#1a1a32] border border-[#2a2a4a] rounded-xl p-3">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              {activeQuiz.topic && <span className="text-[9px] px-1.5 py-0.5 bg-indigo-900/40 text-indigo-300 border border-indigo-700/40 rounded-full font-bold">{activeQuiz.topic}</span>}
              {activeQuiz.difficulty && <span className="text-[9px] px-1.5 py-0.5 bg-amber-900/40 text-amber-300 border border-amber-700/40 rounded-full font-bold">{activeQuiz.difficulty}</span>}
            </div>
            <p className="text-xs font-bold text-white">{activeQuiz.question}</p>
          </div>

          {/* Response bars */}
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
                    <span className={colors.text}>{OPTION_LABELS[i]}: {opt.slice(0, 30)}{opt.length > 30 ? '…' : ''}</span>
                    <span className={isCorrect && quizRevealed ? 'text-emerald-400 font-extrabold' : 'text-[#888899]'}>{count}{isCorrect && quizRevealed ? ' ✓' : ''}</span>
                  </div>
                  <div className="h-4 bg-[#1a1a2a] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${isCorrect && quizRevealed ? 'bg-emerald-500' : 'bg-[#3a3a6a]'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Student answer list */}
          {quizAnswers.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-bold text-[#555577] uppercase">Student Answers:</p>
              {quizAnswers.map((a) => (
                <div key={a.studentId} className="flex items-center gap-2 text-[10px] bg-[#1a1a2a] rounded px-2 py-1">
                  <span className="font-bold text-white truncate max-w-[80px]">{a.studentName}</span>
                  <span className={`px-1.5 rounded font-extrabold ${a.answerIndex === activeQuiz.correctIndex ? 'bg-emerald-900/50 text-emerald-300' : 'bg-red-900/40 text-red-300'}`}>
                    {OPTION_LABELS[a.answerIndex]}{quizRevealed && (a.answerIndex === activeQuiz.correctIndex ? ' ✓' : ' ✗')}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Explanation (after reveal) */}
          {quizRevealed && activeQuiz.explanation && (
            <div className="p-2.5 bg-[#1a1a2a] border border-[#2a2a4a] rounded-xl text-[11px] text-[#aaaacc] leading-relaxed">
              💡 {activeQuiz.explanation}
            </div>
          )}
        </div>

      ) : (
        /* ── Idle Coach View ── */
        <div className="p-3 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-[#888899] uppercase tracking-widest">In-Class Quiz</p>
            <button type="button" onClick={loadDbQuestions} disabled={dbLoading}
              className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold transition-colors disabled:opacity-50">
              {dbLoading ? '⏳ Loading…' : '🔄 Refresh'}
            </button>
          </div>

          {/* DB question count status */}
          {totalAvailable !== null && (
            <div className={`p-2.5 rounded-xl border text-[10px] font-bold flex items-center gap-2 ${totalAvailable >= 50 ? 'bg-emerald-950/50 border-emerald-700/40 text-emerald-300' : totalAvailable > 0 ? 'bg-amber-950/50 border-amber-700/40 text-amber-300' : 'bg-red-950/50 border-red-700/40 text-red-300'}`}>
              <span>{totalAvailable >= 50 ? '✅' : totalAvailable > 0 ? '⚠️' : '❌'}</span>
              <span>
                {totalAvailable >= 50
                  ? `${totalAvailable} questions ready (50-question quiz available)`
                  : totalAvailable > 0
                  ? `Only ${totalAvailable} valid questions available. 50 are required for full quiz.`
                  : 'No active questions in database. Add questions via admin panel.'}
              </span>
            </div>
          )}

          {dbError && (
            <div className="p-2.5 bg-red-950/50 border border-red-700/40 text-red-300 text-[10px] rounded-xl">
              ⚠️ {dbError}
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex gap-1.5">
            {(['bank', 'create'] as const).map((v) => (
              <button key={v} type="button" onClick={() => setCoachView(v)}
                className={`flex-1 py-1.5 text-[10px] font-extrabold rounded-lg border transition-all ${coachView === v ? 'bg-[#c84b31] border-[#c84b31] text-white' : 'bg-[#1a1a32] border-[#2a2a4a] text-[#888899] hover:border-[#c84b31]/60'}`}>
                {v === 'bank' ? `📚 Question Bank (${allBankQuestions.length})` : '✏️ Create Custom'}
              </button>
            ))}
          </div>

          {/* ── Question Bank View ── */}
          {coachView === 'bank' && (
            <div className="space-y-2">
              {/* Start Full Quiz CTA */}
              {allBankQuestions.length > 0 && (
                <button type="button" onClick={handleStartDbQuiz}
                  className="w-full py-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-extrabold text-xs rounded-xl shadow transition-all flex items-center justify-center gap-2">
                  🚀 Start {Math.min(allBankQuestions.length, 50)}-Question Quiz
                </button>
              )}

              {/* Question list */}
              <div className="max-h-64 overflow-y-auto space-y-1.5">
                {allBankQuestions.length === 0 && !dbLoading && (
                  <p className="text-xs text-[#555577] italic text-center py-4">
                    {dbError ? 'Failed to load questions.' : 'No questions available. Click Refresh or Create Custom.'}
                  </p>
                )}
                {allBankQuestions.slice(0, 50).map((q, idx) => (
                  <div
                    key={q.id}
                    onClick={() => onLaunchQuiz(q)}
                    className="bg-[#1a1a32] border border-[#2a2a4a] rounded-xl p-2.5 cursor-pointer hover:border-[#c84b31]/60 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[9px] font-bold text-[#555577]">#{idx + 1}</span>
                      {q.topic && <span className="text-[8px] px-1 py-0.5 bg-indigo-900/40 text-indigo-300 rounded font-bold">{q.topic}</span>}
                      {q.difficulty && <span className="text-[8px] px-1 py-0.5 bg-amber-900/40 text-amber-300 rounded font-bold">{q.difficulty}</span>}
                    </div>
                    <p className="text-[11px] font-bold text-white leading-tight">
                      {q.question.slice(0, 70)}{q.question.length > 70 ? '…' : ''}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Create Custom Question View ── */}
          {coachView === 'create' && (
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-[#888899] uppercase mb-1">Question</label>
                <textarea rows={2} value={draftQuestion} onChange={(e) => setDraftQuestion(e.target.value)}
                  placeholder="e.g. What is the best move for white here?"
                  className="w-full bg-[#1a1a32] border border-[#2a2a4a] rounded-lg px-2.5 py-2 text-xs text-white placeholder-[#444466] focus:outline-none focus:border-[#c84b31] resize-none" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-[#888899] uppercase mb-1">
                  Options <span className="text-[#555577] normal-case">(click circle to mark correct)</span>
                </label>
                {draftOptions.map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <button type="button" onClick={() => setDraftCorrect(i)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-extrabold flex-shrink-0 transition-all ${draftCorrect === i ? 'bg-emerald-600 border-emerald-400 text-white' : 'bg-transparent border-[#3a3a5a] text-[#666688] hover:border-[#8888cc]'}`}>
                      {draftCorrect === i ? '✓' : OPTION_LABELS[i]}
                    </button>
                    <input id={`${uid}-opt-${i}`} type="text" value={opt}
                      onChange={(e) => { const next = [...draftOptions]; next[i] = e.target.value; setDraftOptions(next); }}
                      placeholder={`Option ${OPTION_LABELS[i]}`}
                      className="flex-1 bg-[#1a1a32] border border-[#2a2a4a] rounded-lg px-2.5 py-1.5 text-xs text-white placeholder-[#444466] focus:outline-none focus:border-[#c84b31]" />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#888899] uppercase mb-1">Countdown Timer</label>
                <div className="flex gap-2">
                  {([null, 15, 30, 60] as Array<number | null>).map((t) => (
                    <button key={String(t)} type="button" onClick={() => setDraftTimer(t)}
                      className={`flex-1 py-1.5 text-[10px] font-bold rounded-lg border transition-all ${draftTimer === t ? 'bg-[#c84b31] border-[#c84b31] text-white' : 'bg-[#1a1a32] border-[#2a2a4a] text-[#888899] hover:border-[#c84b31]/60'}`}>
                      {t === null ? 'None' : `${t}s`}
                    </button>
                  ))}
                </div>
              </div>
              <button type="button" onClick={handleLaunchAdHoc}
                disabled={!draftQuestion.trim() || draftOptions.some((o) => !o.trim())}
                className="w-full py-3 bg-gradient-to-r from-[#c84b31] to-rose-600 hover:from-[#d55339] hover:to-rose-500 text-white font-extrabold text-xs rounded-xl shadow transition-all disabled:opacity-40 flex items-center justify-center gap-2">
                🚀 Launch to Students
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
