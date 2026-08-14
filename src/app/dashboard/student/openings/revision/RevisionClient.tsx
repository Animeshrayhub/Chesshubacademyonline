'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import type { DbStudentOpeningMistake, MoveResult } from '@/types/opening-teacher';

const OpeningLessonBoard = dynamic(() => import('@/features/openings/lesson/OpeningLessonBoard'), {
  ssr: false,
});

interface RevisionClientProps {
  initialMistakes: DbStudentOpeningMistake[];
}

export default function RevisionClient({ initialMistakes }: RevisionClientProps) {
  const [mistakes, setMistakes] = useState<DbStudentOpeningMistake[]>(initialMistakes);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [language, setLanguage] = useState<'en' | 'hi'>('en');
  const [lastResult, setLastResult] = useState<MoveResult | null>(null);
  const [isResolvedNow, setIsResolvedNow] = useState(false);
  const [isFinished, setIsFinished] = useState(initialMistakes.length === 0);

  const isHindi = language === 'hi';
  const currentMistake = mistakes[currentIndex];

  // Convert DbStudentOpeningMistake into DbOpeningPosition for board
  const dummyPositions = mistakes.map((m, idx) => ({
    id: m.position_id ?? `mistake-${m.id}`,
    chapter_id: m.chapter_id ?? '',
    opening_id: m.opening_id,
    title: `Revision Position #${idx + 1}`,
    fen: m.position_fen,
    board_orientation: 'white' as const,
    explanation: `In a past lesson, you played ${m.student_move}. The theory move is ${m.expected_move}.`,
    explanation_hindi: `पिछले पाठ में आपने ${m.student_move} खेला था। सही चाल ${m.expected_move} है।`,
    recommended_moves: [m.expected_move],
    alternative_moves: [],
    wrong_moves: [m.student_move],
    question: `Can you find the correct move now?`,
    question_hindi: `क्या आप अब सही चाल पा सकते हैं?`,
    hints: [`The theory move starts with ${m.expected_move.charAt(0)}`],
    hints_hindi: [`सही चाल ${m.expected_move.charAt(0)} से शुरू होती है`],
    tactical_theme: m.mistake_type,
    common_mistake_move: m.student_move,
    common_mistake_explanation: `You previously blundered with ${m.student_move}`,
    stockfish_eval: m.eval_before ?? null,
    order_num: idx + 1,
    difficulty: 'Beginner' as const,
    is_interactive: true,
    is_archived: false,
    created_at: m.created_at,
    updated_at: m.updated_at,
  }));

  const handleMoveResult = async (result: MoveResult, newFen: string) => {
    setLastResult(result);

    if (!currentMistake) return;

    // Send attempt to API
    try {
      const res = await fetch('/api/opening/revision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mistake_id: currentMistake.id,
          is_success: result.isCorrect,
        }),
      });

      const data = await res.json();
      if (data.isResolved) {
        setIsResolvedNow(true);
      }

      if (result.isCorrect) {
        setTimeout(() => {
          if (currentIndex < mistakes.length - 1) {
            setCurrentIndex(prev => prev + 1);
            setLastResult(null);
            setIsResolvedNow(false);
          } else {
            setIsFinished(true);
          }
        }, 1800);
      }
    } catch (err) {
      console.error('[Revision API]', err);
    }
  };

  if (isFinished || mistakes.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">🏆</div>
          <h2 className="text-2xl font-bold text-white mb-2">
            {isHindi ? 'अभ्यास सत्र पूर्ण!' : 'Revision Session Complete!'}
          </h2>
          <p className="text-slate-400 mb-6">
            {isHindi
              ? 'आपने अपनी गलतियों का सफलतापूर्वक अभ्यास किया है!'
              : 'You have reviewed all your pending opening mistakes. Great job reinforcing your opening theory!'}
          </p>
          <Link
            href="/dashboard/student/openings"
            className="block py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors"
          >
            Back to Opening Library
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-blue-950/20 to-slate-950 p-4 md:p-6 flex flex-col">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/student/openings"
            className="text-slate-400 hover:text-white transition-colors"
          >
            ← Back
          </Link>
          <h1 className="text-lg font-bold text-white">
            🎯 Weakness Revision Mode ({currentIndex + 1}/{mistakes.length})
          </h1>
        </div>

        <button
          type="button"
          onClick={() => setLanguage(prev => prev === 'en' ? 'hi' : 'en')}
          className="text-xs px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white"
        >
          {isHindi ? 'Switch to EN' : 'हिंदी में'}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Board */}
        <div>
          <OpeningLessonBoard
            openingId={currentMistake.opening_id}
            chapterNum={1}
            positions={dummyPositions}
            currentPositionIndex={currentIndex}
            onMoveResult={handleMoveResult}
            language={language}
          />
        </div>

        {/* Prompt & Feedback */}
        <div className="space-y-4">
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5">
            <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              {isHindi ? 'अतीत की भूल' : 'Past Blunder Memory'}
            </span>
            <h2 className="text-lg font-bold text-white mt-1 mb-2">
              {isHindi ? 'क्या आप अब सही चाल पा सकते हैं?' : 'Can you find the correct move now?'}
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed mb-4">
              In a previous lesson, you played <span className="font-mono text-amber-300 font-bold">{currentMistake.student_move}</span> in this position.
            </p>

            <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-xs text-amber-300">
              💡 Goal: Play <span className="font-mono font-bold text-emerald-300">{currentMistake.expected_move}</span> to clear this mistake from your memory bank.
            </div>
          </div>

          {/* Move Result */}
          {lastResult && (
            <div className={`p-4 rounded-xl text-sm font-medium border ${
              lastResult.isCorrect
                ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-300'
                : 'bg-red-950/70 border-red-700/60 text-red-300'
            }`}>
              <div className="flex items-center gap-2 font-bold mb-1">
                <span>{lastResult.isCorrect ? '🌟 Correct!' : '❌ Incorrect'}</span>
                {isResolvedNow && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-xs">
                    🎉 Resolved!
                  </span>
                )}
              </div>
              <p className="text-xs leading-relaxed">{lastResult.explanation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
