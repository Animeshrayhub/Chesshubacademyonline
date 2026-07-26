'use client';

import React from 'react';

interface RosterStudent {
  id: string;
  name: string;
  track: string;
  status: 'Assigned' | 'Submitted' | 'Reviewed';
  score?: number;
  timeSpent?: string;
}

interface StudentRosterMatrixModalProps {
  isOpen: boolean;
  onClose: () => void;
  chapterTitle?: string;
  students?: RosterStudent[];
}

export default function StudentRosterMatrixModal({
  isOpen,
  onClose,
  chapterTitle = 'Chapter',
  students = [
    { id: '1', name: 'Aarav Sharma', track: 'Beginner', status: 'Reviewed', score: 100, timeSpent: '38s' },
    { id: '2', name: 'Ananya Patel', track: 'Beginner', status: 'Submitted', score: 80, timeSpent: '52s' },
    { id: '3', name: 'Rohan Gupta', track: 'Intermediate', status: 'Assigned', timeSpent: '-' },
    { id: '4', name: 'Kabir Mehta', track: 'Beginner', status: 'Reviewed', score: 90, timeSpent: '41s' },
  ],
}: StudentRosterMatrixModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-2xl space-y-4 shadow-2xl relative text-white">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-lg">
              👥
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-purple-400">
                Student Assignment Roster Matrix
              </h3>
              <p className="text-xs text-slate-400">Completion status for {chapterTitle}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm"
          >
            ✕
          </button>
        </div>

        {/* Matrix Grid */}
        <div className="overflow-x-auto bg-slate-950 border border-slate-800 rounded-2xl">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-900 border-b border-slate-800 text-[10px] uppercase font-bold text-slate-400">
              <tr>
                <th className="p-3">Student Name</th>
                <th className="p-3">Track</th>
                <th className="p-3">Assignment Status</th>
                <th className="p-3">Score</th>
                <th className="p-3">Avg Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-850 font-medium">
              {students.map((s) => (
                <tr key={s.id} className="hover:bg-slate-900/60">
                  <td className="p-3 font-bold text-white">{s.name}</td>
                  <td className="p-3">
                    <span className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full font-bold">
                      {s.track}
                    </span>
                  </td>
                  <td className="p-3">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                        s.status === 'Reviewed'
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : s.status === 'Submitted'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="p-3 font-mono font-bold text-amber-400">
                    {s.score !== undefined ? `${s.score}%` : '-'}
                  </td>
                  <td className="p-3 font-mono text-slate-400">{s.timeSpent}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl"
          >
            Close Roster View
          </button>
        </div>
      </div>
    </div>
  );
}
