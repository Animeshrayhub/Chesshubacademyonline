'use client';

import React, { useState, useTransition } from 'react';
import { updateStudentAttendanceAction } from '@/actions/classes';

interface StudentAttendanceItem {
  studentProfileId: string;
  firstName: string;
  lastName: string;
  email: string;
  firstJoinedAt?: string | null;
}

interface ClassAttendanceTrackerProps {
  classId: string;
  initialStudents: StudentAttendanceItem[];
  isCoach: boolean;
}

export default function ClassAttendanceTracker({
  classId,
  initialStudents,
  isCoach,
}: ClassAttendanceTrackerProps) {
  const [students, setStudents] = useState<StudentAttendanceItem[]>(initialStudents || []);
  const [isPending, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<string | null>(null);

  const presentCount = students.filter((s) => !!s.firstJoinedAt).length;
  const totalCount = students.length;
  const attendanceRate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;

  const handleToggleAttendance = (studentProfileId: string, currentStatus: boolean) => {
    const nextStatus = !currentStatus;
    setActiveId(studentProfileId);

    startTransition(async () => {
      const res = await updateStudentAttendanceAction(classId, studentProfileId, nextStatus);
      if (res.success) {
        setStudents((prev) =>
          prev.map((s) =>
            s.studentProfileId === studentProfileId
              ? { ...s, firstJoinedAt: nextStatus ? new Date().toISOString() : null }
              : s
          )
        );
      }
      setActiveId(null);
    });
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-5 shadow-xl">
      {/* Header & Stats Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <span>👥 Class Attendance</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {presentCount}/{totalCount} Present ({attendanceRate}%)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Track student classroom attendance and join timestamps for this session.
          </p>
        </div>
      </div>

      {/* Student Attendance List */}
      {students.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-2">No students enrolled in this class.</p>
      ) : (
        <div className="space-y-3">
          {students.map((st) => {
            const isPresent = !!st.firstJoinedAt;
            const isLoadingThis = isPending && activeId === st.studentProfileId;

            return (
              <div
                key={st.studentProfileId}
                className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 flex items-center justify-between gap-4 transition-all hover:border-slate-700"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shadow-inner ${
                      isPresent
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {st.firstName[0]}
                    {st.lastName[0]}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white flex items-center gap-2">
                      <span>
                        {st.firstName} {st.lastName}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isPresent
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {isPresent ? '🟢 Present' : '🔴 Absent'}
                      </span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {st.email}
                      {st.firstJoinedAt && (
                        <span className="text-slate-500 text-[10px] ml-2">
                          (Joined: {new Date(st.firstJoinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                {isCoach && (
                  <button
                    type="button"
                    disabled={isLoadingThis}
                    onClick={() => handleToggleAttendance(st.studentProfileId, isPresent)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50 ${
                      isPresent
                        ? 'bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-400 border border-slate-700 hover:border-rose-800'
                        : 'bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black'
                    }`}
                  >
                    {isLoadingThis ? 'Updating...' : isPresent ? 'Mark Absent' : '✓ Mark Present'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
