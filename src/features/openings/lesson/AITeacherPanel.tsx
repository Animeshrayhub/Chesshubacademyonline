'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { AICoachAvatar, AIMessageBubble, VoiceButton } from './AICoachComponents';
import { classifyMoveQuality } from '@/lib/openings/eval-helpers';
import type {
  AiMessage,
  DbOpeningChapter,
  MoveResult,
  LessonState,
  OpeningDifficulty,
} from '@/types/opening-teacher';
import { CHAPTER_ICONS, CHAPTER_LABELS } from '@/types/opening-teacher';

interface AITeacherPanelProps {
  opening_id: string;
  chapter: DbOpeningChapter;
  lessonState: LessonState;
  studentLevel: OpeningDifficulty;
  language: 'en' | 'hi';
  onSendMessage: (message: string) => void;
  onHintRequest: () => void;
  onNextPosition: () => void;
  onPrevPosition: () => void;
  onDemonstrateMove: (move: string) => void;
}

export default function AITeacherPanel({
  opening_id,
  chapter,
  lessonState,
  studentLevel,
  language,
  onSendMessage,
  onHintRequest,
  onNextPosition,
  onPrevPosition,
  onDemonstrateMove,
}: AITeacherPanelProps) {
  const [inputText, setInputText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(true);
  const [speechRate, setSpeechRate] = useState<number>(0.85);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const lastCoachMessage = lessonState.aiMessages
    .filter(m => m.role === 'coach')
    .at(-1);

  const isHindi = language === 'hi';

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lessonState.aiMessages]);

  // Track AI thinking state
  useEffect(() => {
    setIsThinking(lessonState.isAiThinking);
  }, [lessonState.isAiThinking]);

  // When coach message arrives, speak it if autoSpeak is enabled
  useEffect(() => {
    if (autoSpeak && lastCoachMessage && 'speechSynthesis' in window) {
      const text = isHindi && lastCoachMessage.content_hindi
        ? lastCoachMessage.content_hindi
        : lastCoachMessage.content;

      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = isHindi ? 'hi-IN' : 'en-US';
      utterance.rate = speechRate;
      utterance.pitch = 1.05;
      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      const t = setTimeout(() => window.speechSynthesis.speak(utterance), 300);
      return () => clearTimeout(t);
    }
  }, [lastCoachMessage?.id, autoSpeak, speechRate]);

  const handleSend = useCallback(() => {
    const msg = inputText.trim();
    if (!msg) return;
    setInputText('');
    onSendMessage(msg);
    inputRef.current?.focus();
  }, [inputText, onSendMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Quick response chips (Socratic shortcuts)
  const quickResponses = [
    { label: '💡 Hint', action: onHintRequest },
    { label: '🔄 Show me', action: () => {
      const pos = lessonState.positions[lessonState.currentPositionIndex];
      const move = pos?.recommended_moves[0];
      if (move) onDemonstrateMove(move);
    }},
    { label: '❓ Why?', action: () => onSendMessage(isHindi ? 'यह क्यों?' : 'Why is this the best move?') },
    { label: '📖 Explain', action: () => onSendMessage(isHindi ? 'यह समझाएं' : 'Explain this position') },
  ];

  const chapterLabel = CHAPTER_LABELS[chapter.chapter_type] ?? `Chapter ${chapter.chapter_num}`;
  const chapterIcon = CHAPTER_ICONS[chapter.chapter_type] ?? '📖';

  const totalPositions = lessonState.positions.length;
  const currentIdx = lessonState.currentPositionIndex;
  const progress = totalPositions > 0 ? Math.round(((currentIdx + 1) / totalPositions) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-slate-900/60 rounded-2xl border border-slate-700/60 overflow-hidden">

      {/* ── Header: Coach + Chapter Info ──────────────────────────────────────── */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-950/80 to-slate-900/80 border-b border-slate-700/60">
        <AICoachAvatar isSpeaking={isSpeaking} isThinking={isThinking} size="sm" />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base">{chapterIcon}</span>
            <h3 className="text-sm font-semibold text-white truncate">
              {isHindi && chapter.title_hindi ? chapter.title_hindi : chapter.title}
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            ChessHub Coach · {studentLevel}
          </p>
        </div>

        {/* Audio controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setAutoSpeak(prev => !prev)}
            className={`text-xs px-2 py-0.5 rounded-full border transition-all ${
              autoSpeak
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
            title={autoSpeak ? 'Auto-speak enabled' : 'Auto-speak muted'}
          >
            {autoSpeak ? '🔊 Auto' : '🔇 Mute'}
          </button>

          <select
            value={speechRate}
            onChange={e => setSpeechRate(parseFloat(e.target.value))}
            className="bg-slate-800 border border-slate-700 rounded-full px-2 py-0.5 text-xs text-slate-300 focus:outline-none"
            title="Coach voice speed"
          >
            <option value={0.75}>0.75x</option>
            <option value={0.85}>0.85x</option>
            <option value={1.0}>1.0x</option>
            <option value={1.2}>1.2x</option>
          </select>
        </div>
      </div>

      {/* ── Chapter Progress Bar ────────────────────────────────────────────── */}
      <div className="px-4 py-2 bg-slate-900/40">
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span>Position {currentIdx + 1} of {totalPositions}</span>
          <span className="font-medium text-blue-300">{progress}%</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-600 to-indigo-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* ── Current Position Context ────────────────────────────────────────── */}
      {lessonState.positions[currentIdx] && (
        <div className="mx-3 my-2 px-3 py-2 bg-blue-950/40 rounded-lg border border-blue-800/30">
          <p className="text-xs font-medium text-blue-300 mb-0.5">
            {lessonState.positions[currentIdx].title}
          </p>
          {lessonState.positions[currentIdx].question && (
            <p className="text-xs text-slate-300 leading-relaxed">
              {isHindi && lessonState.positions[currentIdx].question_hindi
                ? lessonState.positions[currentIdx].question_hindi
                : lessonState.positions[currentIdx].question}
            </p>
          )}
        </div>
      )}

      {/* ── Conversation Messages ────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-3 min-h-0 scrollbar-thin scrollbar-track-transparent scrollbar-thumb-slate-700">
        {lessonState.aiMessages.length === 0 ? (
          <div className="text-center text-slate-500 text-sm py-8">
            <div className="text-3xl mb-2">♟️</div>
            <p>{isHindi ? 'पाठ शुरू होने की प्रतीक्षा है...' : 'Lesson starting...'}</p>
          </div>
        ) : (
          lessonState.aiMessages.map((msg) => (
            <AIMessageBubble key={msg.id} message={msg} language={language} />
          ))
        )}

        {/* AI thinking indicator */}
        {isThinking && (
          <div className="flex gap-2 items-end">
            <div className="w-7 h-7 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center text-xs flex-shrink-0">
              ♔
            </div>
            <div className="bg-slate-800 border border-slate-700/60 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-blue-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ── Last Move Result Flash ───────────────────────────────────────────── */}
      {lessonState.lastMoveResult && (() => {
        const res = lessonState.lastMoveResult;
        const pos = lessonState.positions[lessonState.currentPositionIndex];
        const isWhite = pos?.board_orientation !== 'black';
        const qualityInfo = classifyMoveQuality(res.evalAfter, res.evalBefore, isWhite);

        return (
          <div className={`mx-3 mb-2 px-3.5 py-2.5 rounded-xl text-xs font-medium border ${
            res.isCorrect
              ? 'bg-emerald-950/60 border-emerald-700/50 text-emerald-300'
              : 'bg-red-950/50 border-red-700/40 text-red-300'
          }`}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className={`px-2 py-0.5 rounded-full border text-[11px] font-bold ${qualityInfo.badgeColor}`}>
                  {qualityInfo.icon} {isHindi ? qualityInfo.label_hindi : qualityInfo.label}
                </span>
                {res.isInOpeningDb && (
                  <span className="bg-blue-950/60 text-blue-300 border border-blue-800/40 px-2 py-0.5 rounded-full text-[10px] font-mono">
                    📖 Book Theory
                  </span>
                )}
              </div>

              {qualityInfo.cpLoss > 0 && (
                <span className="text-slate-400 font-mono text-[11px]">
                  -{qualityInfo.cpLoss} cp
                </span>
              )}
            </div>

            <p className="leading-relaxed">
              {isHindi && res.explanation_hindi ? res.explanation_hindi : res.explanation}
            </p>

            {res.evalBefore && res.evalAfter && (
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-400 font-mono border-t border-slate-700/40 pt-1">
                <span>Before: {res.evalBefore}</span>
                <span>After: {res.evalAfter}</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Quick Response Chips ─────────────────────────────────────────────── */}
      <div className="flex gap-1.5 px-3 pb-2 flex-wrap">
        {quickResponses.map(({ label, action }) => (
          <button
            key={label}
            type="button"
            onClick={action}
            disabled={isThinking}
            className="text-xs px-2.5 py-1 rounded-full bg-slate-800 border border-slate-600 text-slate-300 hover:text-white hover:border-slate-500 hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Chapter Score Display ────────────────────────────────────────────── */}
      {lessonState.chapterScore > 0 && (
        <div className="mx-3 mb-2 flex items-center justify-between text-xs">
          <span className="text-slate-400">{isHindi ? 'अध्याय स्कोर' : 'Chapter Score'}</span>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  lessonState.chapterScore >= 80
                    ? 'bg-emerald-500'
                    : lessonState.chapterScore >= 50
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${lessonState.chapterScore}%` }}
              />
            </div>
            <span className="font-medium text-white">{lessonState.chapterScore}%</span>
          </div>
        </div>
      )}

      {/* ── Text Input + Voice ───────────────────────────────────────────────── */}
      <div className="px-3 pb-3">
        <div className="flex items-center gap-2 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2 focus-within:border-blue-500/60 transition-colors">
          <input
            ref={inputRef}
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isHindi ? 'अपना जवाब टाइप करें...' : 'Type your answer...'}
            disabled={isThinking}
            className="flex-1 bg-transparent text-sm text-white placeholder:text-slate-500 outline-none min-w-0"
            aria-label="Type your answer to the coach"
          />

          <VoiceButton
            onTranscript={(text) => {
              setInputText(text);
              setTimeout(() => onSendMessage(text), 100);
            }}
            onVoiceCommand={(cmd) => {
              if (cmd === 'hint') onHintRequest();
              if (cmd === 'explain') onSendMessage(isHindi ? 'यह समझाएं' : 'Explain this position');
              if (cmd === 'why') onSendMessage(isHindi ? 'यह क्यों?' : 'Why is this move good?');
              if (cmd === 'next') onNextPosition();
              if (cmd === 'show') {
                const pos = lessonState.positions[lessonState.currentPositionIndex];
                const move = pos?.recommended_moves[0];
                if (move) onDemonstrateMove(move);
              }
            }}
            coachMessage={lastCoachMessage
              ? (isHindi && lastCoachMessage.content_hindi
                  ? lastCoachMessage.content_hindi
                  : lastCoachMessage.content)
              : undefined}
            language={language}
            speechRate={speechRate}
            disabled={isThinking}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={!inputText.trim() || isThinking}
            aria-label="Send message"
            className="w-8 h-8 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-all flex-shrink-0"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Navigation: Prev/Next Position ──────────────────────────────────── */}
      <div className="flex items-center justify-between px-3 pb-3 pt-0">
        <button
          type="button"
          onClick={onPrevPosition}
          disabled={currentIdx === 0}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M15.41 16.09l-4.58-4.59 4.58-4.59L14 5.5l-6 6 6 6z" />
          </svg>
          {isHindi ? 'पिछला' : 'Previous'}
        </button>

        <div className="flex gap-1">
          {lessonState.positions.map((_, i) => (
            <div
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentIdx
                  ? 'bg-blue-400 scale-125'
                  : i < currentIdx
                  ? 'bg-emerald-600'
                  : 'bg-slate-600'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={onNextPosition}
          disabled={currentIdx >= totalPositions - 1}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          {isHindi ? 'अगला' : 'Next'}
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
            <path d="M8.59 16.34l4.58-4.59-4.58-4.59L10 5.75l6 6-6 6z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
