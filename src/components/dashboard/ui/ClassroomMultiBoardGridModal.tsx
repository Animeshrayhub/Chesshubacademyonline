'use client';

import React from 'react';
import MiniChessBoard from './MiniChessBoard';

interface StudentInfo {
  firstName: string;
  lastName: string;
  email: string;
  studentProfileId?: string;
  userId?: string;
}

interface ClassroomMultiBoardGridModalProps {
  isOpen: boolean;
  students: StudentInfo[];
  currentFen: string;
  boardControllerId: string;
  onClose: () => void;
  onGrantControl: (studentId: string) => void;
}

export default function ClassroomMultiBoardGridModal({
  isOpen,
  students,
  currentFen,
  boardControllerId,
  onClose,
  onGrantControl,
}: ClassroomMultiBoardGridModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex flex-col p-6 overflow-hidden">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#2a2a52] pb-4 mb-4 flex-shrink-0 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-900/40 border border-indigo-500/40 flex items-center justify-center text-xl">
            🗂️
          </div>
          <div>
            <h3 className="font-extrabold text-base text-white">Coach Multi-Board Monitor Grid</h3>
            <p className="text-xs text-[#8888aa]">Observing all {students.length} active student practice boards in real-time</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="px-3.5 py-1.5 bg-[#1a1a38] hover:bg-[#25254e] text-white text-xs font-bold rounded-xl border border-[#3a3a6e] transition-colors"
        >
          ✕ Close Grid
        </button>
      </div>

      {/* Grid container */}
      <div className="flex-1 overflow-y-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 p-2">
        {students.map((student, idx) => {
          const studentName = `${student.firstName} ${student.lastName}`.trim() || 'Student';
          const targetId = student.studentProfileId || student.userId || studentName;
          const hasControl = boardControllerId === targetId;

          return (
            <div
              key={student.email || idx}
              className={`bg-[#0f0f24] border rounded-2xl p-3 flex flex-col gap-2 transition-all ${
                hasControl ? 'border-emerald-500 ring-2 ring-emerald-500/30' : 'border-[#222248] hover:border-[#3a3a6e]'
              }`}
            >
              {/* Header inside card */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-indigo-950 border border-indigo-700/50 flex items-center justify-center text-xs font-bold text-indigo-300">
                    {student.firstName[0]}{student.lastName[0]}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white truncate max-w-[130px]">{studentName}</p>
                    <p className="text-[9px] text-[#8888aa]">Board #{idx + 1}</p>
                  </div>
                </div>
                {hasControl ? (
                  <span className="px-2 py-0.5 bg-emerald-950 text-emerald-300 border border-emerald-700/60 rounded text-[9px] font-extrabold flex items-center gap-1">
                    <span>🎮</span> Active Control
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onGrantControl(targetId);
                      onClose();
                    }}
                    className="px-2 py-0.5 bg-indigo-600/30 hover:bg-indigo-600/60 text-indigo-200 border border-indigo-500/40 rounded text-[9px] font-bold transition-all"
                  >
                    Give Control
                  </button>
                )}
              </div>

              {/* Board preview */}
              <div className="w-full aspect-square bg-[#080816] rounded-xl overflow-hidden flex items-center justify-center border border-[#1a1a36]">
                <MiniChessBoard fen={currentFen} size={220} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
