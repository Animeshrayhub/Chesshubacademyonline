'use client';

import React, { useState, useTransition } from 'react';
import DashboardTable from '@/components/dashboard/ui/DashboardTable';
import TableSearchBar from '@/components/dashboard/ui/TableSearchBar';
import Textarea from '@/components/ui/Textarea';
import { getClassStudentsAction } from '@/actions/classes';
import { markClassAttendanceAction } from '@/actions/coaches';
import type { TableColumn } from '@/types/dashboard';

interface AttendanceRegistryProps {
  classes: Array<{
    id: string;
    schedule: string;
    class_type: string;
    status: string;
  }>;
  initialLogs: Array<{
    id: string;
    date: string;
    studentName: string;
    status: 'PRESENT' | 'ABSENT';
    feedback: string | null;
  }>;
}

const COLUMNS: TableColumn[] = [
  { key: 'date', label: 'Session Date' },
  { key: 'student', label: 'Student Name' },
  { key: 'status', label: 'Status' },
  { key: 'feedback', label: 'Observation Note' },
];

export default function AttendanceRegistry({ classes, initialLogs }: AttendanceRegistryProps) {
  const [search, setSearch] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [enrolledStudents, setEnrolledStudents] = useState<Array<{ studentProfileId: string; firstName: string; lastName: string; email: string }>>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  
  // Attendance form states
  const [attendanceStates, setAttendanceStates] = useState<Record<string, { status: 'PRESENT' | 'ABSENT'; feedback: string }>>({});
  const [reportNotes, setReportNotes] = useState('');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId);
    setEnrolledStudents([]);
    setAttendanceStates({});
    setFormError('');
    setFormSuccess(false);
    if (!classId) return;

    setLoadingStudents(true);
    const res = await getClassStudentsAction(classId);
    setLoadingStudents(false);

    if (res.success && res.data) {
      setEnrolledStudents(res.data);
      // Initialize statuses
      const initial: Record<string, { status: 'PRESENT' | 'ABSENT'; feedback: string }> = {};
      res.data.forEach((s: any) => {
        initial[s.studentProfileId] = { status: 'PRESENT', feedback: '' };
      });
      setAttendanceStates(initial);
    }
  };

  const handleStatusChange = (profileId: string, status: 'PRESENT' | 'ABSENT') => {
    setAttendanceStates((prev) => ({
      ...prev,
      [profileId]: { ...prev[profileId], status },
    }));
  };

  const handleFeedbackChange = (profileId: string, feedback: string) => {
    setAttendanceStates((prev) => ({
      ...prev,
      [profileId]: { ...prev[profileId], feedback },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClassId) return;

    setFormError('');
    setFormSuccess(false);

    const payload = Object.entries(attendanceStates).map(([profileId, val]) => ({
      studentProfileId: profileId,
      status: val.status,
      feedback: val.feedback,
    }));

    startTransition(async () => {
      const res = await markClassAttendanceAction(selectedClassId, payload, reportNotes);
      if (res.success) {
        setFormSuccess(true);
        setSelectedClassId('');
        setEnrolledStudents([]);
        setReportNotes('');
        setAttendanceStates({});
      } else {
        setFormError(res.error?.message || 'Failed to submit class report.');
      }
    });
  };

  const filteredLogs = initialLogs.filter((log) =>
    log.studentName.toLowerCase().includes(search.toLowerCase())
  );

  const rows = filteredLogs.map((log) => {
    const formattedDate = mounted
      ? new Date(log.date).toLocaleString('en-US', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      : '';
    return {
      date: <span className="font-semibold text-text-primary text-xs">{formattedDate}</span>,
      student: <span className="text-text-primary text-xs font-medium">{log.studentName}</span>,
      status: (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
            log.status === 'PRESENT'
              ? 'bg-green-50 text-green-700 border-green-100'
              : 'bg-red-50 text-red-700 border-red-100'
          }`}
        >
          {log.status}
        </span>
      ),
      feedback: <span className="text-text-secondary text-xs">{log.feedback || '—'}</span>,
    };
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left: Attendance logs list */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-bold text-text-primary uppercase tracking-wider">Attendance Logs</h2>
          <TableSearchBar
            placeholder="Filter logs by student name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-xs"
          />
        </div>

        <DashboardTable
          columns={COLUMNS}
          rows={rows}
          emptyTitle="No Attendance Logs Available"
          emptyDescription="Log presence during active sessions to populate attendance charts."
          caption="Session Attendance Records Log"
        />
      </div>

      {/* Right: Record Attendance form card */}
      <div className="bg-white border border-border rounded-2xl shadow-card p-5 h-fit">
        <h3 className="text-sm font-bold text-text-primary mb-1">Record Attendance</h3>
        <p className="text-[11px] text-text-secondary mb-4">
          Select a completed session and mark student attendance statuses.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {formSuccess && (
            <div className="p-3 bg-green-50 border border-green-100 rounded-xl text-xs font-semibold text-green-700">
              Attendance logged successfully!
            </div>
          )}
          {formError && (
            <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs font-semibold text-red-600">
              {formError}
            </div>
          )}

          {/* Select Class */}
          <div>
            <label htmlFor="class-select" className="block text-[11px] font-bold text-text-secondary mb-1 uppercase tracking-wide">
              Class Session
            </label>
            <select
              id="class-select"
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              className="block w-full text-xs font-semibold text-text-primary bg-white border border-border rounded-xl px-3 py-2 pr-8 focus:outline-none cursor-pointer"
              required
            >
              <option value="">Choose Class...</option>
              {classes.map((c) => {
                const dateStr = new Date(c.schedule).toLocaleString('en-US', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                });
                return (
                  <option key={c.id} value={c.id}>
                    {dateStr} ({c.class_type})
                  </option>
                );
              })}
            </select>
          </div>

          {loadingStudents && (
            <div className="text-xs text-primary font-semibold animate-pulse">Loading class roster...</div>
          )}

          {enrolledStudents.length > 0 && (
            <div className="space-y-4 pt-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Class Roster Presence</span>
              <div className="border border-border rounded-2xl overflow-hidden divide-y divide-border bg-slate-50/30">
                {enrolledStudents.map((student) => {
                  const state = attendanceStates[student.studentProfileId] || { status: 'PRESENT', feedback: '' };
                  return (
                    <div key={student.studentProfileId} className="p-3 flex flex-col gap-2 text-xs">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-semibold text-text-primary block">{student.firstName} {student.lastName}</span>
                          <span className="text-text-secondary text-[10px]">{student.email}</span>
                        </div>
                        
                        {/* Status toggles */}
                        <div className="flex bg-white rounded-lg border border-border overflow-hidden shadow-sm">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.studentProfileId, 'PRESENT')}
                            className={`px-2.5 py-1 text-[10px] font-bold transition-all ${
                              state.status === 'PRESENT' ? 'bg-green-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(student.studentProfileId, 'ABSENT')}
                            className={`px-2.5 py-1 text-[10px] font-bold transition-all ${
                              state.status === 'ABSENT' ? 'bg-red-600 text-white' : 'text-slate-500 hover:bg-slate-100'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>

                      {/* Observation note */}
                      <input
                        type="text"
                        placeholder="Observation note (e.g. Late 10m)"
                        value={state.feedback}
                        onChange={(e) => handleFeedbackChange(student.studentProfileId, e.target.value)}
                        className="bg-white border border-border text-[10px] px-2.5 py-1 rounded-lg focus:outline-none focus:ring-1 focus:ring-primary w-full text-text-primary"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Class notes summary */}
              <Textarea
                id="report-notes"
                label="Class Report Summary (required)"
                placeholder="Write summary notes of the topics covered..."
                value={reportNotes}
                onChange={(e) => setReportNotes(e.target.value)}
                rows={3}
                required
              />
            </div>
          )}

          <button
            type="submit"
            disabled={isPending || enrolledStudents.length === 0}
            className="w-full py-2.5 bg-primary hover:bg-primary-dark text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 mt-2"
          >
            {isPending ? 'Saving...' : 'Submit Attendance'}
          </button>
        </form>
      </div>
    </div>
  );
}
