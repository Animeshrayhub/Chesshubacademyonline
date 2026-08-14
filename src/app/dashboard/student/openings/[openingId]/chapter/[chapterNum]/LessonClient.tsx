'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type {
  DbOpeningChapter,
  DbOpeningPosition,
  DbStudentChapterProgress,
  LessonState,
  MoveResult,
  AiMessage,
  OpeningDifficulty,
  TeachingResponse,
} from '@/types/opening-teacher';

// Lazy load the heavy components
const OpeningLessonBoard = dynamic(() => import('@/features/openings/lesson/OpeningLessonBoard'), {
  ssr: false,
  loading: () => (
    <div className="aspect-square bg-slate-800/60 rounded-2xl flex items-center justify-center animate-pulse border border-slate-700/60">
      <span className="text-slate-400 text-4xl">♟</span>
    </div>
  ),
});

const AITeacherPanel = dynamic(() => import('@/features/openings/lesson/AITeacherPanel'), {
  ssr: false,
});

interface LessonClientProps {
  openingId: string;
  openingName: string;
  openingNameHindi?: string | null;
  chapter: DbOpeningChapter;
  positions: DbOpeningPosition[];
  initialProgress: DbStudentChapterProgress | null;
  studentLevel: OpeningDifficulty;
}

export default function LessonClient({
  openingId,
  openingName,
  openingNameHindi,
  chapter,
  positions,
  initialProgress,
  studentLevel,
}: LessonClientProps) {
  const router = useRouter();
  const boardRef = useRef<any>(null);
  const sessionStartRef = useRef(Date.now());

  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [lessonState, setLessonState] = useState<LessonState>({
    currentPositionIndex: 0,
    positions,
    currentFen: positions[0]?.fen ?? 'start',
    moveHistory: [],
    isPlayerTurn: true,
    lastMoveResult: null,
    hintsUsed: 0,
    hintIndex: 0,
    aiMessages: [],
    isAiThinking: false,
    chapterScore: initialProgress?.score ?? 0,
    isComplete: initialProgress?.status === 'completed',
  });

  const [isSaving, setIsSaving] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const positionsAttempted = useRef(0);
  const positionsCorrect = useRef(0);

  // ── Initialize lesson with first coach message ─────────────────────────────
  useEffect(() => {
    if (positions.length === 0) return;

    const firstPos = positions[0];
    const introMsg: AiMessage = {
      id: `intro-${Date.now()}`,
      role: 'coach',
      content: chapter.content_json?.intro ||
        `Welcome! Let's study ${chapter.title}. Look at the position on the board and tell me — what do you notice?`,
      content_hindi: chapter.content_json?.intro_hindi ||
        `स्वागत है! आइए ${chapter.title_hindi ?? chapter.title} सीखते हैं।`,
      timestamp: new Date().toISOString(),
      is_question: true,
      fen: firstPos.fen,
    };

    const positionMsg: AiMessage | null = firstPos.question ? {
      id: `pos-q-${Date.now()}`,
      role: 'coach',
      content: firstPos.question,
      content_hindi: firstPos.question_hindi ?? undefined,
      timestamp: new Date(Date.now() + 500).toISOString(),
      is_question: true,
      position_id: firstPos.id,
      fen: firstPos.fen,
    } : null;

    setLessonState(prev => ({
      ...prev,
      aiMessages: positionMsg ? [introMsg, positionMsg] : [introMsg],
    }));
  }, []);

  // ── Handle move result from board ──────────────────────────────────────────
  const handleMoveResult = useCallback(
    async (result: MoveResult, newFen: string) => {
      positionsAttempted.current++;
      if (result.isCorrect) positionsCorrect.current++;

      // Record mistake if wrong
      if (!result.isCorrect && result.isLegal) {
        const currentPos = positions[lessonState.currentPositionIndex];
        if (currentPos) {
          void fetch('/api/opening/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'mistake',
              opening_id: openingId,
              chapter_id: chapter.id,
              position_id: currentPos.id,
              position_fen: currentPos.fen,
              student_move: result.move,
              expected_move: currentPos.recommended_moves[0] ?? '',
              mistake_type: result.mistakeType ?? 'wrong_move',
            }),
          }).catch(console.error);
        }
      }

      // Update lesson state
      setLessonState(prev => ({
        ...prev,
        lastMoveResult: result,
        currentFen: newFen,
        moveHistory: [...prev.moveHistory, result.move],
      }));

      // Get AI response to the move
      await getAiResponse({ move_result: result, new_fen: newFen });

      // Auto-advance after correct move (with delay)
      if (result.isCorrect) {
        setTimeout(() => {
          setLessonState(prev => {
            const nextIdx = prev.currentPositionIndex + 1;
            if (nextIdx >= prev.positions.length) {
              // All positions done — chapter complete
              return { ...prev, isComplete: true };
            }
            const nextPos = prev.positions[nextIdx];
            return {
              ...prev,
              currentPositionIndex: nextIdx,
              currentFen: nextPos?.fen ?? prev.currentFen,
              lastMoveResult: null,
            };
          });
        }, 1500);
      }
    },
    [lessonState.currentPositionIndex, positions, openingId, chapter.id]
  );

  // ── Get AI response ────────────────────────────────────────────────────────
  const getAiResponse = useCallback(
    async ({
      student_message,
      move_result,
      new_fen,
    }: {
      student_message?: string;
      move_result?: MoveResult;
      new_fen?: string;
    }) => {
      setLessonState(prev => ({ ...prev, isAiThinking: true }));

      try {
        const context = {
          student_id: 'current',
          student_level: studentLevel,
          opening_id: openingId,
          opening_name: openingName,
          chapter_num: chapter.chapter_num,
          chapter_type: chapter.chapter_type,
          current_fen: new_fen ?? lessonState.currentFen,
          language,
          mistakes_count: positionsAttempted.current - positionsCorrect.current,
          recent_mistakes: [],
          chapter_score: lessonState.chapterScore,
        };

        const res = await fetch('/api/opening/teach', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            student_message,
            move_result,
            current_fen: new_fen ?? lessonState.currentFen,
            context,
            language,
          }),
        });

        if (!res.ok) throw new Error('AI request failed');
        const data: TeachingResponse = await res.json();

        const aiMsg: AiMessage = {
          id: `ai-${Date.now()}`,
          role: 'coach',
          content: data.message,
          content_hindi: data.message_hindi,
          timestamp: new Date().toISOString(),
          is_question: data.is_question,
          fen: new_fen ?? lessonState.currentFen,
        };

        // Add question from next position if advancing
        if (data.advance_position) {
          setLessonState(prev => {
            const nextIdx = prev.currentPositionIndex + 1;
            const nextPos = nextIdx < prev.positions.length ? prev.positions[nextIdx] : null;
            const newMessages = [...prev.aiMessages, aiMsg];

            if (nextPos?.question) {
              newMessages.push({
                id: `pos-q-${Date.now()}`,
                role: 'coach',
                content: nextPos.question,
                content_hindi: nextPos.question_hindi ?? undefined,
                timestamp: new Date(Date.now() + 200).toISOString(),
                is_question: true,
                position_id: nextPos.id,
                fen: nextPos.fen,
              });
            }

            return { ...prev, aiMessages: newMessages, isAiThinking: false };
          });
        } else {
          setLessonState(prev => ({
            ...prev,
            aiMessages: [...prev.aiMessages, aiMsg],
            isAiThinking: false,
          }));
        }
      } catch (err) {
        console.error('[AI Teach]', err);
        setLessonState(prev => ({ ...prev, isAiThinking: false }));
      }
    },
    [lessonState.currentFen, lessonState.chapterScore, studentLevel, openingId, openingName, chapter, language]
  );

  // ── Handle student text message ────────────────────────────────────────────
  const handleSendMessage = useCallback(
    async (text: string) => {
      const studentMsg: AiMessage = {
        id: `student-${Date.now()}`,
        role: 'student',
        content: text,
        timestamp: new Date().toISOString(),
      };

      setLessonState(prev => ({
        ...prev,
        aiMessages: [...prev.aiMessages, studentMsg],
      }));

      await getAiResponse({ student_message: text });
    },
    [getAiResponse]
  );

  // ── Handle hint request ────────────────────────────────────────────────────
  const handleHintRequest = useCallback(() => {
    const pos = positions[lessonState.currentPositionIndex];
    if (!pos) return;

    const hintIdx = Math.min(lessonState.hintIndex, pos.hints.length - 1);
    const hint = pos.hints[hintIdx] ?? pos.recommended_moves[0] ? `Try ${pos.recommended_moves[0]}` : 'Think about piece activity!';
    const hint_hindi = pos.hints_hindi[hintIdx] ?? hint;

    // Show hint arrow on board
    boardRef.current?.showHint();

    const hintMsg: AiMessage = {
      id: `hint-${Date.now()}`,
      role: 'coach',
      content: `💡 Hint ${hintIdx + 1}: ${hint}`,
      content_hindi: `💡 संकेत ${hintIdx + 1}: ${hint_hindi}`,
      timestamp: new Date().toISOString(),
      is_question: false,
    };

    setLessonState(prev => ({
      ...prev,
      aiMessages: [...prev.aiMessages, hintMsg],
      hintIndex: prev.hintIndex + 1,
      hintsUsed: prev.hintsUsed + 1,
    }));
  }, [positions, lessonState.currentPositionIndex, lessonState.hintIndex]);

  // ── Navigate positions ─────────────────────────────────────────────────────
  const handleNextPosition = useCallback(() => {
    setLessonState(prev => {
      if (prev.currentPositionIndex >= prev.positions.length - 1) return prev;
      const nextIdx = prev.currentPositionIndex + 1;
      const nextPos = prev.positions[nextIdx];
      return {
        ...prev,
        currentPositionIndex: nextIdx,
        currentFen: nextPos?.fen ?? prev.currentFen,
        lastMoveResult: null,
        hintIndex: 0,
      };
    });
  }, []);

  const handlePrevPosition = useCallback(() => {
    setLessonState(prev => {
      if (prev.currentPositionIndex <= 0) return prev;
      const prevIdx = prev.currentPositionIndex - 1;
      const prevPos = prev.positions[prevIdx];
      return {
        ...prev,
        currentPositionIndex: prevIdx,
        currentFen: prevPos?.fen ?? prev.currentFen,
        lastMoveResult: null,
        hintIndex: 0,
      };
    });
  }, []);

  // ── Complete Chapter ───────────────────────────────────────────────────────
  const completeChapter = useCallback(async () => {
    const timeSpent = Math.round((Date.now() - sessionStartRef.current) / 1000);
    const total = positionsAttempted.current;
    const correct = positionsCorrect.current;
    const score = total > 0 ? Math.round((correct / total) * 100) : 80;

    setIsSaving(true);
    try {
      await fetch('/api/opening/progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chapter_progress',
          chapter_id: chapter.id,
          opening_id: openingId,
          status: 'completed',
          score,
          positions_attempted: total,
          positions_correct: correct,
          hints_used: lessonState.hintsUsed,
          time_spent_seconds: timeSpent,
        }),
      });

      // Try to auto-issue opening mastery certificate if chapter 8 with 100% score
      if (chapter.chapter_num === 8 && score >= 100) {
        void fetch('/api/opening/issue-certificate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ opening_id: openingId }),
        }).catch(() => {});
      }

      setLessonState(prev => ({ ...prev, chapterScore: score, isComplete: true }));
      setShowCompleteModal(true);
    } catch (err) {
      console.error('[Complete chapter]', err);
    } finally {
      setIsSaving(false);
    }
  }, [chapter.id, chapter.chapter_num, openingId, lessonState.hintsUsed]);

  // Auto-complete when all positions done
  useEffect(() => {
    if (lessonState.isComplete && !showCompleteModal && !isSaving) {
      completeChapter();
    }
  }, [lessonState.isComplete]);

  const isHindi = language === 'hi';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/10 to-slate-950 flex flex-col">

      {/* ── Top Navigation Bar ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 bg-slate-900/80 border-b border-slate-700/60 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <Link
            href={`/dashboard/student/openings/${openingId}`}
            className="text-slate-400 hover:text-white transition-colors"
            aria-label="Back to opening"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" />
            </svg>
          </Link>

          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs text-slate-400 truncate max-w-[200px]">
                {isHindi && openingNameHindi ? openingNameHindi : openingName}
              </p>
              <span className="text-slate-600">·</span>
              <p className="text-xs text-blue-300 font-medium">
                Chapter {chapter.chapter_num}/8
              </p>
            </div>
            <h1 className="text-sm font-semibold text-white truncate max-w-xs">
              {isHindi && chapter.title_hindi ? chapter.title_hindi : chapter.title}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <button
            type="button"
            onClick={() => setLanguage(prev => prev === 'en' ? 'hi' : 'en')}
            className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-600 rounded-lg text-slate-300 hover:text-white hover:border-slate-500 transition-all"
            aria-label="Toggle language"
          >
            {isHindi ? 'Switch to EN' : 'हिंदी में'}
          </button>

          {/* Chapter score */}
          {lessonState.chapterScore > 0 && (
            <div className="flex items-center gap-1.5 text-xs bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1.5">
              <span className="text-slate-400">Score:</span>
              <span className="font-bold text-white">{lessonState.chapterScore}%</span>
            </div>
          )}

          {/* Complete button (appears after all positions) */}
          {!lessonState.isComplete && lessonState.currentPositionIndex === positions.length - 1 && positions.length > 0 && (
            <button
              type="button"
              onClick={completeChapter}
              disabled={isSaving}
              className="text-xs px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition-colors disabled:opacity-60"
            >
              {isSaving ? 'Saving...' : 'Complete Chapter ✓'}
            </button>
          )}
        </div>
      </div>

      {/* ── Main Content ────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col lg:flex-row gap-0 overflow-hidden">

        {/* Chess Board Side */}
        <div className="lg:w-[55%] xl:w-[60%] p-4 lg:p-6 flex items-start justify-center">
          <div className="w-full max-w-xl">
            {/* Move history */}
            {lessonState.moveHistory.length > 0 && (
              <div className="mb-3 px-3 py-2 bg-slate-800/60 border border-slate-700/60 rounded-xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-slate-400 font-medium">Moves:</span>
                  {lessonState.moveHistory.map((m, i) => (
                    <span key={i} className="text-xs font-mono text-blue-300 bg-blue-950/40 border border-blue-800/30 px-1.5 py-0.5 rounded">
                      {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ''}{m}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <OpeningLessonBoard
              ref={boardRef}
              openingId={openingId}
              chapterNum={chapter.chapter_num}
              positions={positions}
              currentPositionIndex={lessonState.currentPositionIndex}
              onMoveResult={handleMoveResult}
              language={language}
            />

            {/* Position explanation */}
            {positions[lessonState.currentPositionIndex]?.explanation && (
              <div className="mt-3 px-4 py-3 bg-blue-950/40 border border-blue-800/30 rounded-xl">
                <p className="text-sm text-slate-300 leading-relaxed">
                  {isHindi && positions[lessonState.currentPositionIndex].explanation_hindi
                    ? positions[lessonState.currentPositionIndex].explanation_hindi
                    : positions[lessonState.currentPositionIndex].explanation}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* AI Teacher Panel Side */}
        <div className="lg:w-[45%] xl:w-[40%] p-4 lg:p-6 lg:pl-0 flex flex-col">
          <div className="flex-1 min-h-0">
            <AITeacherPanel
              opening_id={openingId}
              chapter={chapter}
              lessonState={lessonState}
              studentLevel={studentLevel}
              language={language}
              onSendMessage={handleSendMessage}
              onHintRequest={handleHintRequest}
              onNextPosition={handleNextPosition}
              onPrevPosition={handlePrevPosition}
              onDemonstrateMove={(move) => boardRef.current?.demonstrateMove(move)}
            />
          </div>
        </div>
      </div>

      {/* ── Chapter Complete Modal ──────────────────────────────────────────────── */}
      {showCompleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
          <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <div className="text-center">
              <div className="text-6xl mb-4">
                {lessonState.chapterScore >= 90 ? '🏆' : lessonState.chapterScore >= 70 ? '🎯' : '📚'}
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                Chapter {chapter.chapter_num} Complete!
              </h2>
              <p className="text-slate-400 mb-6">
                {lessonState.chapterScore >= 90
                  ? 'Outstanding! Next chapter unlocked.'
                  : lessonState.chapterScore >= 70
                  ? "Great work! You've made good progress."
                  : "Good effort! Review the mistakes and try again."}
              </p>

              <div className="flex items-center justify-center gap-4 mb-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{lessonState.chapterScore}%</div>
                  <div className="text-xs text-slate-400">Score</div>
                </div>
                <div className="w-px h-12 bg-slate-700" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{positionsCorrect.current}/{positionsAttempted.current}</div>
                  <div className="text-xs text-slate-400">Correct Moves</div>
                </div>
                <div className="w-px h-12 bg-slate-700" />
                <div className="text-center">
                  <div className="text-3xl font-bold text-white">{lessonState.hintsUsed}</div>
                  <div className="text-xs text-slate-400">Hints Used</div>
                </div>
              </div>

              <div className="flex gap-3">
                {chapter.chapter_num < 8 && lessonState.chapterScore >= 90 ? (
                  <Link
                    href={`/dashboard/student/openings/${openingId}/chapter/${chapter.chapter_num + 1}`}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors text-center"
                  >
                    Next Chapter →
                  </Link>
                ) : (
                  <Link
                    href={`/dashboard/student/openings/${openingId}`}
                    className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors text-center"
                  >
                    Back to Opening
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowCompleteModal(false);
                    setLessonState(prev => ({
                      ...prev,
                      currentPositionIndex: 0,
                      isComplete: false,
                      moveHistory: [],
                      lastMoveResult: null,
                      hintIndex: 0,
                      hintsUsed: 0,
                    }));
                    positionsAttempted.current = 0;
                    positionsCorrect.current = 0;
                    sessionStartRef.current = Date.now();
                  }}
                  className="px-4 py-3 bg-slate-700 hover:bg-slate-600 text-white font-medium rounded-xl transition-colors text-sm"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
