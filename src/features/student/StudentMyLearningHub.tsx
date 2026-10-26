'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import DashboardIcon from '@/components/dashboard/ui/DashboardIcon';
import type { ChessStudy } from '@/lib/studies/studyLibraryService';

interface StudentMyLearningHubProps {
  user: {
    id: string;
    firstName: string;
    email?: string;
  };
  assignments: any[];
  enrollments: any[];
  studies: ChessStudy[];
  nextClass?: string;
  liveClass?: {
    id: string;
    title: string;
    classType: string;
  } | null;
}

type LearningTab = 'all' | 'assignments' | 'workbooks' | 'studies' | 'completed';

export default function StudentMyLearningHub({
  user,
  assignments,
  enrollments,
  studies,
  nextClass,
  liveClass,
}: StudentMyLearningHubProps) {
  const [activeTab, setActiveTab] = useState<LearningTab>('all');
  const [selectedStudy, setSelectedStudy] = useState<ChessStudy | null>(
    studies.length > 0 ? studies[0] : null
  );

  // Categorize real assignments
  const pendingAssignments = assignments.filter(
    (a) => a.status === 'assigned' || a.status === 'in_progress' || !a.status
  );
  const submittedAssignments = assignments.filter((a) => a.status === 'submitted');
  const reviewedAssignments = assignments.filter((a) => a.status === 'reviewed');
  const completedAssignments = [...reviewedAssignments, ...submittedAssignments];

  const hasAnyLearningData =
    assignments.length > 0 || enrollments.length > 0 || studies.length > 0;

  return (
    <div className="space-y-6 select-none pb-12">
      {/* 👑 Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold uppercase tracking-wider">
              <span>📚</span>
              <span>Student Learning Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My Learning &amp; Curriculum
            </h1>
            <p className="text-slate-300 text-sm leading-relaxed">
              Access your coach-assigned workbook chapters, interactive studies, upcoming class materials, and reviewed feedback all in one place.
            </p>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-2xl text-center min-w-[100px] shadow-inner">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Pending Work
              </span>
              <span className="text-xl font-extrabold font-mono text-amber-400">
                {pendingAssignments.length}
              </span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-2xl text-center min-w-[100px] shadow-inner">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Reviewed
              </span>
              <span className="text-xl font-extrabold font-mono text-emerald-400">
                {reviewedAssignments.length}
              </span>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 px-4 py-3 rounded-2xl text-center min-w-[100px] shadow-inner">
              <span className="text-[10px] text-slate-400 uppercase font-bold block">
                Studies
              </span>
              <span className="text-xl font-extrabold font-mono text-blue-400">
                {studies.length}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 🔴 Live Session or Next Class Banner */}
      {liveClass ? (
        <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-lg animate-pulse">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center text-xl shrink-0">
              📹
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black uppercase tracking-wider">
                  Live Now
                </span>
                <span className="text-xs text-emerald-300 font-bold">Interactive Coaching Session</span>
              </div>
              <h3 className="text-sm font-bold text-white mt-0.5">{liveClass.title}</h3>
            </div>
          </div>
          <Link
            href="/dashboard/student/classes"
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-md transition-all shrink-0 self-stretch sm:self-auto text-center"
          >
            Enter Live Classroom →
          </Link>
        </div>
      ) : nextClass && nextClass !== 'None' ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xl">🗓️</span>
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                Upcoming Live Lesson
              </span>
              <p className="text-xs font-bold text-white mt-0.5">{nextClass}</p>
            </div>
          </div>
          <Link
            href="/dashboard/student/classes"
            className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
          >
            <span>View Full Schedule</span>
            <span>→</span>
          </Link>
        </div>
      ) : null}

      {/* Navigation Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { key: 'all', label: 'All Learning Material', count: assignments.length + studies.length },
          { key: 'assignments', label: "Today's Work", count: pendingAssignments.length },
          { key: 'workbooks', label: 'Workbooks & Courses', count: enrollments.length },
          { key: 'studies', label: 'Study Library', count: studies.length },
          { key: 'completed', label: 'Completed & Feedback', count: completedAssignments.length },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as LearningTab)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 border ${
                isActive
                  ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  isActive ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Empty State when no assignments or courses exist */}
      {!hasAnyLearningData ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 sm:p-12 text-center max-w-2xl mx-auto shadow-xs space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 border border-emerald-200 text-3xl flex items-center justify-center mx-auto text-emerald-600 shadow-inner">
            ♟️
          </div>
          <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-900">
              No Assigned Work Right Now
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              You are completely caught up! Your coach has not assigned any pending workbook chapters or required homework today. You can sharpen your tactics in Puzzle Training or practice with chess bots while waiting.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/dashboard/student/puzzles"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-xs flex items-center justify-center gap-2"
            >
              <span>Start Puzzle Training</span>
              <span>→</span>
            </Link>
            <Link
              href="/dashboard/student/games"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs uppercase tracking-wider transition-all border border-slate-200 flex items-center justify-center gap-2"
            >
              <span>Practice vs Bot</span>
            </Link>
            <Link
              href="/dashboard/student/classes"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-600 font-semibold text-xs border border-slate-200 transition-all flex items-center justify-center gap-1.5"
            >
              <span>Contact Coach in Class</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* SECTION 1: TODAY'S ASSIGNED WORK */}
          {(activeTab === 'all' || activeTab === 'assignments') && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center text-base">
                    📝
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Today&apos;s Assigned Work</h2>
                    <p className="text-[11px] text-slate-500">Coach-assigned tasks requiring calculation</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  {pendingAssignments.length} Due
                </span>
              </div>

              {pendingAssignments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pendingAssignments.map((asgn: any) => (
                    <div
                      key={asgn.id || asgn.chapterId}
                      className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-white hover:border-emerald-300 hover:shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 text-[10px] font-extrabold uppercase">
                            Chapter {asgn.chapterNumber || 1}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400">
                            {asgn.assignedAt
                              ? new Date(asgn.assignedAt).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Assigned'}
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {asgn.chapterTitle || 'Tactics Practice Chapter'}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-1">
                          {asgn.workbookTitle || 'Curriculum Workbook'}
                        </p>
                        {asgn.coachNotes && (
                          <div className="p-2.5 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900">
                            <strong>Coach:</strong> {asgn.coachNotes}
                          </div>
                        )}
                      </div>

                      <div className="pt-4 mt-2 border-t border-slate-100">
                        <Link
                          href={`/dashboard/student/homework/solve/${asgn.chapterId || asgn.id}`}
                          className="w-full py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs"
                        >
                          <span>Solve Assignment</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  🎉 No pending homework assignments! You have completed all tasks assigned by your coach.
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: ASSIGNED COURSES & WORKBOOKS */}
          {(activeTab === 'all' || activeTab === 'workbooks') && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center text-base">
                    📖
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Workbooks &amp; Curriculum Tracks</h2>
                    <p className="text-[11px] text-slate-500">Your syllabus and study chapters</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                  {enrollments.length} Active
                </span>
              </div>

              {enrollments.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {enrollments.map((course: any) => (
                    <div
                      key={course.id || course.courseId}
                      className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 hover:bg-white hover:border-blue-300 hover:shadow-sm transition-all flex flex-col justify-between"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200 text-[10px] font-extrabold uppercase">
                            {course.track || 'CURRICULUM'}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold">Self-Paced</span>
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 line-clamp-1">
                          {course.courseTitle || 'Chess Curriculum Workbook'}
                        </h3>
                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {course.description ||
                            'Standard tactical problem sets and developmental positions designed by ChessHub masters.'}
                        </p>
                      </div>

                      <div className="pt-4 mt-2 border-t border-slate-100">
                        <Link
                          href={`/dashboard/student/homework/workbooks`}
                          className="w-full py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-xs"
                        >
                          <span>Open Workbook Modules</span>
                          <span>→</span>
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  No courses currently enrolled. Your coach assigns workbooks directly to your profile.
                </div>
              )}
            </div>
          )}

          {/* SECTION 3: STUDY RESOURCES & ANNOTATED MASTER GAMES */}
          {(activeTab === 'all' || activeTab === 'studies') && studies.length > 0 && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-purple-50 border border-purple-200 text-purple-600 flex items-center justify-center text-base">
                    ♟️
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Study Library &amp; PGN Guides</h2>
                    <p className="text-[11px] text-slate-500">Coach annotated games, opening lines, and endgame principles</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-purple-700 bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  {studies.length} Studies
                </span>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                {/* Study selector list */}
                <div className="space-y-2 lg:max-h-80 overflow-y-auto pr-1">
                  {studies.map((study) => (
                    <button
                      key={study.id}
                      type="button"
                      onClick={() => setSelectedStudy(study)}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedStudy?.id === study.id
                          ? 'bg-purple-50 border-purple-300 text-purple-950 font-bold shadow-xs'
                          : 'bg-slate-50 border-slate-200 hover:bg-slate-100 text-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1">
                        <span className="font-bold uppercase tracking-wider">{study.category}</span>
                        <span>{study.difficulty}</span>
                      </div>
                      <p className="text-xs font-bold text-slate-900 truncate">{study.title}</p>
                    </button>
                  ))}
                </div>

                {/* Selected study viewer preview */}
                <div className="lg:col-span-2 bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white space-y-3">
                  {selectedStudy ? (
                    <div className="space-y-3">
                      <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2">
                        <div>
                          <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider block">
                            {selectedStudy.category} • {selectedStudy.author}
                          </span>
                          <h4 className="text-sm font-extrabold text-white">{selectedStudy.title}</h4>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-300">
                          {selectedStudy.movesCount} Moves
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {selectedStudy.description}
                      </p>
                      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 font-mono text-xs text-amber-300/90 max-h-28 overflow-y-auto select-all leading-relaxed">
                        {selectedStudy.pgn}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          )}

          {/* SECTION 4: COMPLETED ASSIGNMENTS & FEEDBACK */}
          {(activeTab === 'all' || activeTab === 'completed') && (
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center text-base">
                    ✅
                  </span>
                  <div>
                    <h2 className="text-sm font-bold text-slate-900">Completed &amp; Coach Feedback</h2>
                    <p className="text-[11px] text-slate-500">Historical workbook reviews and feedback remarks</p>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                  {completedAssignments.length} Completed
                </span>
              </div>

              {completedAssignments.length > 0 ? (
                <div className="space-y-2.5">
                  {completedAssignments.map((asgn: any) => (
                    <div
                      key={asgn.id || asgn.chapterId}
                      className="border border-slate-200 rounded-xl p-3.5 bg-slate-50/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-bold text-slate-900">
                            {asgn.chapterTitle || 'Chapter Practice'}
                          </h4>
                          <span
                            className={`text-[9px] font-black uppercase px-2 py-0.2 rounded-full border ${
                              asgn.status === 'reviewed'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                : 'bg-amber-100 text-amber-800 border-amber-200'
                            }`}
                          >
                            {asgn.status}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500">
                          {asgn.workbookTitle || 'Curriculum Workbook'} •{' '}
                          {asgn.score !== undefined && asgn.totalPuzzles
                            ? `Score: ${asgn.score} / ${asgn.totalPuzzles} Solved`
                            : 'Submitted to Coach'}
                        </p>
                        {asgn.coachFeedback && (
                          <p className="text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg p-2 mt-1">
                            💬 <strong>Coach Feedback:</strong> {asgn.coachFeedback}
                          </p>
                        )}
                      </div>

                      <div className="text-right shrink-0">
                        <Link
                          href={`/dashboard/student/homework/solve/${asgn.chapterId || asgn.id}`}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-xs font-bold transition-all"
                        >
                          Review Positions
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-slate-100">
                  No completed assignments yet. When you submit homework and your coach reviews it, your results and notes will appear here.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
