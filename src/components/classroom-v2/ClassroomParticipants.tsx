'use client';

import React from 'react';
import { type ParticipantInfo, type UserRole } from '@/lib/classroom-v2/types';

interface ClassroomParticipantsProps {
  participants: ParticipantInfo[];
  isCoach: boolean;
  onToggleControl?: (studentId: string, enable: boolean) => void;
  className?: string;
}

export default function ClassroomParticipants({
  participants = [],
  isCoach,
  onToggleControl,
  className = '',
}: ClassroomParticipantsProps) {
  return (
    <div className={`flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="h-9 bg-slate-950/80 px-3 border-b border-slate-800 flex items-center justify-between">
        <span className="font-extrabold text-xs text-slate-300 tracking-wide uppercase">
          Participants ({participants.length})
        </span>
      </div>

      {/* Roster List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {participants.map((p) => {
          const isParticipantCoach = p.role === 'coach' || p.role === 'admin';

          return (
            <div
              key={p.userId}
              className="flex items-center justify-between p-2 rounded-xl bg-slate-800/40 hover:bg-slate-850 border border-slate-750/50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  data-presence={p.isOnline ? 'online' : 'offline'}
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    p.isOnline ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'
                  }`}
                  title={p.isOnline ? 'Online' : 'Offline'}
                />

                <div className="truncate">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-slate-200 truncate">
                      {p.firstName} {p.lastName}
                    </span>
                    {p.raisedHand && <span className="text-amber-400 text-xs animate-bounce">✋</span>}
                  </div>
                  <span className="text-[10px] text-slate-400 block capitalize">
                    {isParticipantCoach ? '👑 Coach (Host)' : '🎓 Student'}
                  </span>
                </div>
              </div>

              {/* Board Control Switch (for Coach to toggle Student board permissions) */}
              {!isParticipantCoach && isCoach && (
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] text-slate-400 font-bold">Control:</span>
                  <button
                    type="button"
                    data-testid="student-control-toggle"
                    onClick={() => onToggleControl?.(p.userId, !p.hasBoardControl)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider transition-all shadow-sm ${
                      p.hasBoardControl
                        ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                        : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                    }`}
                  >
                    {p.hasBoardControl ? 'ON' : 'OFF'}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
