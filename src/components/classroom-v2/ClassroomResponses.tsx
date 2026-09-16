'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { type StudentResponseItem, type CoachQuestion } from '@/lib/classroom-v2/types';

const QUESTION_TYPES: CoachQuestion['type'][] = [
  'Best Move',
  'Find the Threat',
  'Tactical Blunder',
  'Candidate Moves',
  'Pawn Structure & Plan',
  'Piece Evaluation',
  'King Safety',
  'Calculate 3 Moves',
  'Endgame Technique',
  'Open Discussion',
  'Custom Question',
];

const QUESTION_TEMPLATES: Record<CoachQuestion['type'], string> = {
  'Best Move': 'What is the best move for White/Black in this position?',
  'Find the Threat': 'What is the opponent threatening on the next move?',
  'Tactical Blunder': 'Spot the blunder in the last position or move played.',
  'Candidate Moves': 'List 2 to 3 candidate moves you would consider here.',
  'Pawn Structure & Plan': 'What is the ideal pawn break or strategic plan here?',
  'Piece Evaluation': 'Which piece is the least active, and how can we improve it?',
  'King Safety': 'Evaluate king safety and potential attacking weaknesses.',
  'Calculate 3 Moves': 'Calculate the critical line 3 moves ahead (checks & captures first).',
  'Endgame Technique': 'Is this endgame winning, drawing, or losing? What is the technique?',
  'Open Discussion': 'Explain your general thoughts and evaluation of this position in 1-2 sentences.',
  'What is Wrong?': 'What is wrong with the last move played?',
  'Which Piece?': 'Which piece should be activated next?',
  'Calculate': 'Calculate the main line 3 moves ahead.',
  'Explain Your Move': 'Explain the strategic idea behind your move.',
  'Custom Question': '',
};

interface ClassroomResponsesProps {
  responses: StudentResponseItem[];
  isCoach: boolean;
  currentUserId?: string;
  onSubmitResponse?: (prompt: string, response: string) => Promise<boolean>;
  onAskQuestion?: (question: CoachQuestion) => Promise<boolean>;
  activeQuestion?: CoachQuestion | null;
  areResponsesRevealed?: boolean;
  onToggleRevealResponses?: (reveal: boolean) => Promise<boolean>;
  onEvaluateResponse?: (responseId: string, status: 'correct' | 'incorrect' | 'pending') => Promise<boolean>;
  className?: string;
}

export default function ClassroomResponses({
  responses = [],
  isCoach,
  currentUserId,
  onSubmitResponse,
  onAskQuestion,
  activeQuestion,
  areResponsesRevealed = false,
  onToggleRevealResponses,
  onEvaluateResponse,
  className = '',
}: ClassroomResponsesProps) {
  const [promptInput, setPromptInput] = useState('');
  const [replyInput, setReplyInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [studentMode, setStudentMode] = useState<'answer' | 'ask_coach'>('answer');

  // Student privacy: In blind mode, students see ONLY their own submitted answers.
  // When coach clicks "Reveal All to Class", all students see submissions to review & compare!
  const visibleResponses = useMemo(() => {
    if (isCoach || areResponsesRevealed) return responses;
    return responses.filter((r) => r.studentId === currentUserId);
  }, [isCoach, areResponsesRevealed, responses, currentUserId]);

  // Coach question state
  const [questionType, setQuestionType] = useState<CoachQuestion['type']>('Best Move');
  const [questionText, setQuestionText] = useState(QUESTION_TEMPLATES['Best Move']);
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);

  const handleQuestionTypeChange = useCallback((type: CoachQuestion['type']) => {
    setQuestionType(type);
    setQuestionText(QUESTION_TEMPLATES[type]);
  }, []);

  const handleAskQuestion = async () => {
    if (!questionText.trim() || isAskingQuestion || !onAskQuestion) return;
    setIsAskingQuestion(true);
    try {
      const q: CoachQuestion = {
        id: `q_${Date.now()}`,
        type: questionType,
        text: questionText.trim(),
        sentAt: new Date().toISOString(),
      };
      await onAskQuestion(q);
    } finally {
      setIsAskingQuestion(false);
    }
  };

  const handleStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim() || isSending) return;

    setIsSending(true);
    try {
      if (onSubmitResponse) {
        const promptLabel = studentMode === 'ask_coach'
          ? '🙋 Question to Coach'
          : activeQuestion?.text || promptInput || 'Class Prompt';
        await onSubmitResponse(promptLabel, replyInput.trim());
        setReplyInput('');
      }
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="h-9 bg-slate-950/80 px-3 border-b border-slate-800 flex items-center justify-between shrink-0">
        <span className="font-extrabold text-xs text-slate-300 tracking-wide uppercase">
          {isCoach ? `Live Responses & Questions (${responses.length})` : 'My Q&A / Responses'}
        </span>
        {activeQuestion && (
          <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 bg-amber-500/10 rounded-lg border border-amber-500/20 truncate max-w-[180px]">
            ❓ {activeQuestion.type}
          </span>
        )}
      </div>

      {/* Coach: Blind Mode vs Reveal All to Class Header Controls */}
      {isCoach && (
        <div className="px-3 py-2 bg-slate-950/90 border-b border-slate-800 flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={`w-2 h-2 rounded-full ${areResponsesRevealed ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-[10px] font-bold text-slate-300">
              {areResponsesRevealed ? 'Public Feed (Revealed to Class)' : '🔒 Blind Mode (Students only see own answers)'}
            </span>
          </div>
          <button
            type="button"
            onClick={() => onToggleRevealResponses?.(!areResponsesRevealed)}
            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
              areResponsesRevealed
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white'
            }`}
          >
            {areResponsesRevealed ? '🔒 Hide from Class' : '👁️ Reveal All to Class'}
          </button>
        </div>
      )}

      {/* Student: Public Feed Banner when Coach Reveals Answers */}
      {!isCoach && areResponsesRevealed && (
        <div className="shrink-0 bg-blue-950/60 border-b border-blue-800/50 px-3 py-1.5 flex items-center justify-between text-[11px] text-blue-200">
          <span className="font-bold flex items-center gap-1">
            👁️ Coach revealed class answers for group review
          </span>
          <span className="text-[10px] text-blue-400 font-mono">({visibleResponses.length} total)</span>
        </div>
      )}

      {/* Active Question Banner (visible to students) */}
      {!isCoach && activeQuestion && (
        <div className="shrink-0 bg-amber-950/60 border-b border-amber-800/40 p-3 space-y-1">
          <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
            COACH QUESTION — {activeQuestion.type}
          </p>
          <p className="text-xs text-amber-100 font-bold leading-snug">{activeQuestion.text}</p>
        </div>
      )}

      {/* Response Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs min-h-0">
        {visibleResponses.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-500 text-xs text-center p-4">
            {isCoach
              ? 'Student responses and questions will appear here in real time.'
              : activeQuestion
              ? 'Enter your answer to the coach question above and click Submit.'
              : 'Submit answers to coach prompts or ask Coach a question below.'}
          </div>
        ) : (
          visibleResponses.map((item: StudentResponseItem) => {
            const isStudentQuestion = item.prompt?.includes('Question to Coach');
            return (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl space-y-1.5 border transition-all ${
                  isStudentQuestion
                    ? 'bg-blue-950/40 border-blue-800/60'
                    : item.status === 'correct'
                    ? 'bg-emerald-950/30 border-emerald-500/50 shadow-xs'
                    : item.status === 'incorrect'
                    ? 'bg-rose-950/30 border-rose-500/40 shadow-xs'
                    : 'bg-slate-800/60 border-slate-750'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span className={`font-bold ${isStudentQuestion ? 'text-cyan-400' : 'text-blue-400'}`}>
                    {item.studentName} {item.studentId === currentUserId && '(You)'}
                  </span>
                  <span className="text-slate-500 font-mono">
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                {item.prompt && (
                  <p className="text-[11px] text-slate-400 italic">
                    {isStudentQuestion ? '🙋 ' : 'Q: '}{item.prompt}
                  </p>
                )}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-white">{item.response}</p>
                  <div>
                    {item.status === 'correct' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 shadow-xs">
                        ✅ Correct
                      </span>
                    ) : item.status === 'incorrect' ? (
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1 shadow-xs">
                        ❌ Needs Work
                      </span>
                    ) : (
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        isStudentQuestion
                          ? 'bg-cyan-500/10 text-cyan-300'
                          : 'bg-slate-700/60 text-slate-300 border border-slate-700'
                      }`}>
                        {isStudentQuestion ? '❓ Question' : '⏳ Submitted'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Coach 1-Click Evaluation Buttons */}
                {isCoach && !isStudentQuestion && (
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-slate-800/80">
                    <span className="text-[10px] text-slate-400 font-bold mr-auto">Coach Mark:</span>
                    <button
                      type="button"
                      onClick={() => onEvaluateResponse?.(item.id, item.status === 'correct' ? 'pending' : 'correct')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        item.status === 'correct'
                          ? 'bg-emerald-600 text-white font-black shadow-xs'
                          : 'bg-emerald-950/60 hover:bg-emerald-900 text-emerald-300 border border-emerald-800/50'
                      }`}
                      title="Mark response as Correct"
                    >
                      ✅ Correct
                    </button>
                    <button
                      type="button"
                      onClick={() => onEvaluateResponse?.(item.id, item.status === 'incorrect' ? 'pending' : 'incorrect')}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        item.status === 'incorrect'
                          ? 'bg-rose-600 text-white font-black shadow-xs'
                          : 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50'
                      }`}
                      title="Mark response as Needs Work"
                    >
                      ❌ Needs Work
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Coach: Smart Question Panel with 10 Production Presets */}
      {isCoach && (
        <div className="shrink-0 p-2.5 bg-slate-950 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              Ask Students a Question (10 Presets)
            </p>
            <span className="text-[9px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded">
              {QUESTION_TYPES.length} Templates
            </span>
          </div>

          {/* Question Type Selector */}
          <select
            value={questionType}
            onChange={(e) => handleQuestionTypeChange(e.target.value as CoachQuestion['type'])}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-amber-500 transition-colors"
          >
            {QUESTION_TYPES.map((t, idx) => (
              <option key={t} value={t}>
                {idx + 1}. {t}
              </option>
            ))}
          </select>

          {/* Question Text (editable pre-fill) */}
          <textarea
            rows={2}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Type or customize your question to students…"
            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors resize-none"
          />

          <button
            type="button"
            onClick={handleAskQuestion}
            disabled={!questionText.trim() || isAskingQuestion || !onAskQuestion}
            className="w-full py-2 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {isAskingQuestion ? 'Broadcasting Question…' : '❓ Ask Students (Broadcast)'}
          </button>
        </div>
      )}

      {/* Student: Response / Ask Coach Mode */}
      {!isCoach && (
        <div className="shrink-0 p-2.5 bg-slate-950 border-t border-slate-800 space-y-2">
          {/* Mode Switcher for Student */}
          <div className="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => setStudentMode('answer')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                studentMode === 'answer'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {activeQuestion ? '✏️ Answer Coach' : '✏️ Submit Answer'}
            </button>
            <button
              type="button"
              onClick={() => setStudentMode('ask_coach')}
              className={`flex-1 py-1 rounded-lg text-[10px] font-bold transition-all ${
                studentMode === 'ask_coach'
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              🙋 Ask Coach a Question
            </button>
          </div>

          <form onSubmit={handleStudentSubmit} className="flex items-center gap-2">
            <input
              type="text"
              value={replyInput}
              onChange={(e) => setReplyInput(e.target.value)}
              placeholder={
                studentMode === 'ask_coach'
                  ? 'Type your question to Coach…'
                  : activeQuestion
                  ? `Your answer: ${activeQuestion.text}`
                  : 'Type your answer to Coach…'
              }
              className="flex-1 bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!replyInput.trim() || isSending}
              className={`px-4 py-2 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all shadow shrink-0 cursor-pointer ${
                studentMode === 'ask_coach'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-amber-600 hover:bg-amber-500'
              }`}
            >
              {isSending ? 'Sending…' : studentMode === 'ask_coach' ? 'Send Question' : 'Submit Answer'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
