'use client';

import React, { useState, useEffect, useCallback } from 'react';
import HomeworkPuzzleSolver from './HomeworkPuzzleSolver';
import type {
  StudentPuzzleView, DbStudentPuzzleAttempt,
  DbHomeworkProgress, PuzzleMoveResult,
} from '@/types/homework-puzzles';
import { UNLOCK_THRESHOLD } from '@/types/homework-puzzles';
import Link from 'next/link';

interface HomeworkPuzzleSessionProps {
  assignmentId:  string;
  chapterTitle:  string;
  workbookTitle: string;
}

export default function HomeworkPuzzleSession({
  assignmentId, chapterTitle, workbookTitle,
}: HomeworkPuzzleSessionProps) {
  const [puzzles, setPuzzles] = useState<StudentPuzzleView[]>([]);
  const [attempts, setAttempts] = useState<Record<string, DbStudentPuzzleAttempt>>({});
  const [progress, setProgress] = useState<DbHomeworkProgress | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCompletedSession, setIsCompletedSession] = useState(false);

  // Load session data
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessRes, progRes] = await Promise.all([
        fetch(`/api/homework/session?assignmentId=${assignmentId}`).then((r) => r.json()),
        fetch(`/api/homework/progress?assignmentId=${assignmentId}`).then((r) => r.json()),
      ]);

      if (sessRes.error) {
        setError(sessRes.error);
        return;
      }

      const puzzleList: StudentPuzzleView[] = sessRes.puzzles || [];
      setPuzzles(puzzleList);

      const attemptMap: Record<string, DbStudentPuzzleAttempt> = {};
      (progRes.attempts || []).forEach((att: DbStudentPuzzleAttempt) => {
        attemptMap[att.puzzle_id] = att;
      });
      setAttempts(attemptMap);
      setProgress(progRes.progress || null);

      // Find first unsolved puzzle or default to 0
      const firstUnsolved = puzzleList.findIndex(
        (p) => !attemptMap[p.id] || attemptMap[p.id].status === 'unsolved'
      );
      if (firstUnsolved !== -1) {
        setCurrentIndex(firstUnsolved);
      } else if (puzzleList.length > 0) {
        // All puzzles solved/failed
        setIsCompletedSession(true);
        setCurrentIndex(puzzleList.length - 1);
      }
    } catch {
      setError('Failed to load homework session. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handle advancing to next puzzle
  const handleNext = async (_result: PuzzleMoveResult | null) => {
    // Refresh progress state from server
    try {
      const progRes = await fetch(`/api/homework/progress?assignmentId=${assignmentId}`).then((r) => r.json());
      if (progRes.attempts) {
        const attemptMap: Record<string, DbStudentPuzzleAttempt> = {};
        progRes.attempts.forEach((att: DbStudentPuzzleAttempt) => {
          attemptMap[att.puzzle_id] = att;
        });
        setAttempts(attemptMap);
      }
      if (progRes.progress) {
        setProgress(progRes.progress);
      }
    } catch {}

    if (currentIndex + 1 < puzzles.length) {
      setCurrentIndex((i) => i + 1);
    } else {
      setIsCompletedSession(true);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] bg-white rounded-2xl border border-border p-8">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-bold text-text-primary">Loading Homework Puzzles...</p>
        <p className="text-xs text-text-secondary mt-1">Preparing your tactical training session</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center max-w-lg mx-auto">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3 text-xl">⚠️</div>
        <h3 className="text-base font-bold text-red-800">Session Error</h3>
        <p className="text-xs text-red-600 mt-1">{error}</p>
        <div className="mt-4 flex justify-center gap-3">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-bold hover:bg-red-700 transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/dashboard/student/homework"
            className="px-4 py-2 bg-white text-text-primary border border-border rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors"
          >
            Back to Homework
          </Link>
        </div>
      </div>
    );
  }

  if (puzzles.length === 0) {
    return (
      <div className="bg-slate-50 border border-dashed border-border rounded-2xl p-10 text-center max-w-md mx-auto">
        <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-3 text-xl">🧩</div>
        <h3 className="text-base font-bold text-text-primary">No Puzzles Assigned Yet</h3>
        <p className="text-xs text-text-secondary mt-1">
          Your coach has not attached puzzles to this chapter workbook yet. Check back soon!
        </p>
        <Link
          href="/dashboard/student/homework"
          className="inline-block mt-4 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold"
        >
          Back to Overview
        </Link>
      </div>
    );
  }

  const currentPuzzle = puzzles[currentIndex];
  const currentAttempt = attempts[currentPuzzle?.id];

  const totalSolved = progress?.solved_puzzles ?? Object.values(attempts).filter((a) => a.status === 'solved').length;
  const totalPuzzles = puzzles.length;
  const accuracy = progress?.accuracy ?? (totalPuzzles > 0 ? Math.round((totalSolved / totalPuzzles) * 100) : 0);
  const totalScore = progress?.total_score ?? Object.values(attempts).reduce((acc, a) => acc + (a.score || 0), 0);
  const isPassed = accuracy >= UNLOCK_THRESHOLD;

  // Render session complete summary view if finished
  if (isCompletedSession && currentIndex >= puzzles.length - 1) {
    return (
      <div className="space-y-6">
        <div className="bg-white rounded-2xl border border-border p-6 text-center max-w-2xl mx-auto shadow-card">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl ${
            isPassed ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
          }`}>
            {isPassed ? '🎉' : '💪'}
          </div>

          <h2 className="text-xl font-bold text-text-primary">
            {isPassed ? 'Homework Completed & Passed!' : 'Session Complete'}
          </h2>
          <p className="text-xs text-text-secondary mt-1 max-w-md mx-auto">
            {isPassed
              ? `Outstanding tactical performance! You achieved ${accuracy}% accuracy, unlocking the next chapter in ${workbookTitle}.`
              : `You completed all ${totalPuzzles} puzzles with ${accuracy}% accuracy. Review your mistakes to reach ${UNLOCK_THRESHOLD}% accuracy and unlock the next chapter!`}
          </p>

          {/* Stats Breakdown */}
          <div className="grid grid-cols-3 gap-4 my-6 text-left">
            <div className="p-4 bg-slate-50 border border-border rounded-xl">
              <div className="text-[11px] font-bold text-text-secondary uppercase">Accuracy</div>
              <div className={`text-xl font-extrabold mt-1 ${accuracy >= 90 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {accuracy}%
              </div>
              <div className="text-[10px] text-text-secondary mt-0.5">{totalSolved} of {totalPuzzles} solved</div>
            </div>

            <div className="p-4 bg-slate-50 border border-border rounded-xl">
              <div className="text-[11px] font-bold text-text-secondary uppercase">Total Score</div>
              <div className="text-xl font-extrabold text-primary mt-1">{totalScore} pts</div>
              <div className="text-[10px] text-text-secondary mt-0.5">out of {totalPuzzles * 100} max</div>
            </div>

            <div className="p-4 bg-slate-50 border border-border rounded-xl">
              <div className="text-[11px] font-bold text-text-secondary uppercase">Next Chapter</div>
              <div className={`text-[12px] font-bold mt-1.5 flex items-center gap-1 ${isPassed ? 'text-emerald-600' : 'text-slate-400'}`}>
                {isPassed ? '🔓 UNLOCKED' : '🔒 Locked (Need 90%)'}
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={() => {
                setIsCompletedSession(false);
                setCurrentIndex(0);
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-slate-100 text-text-primary rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
            >
              🔄 Review / Practice Again
            </button>
            <Link
              href="/dashboard/student/homework"
              className="w-full sm:w-auto px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:opacity-90 transition-opacity text-center"
            >
              Return to Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Session Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 bg-slate-50 p-4 rounded-xl border border-border">
        <div>
          <div className="text-[11px] font-bold text-text-secondary uppercase tracking-wider">{workbookTitle}</div>
          <h2 className="text-base font-bold text-text-primary">{chapterTitle}</h2>
        </div>

        {/* Puzzle dots navigation bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-1 sm:pb-0">
          {puzzles.map((p, idx) => {
            const att = attempts[p.id];
            const isCurrent = idx === currentIndex;
            let dotBg = 'bg-slate-200 text-slate-600';
            if (att?.status === 'solved') dotBg = 'bg-emerald-500 text-white';
            else if (att?.status === 'failed') dotBg = 'bg-red-500 text-white';
            else if (isCurrent) dotBg = 'bg-primary text-white ring-2 ring-primary/30';

            return (
              <button
                key={p.id}
                onClick={() => setCurrentIndex(idx)}
                title={`Puzzle ${idx + 1}: ${p.title}`}
                className={`w-7 h-7 rounded-lg font-mono text-xs font-bold flex items-center justify-center transition-all ${dotBg}`}
              >
                {idx + 1}
              </button>
            );
          })}
        </div>
      </div>

      {/* Solver Component */}
      <HomeworkPuzzleSolver
        key={currentPuzzle.id}
        puzzle={currentPuzzle}
        assignmentId={assignmentId}
        attempt={currentAttempt}
        onNext={handleNext}
        isLast={currentIndex === puzzles.length - 1}
        puzzleNumber={currentIndex + 1}
        totalPuzzles={puzzles.length}
      />
    </div>
  );
}
