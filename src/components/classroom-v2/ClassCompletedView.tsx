'use client';

import React from 'react';
import Link from 'next/link';

interface ClassCompletedViewProps {
  classId: string;
  className: string;
  coachName: string;
  scheduledStart: string;
  durationMinutes: number;
  reportNotes?: string | null;
  attendanceStatus?: string | null;
  feedback?: string | null;
  role: 'student' | 'coach' | 'admin';
}

export default function ClassCompletedView({
  className,
  coachName,
  scheduledStart,
  durationMinutes,
  reportNotes,
  attendanceStatus,
  feedback,
  role,
}: ClassCompletedViewProps) {
  const returnHref =
    role === 'coach'
      ? '/dashboard/coach/classes'
      : role === 'admin'
      ? '/dashboard/admin/classes'
      : '/dashboard/student/classes';

  const returnLabel =
    role === 'coach'
      ? 'Return to Coach Classes'
      : role === 'admin'
      ? 'Return to Admin Registry'
      : 'Return to My Classes & History';

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-4 sm:p-6 select-none font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 text-center">
        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center mx-auto text-3xl">
          🏆
        </div>

        <div className="space-y-1">
          <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-block">
            Class Completed
          </span>
          <h1 className="text-xl font-bold font-heading text-white">{className}</h1>
          <p className="text-xs text-slate-400">
            Conducted by <strong className="text-slate-200">{coachName}</strong> • {durationMinutes} mins
          </p>
          <p className="text-[11px] text-slate-500">
            {new Date(scheduledStart).toLocaleDateString([], {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>

        {/* Student Personal Attendance and Feedback Badge */}
        {role === 'student' && (
          <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 text-left space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400">Attendance:</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <span>✓</span> {attendanceStatus || 'COMPLETED'}
              </span>
            </div>

            {feedback && (
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 block mb-1">
                  🎯 Coach Feedback:
                </span>
                <p className="text-xs text-purple-200 italic leading-relaxed">
                  &ldquo;{feedback}&rdquo;
                </p>
              </div>
            )}
          </div>
        )}

        {/* What We Learned Card */}
        <div className="bg-indigo-950/40 border border-indigo-800/50 rounded-2xl p-4 text-left space-y-1.5">
          <div className="flex items-center gap-2 text-indigo-300">
            <span>📖</span>
            <span className="text-xs font-extrabold uppercase tracking-wider">
              Lesson Summary & Review
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
            {reportNotes || 'This coaching session has concluded. Great participation on the board! Check your dashboard for homework puzzles and upcoming schedules.'}
          </p>
        </div>

        {/* Navigation Action */}
        <div className="pt-2">
          <Link
            href={returnHref}
            className="w-full py-3 px-6 rounded-xl font-bold text-xs bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white transition-all shadow-md flex items-center justify-center gap-2"
          >
            <span>←</span>
            <span>{returnLabel}</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
