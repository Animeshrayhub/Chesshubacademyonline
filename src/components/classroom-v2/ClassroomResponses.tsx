'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { type StudentResponseItem, type CoachQuestion } from '@/lib/classroom-v2/types';

const QUESTION_TYPES: CoachQuestion['type'][] = [
  'Best Move',
  'Find the Threat',
  'What is Wrong?',
  'Which Piece?',
  'Calculate',
  'Explain Your Move',
  'Custom Question',
];

const QUESTION_TEMPLATES: Record<CoachQuestion['type'], string> = {
  'Best Move': 'What is the best move in this position?',
  'Find the Threat': 'What is White threatening?',
  'What is Wrong?': 'What is wrong with this move?',
  'Which Piece?': 'Which piece should be moved?',
  'Calculate': 'Calculate the main line 3 moves ahead.',
  'Explain Your Move': 'Explain the idea behind your move.',
  'Custom Question': '',
};

interface ClassroomResponsesProps {
  responses: StudentResponseItem[];
  isCoach: boolean;
  currentUserId?: string;
  onSubmitResponse?: (prompt: string, response: string) => Promise<boolean>;
  onAskQuestion?: (question: CoachQuestion) => Promise<boolean>;
  activeQuestion?: CoachQuestion | null;
  className?: string;
}

export default function ClassroomResponses({
  responses = [],
  isCoach,
  currentUserId,
  onSubmitResponse,
  onAskQuestion,
  activeQuestion,
  className = '',
}: ClassroomResponsesProps) {
  const [promptInput, setPromptInput] = useState('');
  const [replyInput, setReplyInput] = useState('');
  const [isSending, setIsSending] = useState(false);

  // Student privacy: Students see ONLY their own submitted answers, NEVER other students' answers!
  const visibleResponses = useMemo(() => {
    if (isCoach) return responses;
    return responses.filter((r) => r.studentId === currentUserId);
  }, [isCoach, responses, currentUserId]);

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
        await onSubmitResponse(activeQuestion?.text || promptInput || 'Class Prompt', replyInput.trim());
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
          {isCoach ? `Live Responses (${responses.length})` : 'My Response'}
        </span>
        {activeQuestion && (
          <span className="text-[10px] text-amber-400 font-bold px-2 py-0.5 bg-amber-500/10 rounded-lg border border-amber-500/20 truncate max-w-[180px]">
            ❓ {activeQuestion.type}
          </span>
        )}
      </div>

      {/* Active Question Banner (visible to students) */}
      {!isCoach && activeQuestion && (
        <div className="shrink-0 bg-amber-950/60 border-b border-amber-800/40 p-3 space-y-1">
          <p className="text-[10px] font-extrabold text-amber-400 uppercase tracking-wider">
            QUESTION — {activeQuestion.type}
          </p>
          <p className="text-xs text-amber-100 font-bold leading-snug">{activeQuestion.text}</p>
        </div>
      )}

      {/* Response Stream */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 text-xs min-h-0">
        {visibleResponses.length === 0 ? (
          <div className="h-32 flex items-center justify-center text-slate-500 text-xs text-center p-4">
            {isCoach
              ? 'Student responses to your questions will appear here in real time.'
              : activeQuestion
              ? 'Enter your answer to the question above and click Submit Answer.'
              : 'Submit answers to coach prompts below.'}
          </div>
        ) : (
          visibleResponses.map((item: StudentResponseItem) => (
            <div key={item.id} className="p-2.5 bg-slate-800/60 border border-slate-750 rounded-xl space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-bold text-blue-400">{item.studentName}</span>
                <span className="text-slate-500 font-mono">{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span>
              </div>
              {item.prompt && (
                <p className="text-[11px] text-slate-400 italic">Q: {item.prompt}</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-white">{item.response}</p>
                <span className="text-[10px] text-emerald-400 font-bold px-1.5 py-0.5 bg-emerald-500/10 rounded">✓ Submitted</span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Coach: Smart Question Panel */}
      {isCoach && (
        <div className="shrink-0 p-2 bg-slate-950 border-t border-slate-800 space-y-2">
          <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Ask Students a Question</p>

          {/* Question Type Selector */}
          <select
            value={questionType}
            onChange={(e) => handleQuestionTypeChange(e.target.value as CoachQuestion['type'])}
            className="w-full bg-slate-900 border border-slate-700 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 font-bold focus:outline-none focus:border-amber-500 transition-colors"
          >
            {QUESTION_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>

          {/* Question Text (editable pre-fill) */}
          <textarea
            rows={2}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            placeholder="Type your question to students…"
            className="w-full bg-slate-900 border border-slate-700 focus:border-amber-500 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none transition-colors resize-none"
          />

          <button
            type="button"
            onClick={handleAskQuestion}
            disabled={!questionText.trim() || isAskingQuestion || !onAskQuestion}
            className="w-full py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all shadow flex items-center justify-center gap-1.5"
          >
            {isAskingQuestion ? 'Sending…' : '❓ Ask Students'}
          </button>
        </div>
      )}

      {/* Student: Response Input */}
      {!isCoach && (
        <form onSubmit={handleStudentSubmit} className="shrink-0 p-2.5 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={replyInput}
            onChange={(e) => setReplyInput(e.target.value)}
            placeholder={activeQuestion ? `Your answer: ${activeQuestion.text}` : 'Type your answer to Coach…'}
            className="flex-1 bg-slate-900 border border-slate-750 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!replyInput.trim() || isSending}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-extrabold text-xs rounded-xl transition-all shadow shrink-0 cursor-pointer"
          >
            {isSending ? 'Sending…' : 'Submit Answer'}
          </button>
        </form>
      )}
    </div>
  );
}
