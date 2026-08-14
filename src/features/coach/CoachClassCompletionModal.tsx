'use client';

import React, { useState, useTransition } from 'react';
import Modal from '@/components/ui/Modal';
import Input from '@/components/ui/Input';
import { completeClassSessionAction } from '@/actions/classes';

interface CoachClassCompletionModalProps {
  isOpen: boolean;
  onClose: () => void;
  classId: string;
  className?: string;
  students: Array<{ id: string; name: string; email: string }>;
  onCompleted?: () => void;
}

export default function CoachClassCompletionModal({
  isOpen,
  onClose,
  classId,
  className = 'Live Session',
  students,
  onCompleted,
}: CoachClassCompletionModalProps) {
  const [topicCovered, setTopicCovered] = useState('Tactics & Endgame Fundamentals');
  const [sessionNotes, setSessionNotes] = useState('');
  const [recordingUrl, setRecordingUrl] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [dispatchSuccess, setDispatchSuccess] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Attendance state map: studentId -> 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'>>(() => {
    const initial: Record<string, 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED'> = {};
    students.forEach((s) => {
      initial[s.id] = 'PRESENT';
    });
    return initial;
  });

  const handleStatusChange = (studentId: string, status: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED') => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!sessionNotes.trim()) {
      setErrorMsg('Please enter brief coach lesson observations or summary notes.');
      return;
    }

    const attendanceArray = Object.entries(attendanceMap).map(([studentId, status]) => ({
      studentId,
      status,
    }));

    startTransition(async () => {
      const res = await completeClassSessionAction({
        classId,
        sessionNotes: `[Topic: ${topicCovered}] ${sessionNotes.trim()}`,
        topicCovered,
        recordingUrl: recordingUrl.trim() || undefined,
        attendance: attendanceArray,
      });

      if (res && res.success) {
        setDispatchSuccess(true);
        setTimeout(() => {
          if (onCompleted) onCompleted();
          onClose();
        }, 1500);
      } else {
        setErrorMsg(res?.error?.message || 'Failed to submit class completion report.');
      }
    });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="📋 End & Complete Live Class Session">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 space-y-1">
          <p className="font-bold flex items-center gap-1.5 text-indigo-800">
            <span>🏁 Completing {className}</span>
          </p>
          <p className="text-[11px] text-indigo-700 leading-relaxed">
            Review student attendance, record session observations, and attach optional Google Drive recording link.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs font-bold text-red-600">
            ⚠️ {errorMsg}
          </div>
        )}

        {dispatchSuccess && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-xs font-bold text-green-700">
            ✅ Class Session Completed! Permanent attendance records saved & parent notifications dispatched.
          </div>
        )}

        {/* 1. Attendance Checklist */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-text-primary uppercase tracking-wider text-[10px]">
            1. Student Attendance Checklist ({students.length} Enrolled)
          </label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {students.length > 0 ? (
              students.map((st) => (
                <div key={st.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-2 text-xs">
                  <div>
                    <p className="font-bold text-text-primary">{st.name}</p>
                    <p className="text-[10px] text-text-secondary">{st.email}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {(['PRESENT', 'LATE', 'ABSENT', 'EXCUSED'] as const).map((stt) => (
                      <button
                        key={stt}
                        type="button"
                        onClick={() => handleStatusChange(st.id, stt)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-extrabold border transition ${
                          attendanceMap[st.id] === stt
                            ? stt === 'PRESENT'
                              ? 'bg-green-600 text-white border-green-700'
                              : stt === 'LATE'
                              ? 'bg-amber-500 text-white border-amber-600'
                              : stt === 'ABSENT'
                              ? 'bg-red-600 text-white border-red-700'
                              : 'bg-blue-600 text-white border-blue-700'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {stt === 'PRESENT' ? 'Present' : stt === 'LATE' ? 'Late' : stt === 'ABSENT' ? 'Absent' : 'Excused'}
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-text-secondary italic">No students mapped to this session.</p>
            )}
          </div>
        </div>

        {/* 2. Topic & Lesson Observations */}
        <div className="space-y-3">
          <Input
            id="completion-topic"
            label="2. Primary Curriculum Topic Covered"
            placeholder="e.g. Sicilian Defense Dragon & Pawn Endgames"
            value={topicCovered}
            onChange={(e) => setTopicCovered(e.target.value)}
            required
          />

          <div>
            <label htmlFor="completion-notes" className="block text-xs font-bold text-text-secondary mb-1">
              3. Coach Lesson Observations & Performance Summary *
            </label>
            <textarea
              id="completion-notes"
              rows={3}
              placeholder="e.g. Students demonstrated great tactical insight in the 3-ply puzzle drill. Leo struggled with knight forks — assigned extra homework."
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-xl text-xs font-semibold text-text-primary focus:outline-none focus:border-primary"
              required
            />
          </div>
        </div>

        {/* 3. Google Drive Recording Share Link */}
        <div>
          <Input
            id="completion-recording"
            label="4. Google Drive Class Recording Link (Optional)"
            placeholder="https://drive.google.com/file/d/1A2B3C.../view"
            value={recordingUrl}
            onChange={(e) => setRecordingUrl(e.target.value)}
          />
          <p className="text-[10px] text-text-secondary mt-1">
            Upload session video to Google Drive & paste the view link here. It will be submitted for Admin approval.
          </p>
        </div>

        {/* Parent Dispatch Footer Info */}
        <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-center gap-2">
          <span>📩</span>
          <span>Parent report email/WhatsApp will be dispatched automatically with attendance & coach notes.</span>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-border hover:bg-surface-light rounded-xl text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending || dispatchSuccess}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
          >
            {isPending ? 'Submitting Report...' : 'Complete & Dispatch Report'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
