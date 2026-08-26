'use client';

import React from 'react';

interface StudentInfo {
  firstName: string;
  lastName: string;
  email: string;
  studentProfileId?: string;
  userId?: string;
}

interface ClassroomSummaryModalProps {
  isOpen: boolean;
  className: string;
  classType: string;
  durationFormatted: string;
  coachName: string;
  students: StudentInfo[];
  movesCount: number;
  gamePgn: string;
  quizScore?: { correct: number; total: number };
  onClose: () => void;
  onExitDashboard: () => void;
}

export default function ClassroomSummaryModal({
  isOpen,
  className,
  classType,
  durationFormatted,
  coachName,
  students,
  movesCount,
  gamePgn,
  quizScore,
  onClose,
  onExitDashboard,
}: ClassroomSummaryModalProps) {
  if (!isOpen) return null;

  const handleDownloadPgn = () => {
    const blob = new Blob([gamePgn || '[Event "ChessHub Academy Class"]\n*'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chesshub_class_${Date.now()}.pgn`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
      <div className="bg-[#0f0f24] border border-[#2a2a52] rounded-2xl p-6 w-full max-w-lg space-y-5 shadow-2xl text-white animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="text-center space-y-1">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-3xl mx-auto shadow-lg shadow-emerald-500/20 border border-emerald-400/40">
            🏁
          </div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Class Session Summary</h2>
          <p className="text-xs text-emerald-400 font-semibold">{className}</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-2.5 bg-[#080816] p-3.5 rounded-xl border border-[#1e1e3d] text-center">
          <div>
            <span className="text-[10px] text-[#8888aa] font-bold uppercase block">Duration</span>
            <span className="text-sm font-extrabold text-amber-400 font-mono">⏱ {durationFormatted}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#8888aa] font-bold uppercase block">Moves Played</span>
            <span className="text-sm font-extrabold text-indigo-300 font-mono">♟️ {movesCount}</span>
          </div>
          <div>
            <span className="text-[10px] text-[#8888aa] font-bold uppercase block">Attendance</span>
            <span className="text-sm font-extrabold text-emerald-400 font-mono">👥 {students.length} Students</span>
          </div>
        </div>

        {/* Quiz score highlight if available */}
        {quizScore && quizScore.total > 0 && (
          <div className="bg-gradient-to-r from-indigo-950/80 to-purple-950/80 border border-indigo-500/40 p-3 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎯</span>
              <div>
                <p className="text-xs font-bold text-indigo-200">In-Class Quiz Score</p>
                <p className="text-[10px] text-indigo-400">Questions Answered Correctly</p>
              </div>
            </div>
            <span className="text-lg font-black text-amber-300 font-mono">
              {quizScore.correct} / {quizScore.total}
            </span>
          </div>
        )}

        {/* Coach & Class Details */}
        <div className="space-y-1.5 text-xs bg-[#14142a] p-3 rounded-xl border border-[#222248]">
          <div className="flex justify-between">
            <span className="text-[#8888aa]">Coach:</span>
            <span className="font-bold text-white">{coachName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[#8888aa]">Class Type:</span>
            <span className="font-bold text-emerald-400">{classType}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownloadPgn}
            className="flex-1 py-2.5 bg-[#1e1e3d] hover:bg-[#2a2a52] border border-[#3a3a6a] text-white font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
          >
            <span>📥</span><span>Download PGN</span>
          </button>
          <button
            type="button"
            onClick={onExitDashboard}
            className="flex-1 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
          >
            <span>🏠</span><span>Back to Dashboard</span>
          </button>
        </div>
      </div>
    </div>
  );
}
