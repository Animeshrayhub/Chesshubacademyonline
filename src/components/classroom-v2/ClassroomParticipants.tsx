'use client';

import React from 'react';
import { type ParticipantInfo, type UserRole, type StudentBoardColorPermission } from '@/lib/classroom-v2/types';

interface ClassroomParticipantsProps {
  participants: ParticipantInfo[];
  isCoach: boolean;
  onToggleControl?: (studentId: string, enable: boolean | StudentBoardColorPermission) => void;
  onLowerHand?: (studentId: string) => void;
  onLowerAllHands?: () => void;
  onMuteAll?: () => Promise<boolean | void>;
  className?: string;
}

export default function ClassroomParticipants({
  participants = [],
  isCoach,
  onToggleControl,
  onLowerHand,
  onLowerAllHands,
  onMuteAll,
  className = '',
}: ClassroomParticipantsProps) {
  const [isMuting, setIsMuting] = React.useState(false);
  const [mutedSuccess, setMutedSuccess] = React.useState(false);

  const raisedParticipants = participants.filter((p) => p.role === 'student' && p.raisedHand);

  const handleMuteAllClick = async () => {
    if (!onMuteAll) return;
    setIsMuting(true);
    try {
      await onMuteAll();
      setMutedSuccess(true);
      setTimeout(() => setMutedSuccess(false), 2500);
    } finally {
      setIsMuting(false);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden ${className}`}>
      {/* Header */}
      <div className="h-9 bg-slate-950/80 px-3 border-b border-slate-800 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <span className="font-extrabold text-xs text-slate-300 tracking-wide uppercase">
            Participants ({participants.length})
          </span>
          {raisedParticipants.length > 0 && (
            <span className="px-1.5 py-0.2 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-black border border-amber-500/40 flex items-center gap-0.5 animate-pulse">
              <span>✋</span>
              <span>{raisedParticipants.length}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {isCoach && raisedParticipants.length > 0 && onLowerAllHands && (
            <button
              type="button"
              onClick={onLowerAllHands}
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/70 border border-amber-700/50 hover:bg-amber-900 text-amber-300 transition-colors flex items-center gap-1"
              title="Lower all student hands"
            >
              <span>✋</span>
              <span>Lower All</span>
            </button>
          )}

          {isCoach && onMuteAll && (
            <button
              type="button"
              onClick={handleMuteAllClick}
              disabled={isMuting}
              className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all flex items-center gap-1 shadow-sm ${
                mutedSuccess
                  ? 'bg-emerald-600 text-white'
                  : 'bg-rose-950/70 border border-rose-700/50 hover:bg-rose-900 text-rose-300'
              }`}
              title="Mute all students in Zoom video meeting"
            >
              <span>{mutedSuccess ? '✓' : '🔇'}</span>
              <span>{mutedSuccess ? 'All Muted' : isMuting ? 'Muting…' : 'Mute All'}</span>
            </button>
          )}
        </div>
      </div>

      {/* Roster List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 text-xs">
        {participants.map((p) => {
          const isParticipantCoach = p.role === 'coach' || p.role === 'admin';

          return (
            <div
              key={p.userId}
              className={`flex items-center justify-between p-2 rounded-xl transition-all gap-2 ${
                p.raisedHand
                  ? 'bg-amber-500/10 hover:bg-amber-500/15 border-2 border-amber-500/70 shadow-lg shadow-amber-500/10'
                  : 'bg-slate-800/40 hover:bg-slate-850 border border-slate-750/50'
              }`}
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
                    {p.raisedHand && (
                      <span className="text-amber-400 text-xs animate-bounce" title="Hand Raised">✋</span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 block capitalize">
                    {isParticipantCoach ? '👑 Coach (Host)' : '🎓 Student'}
                  </span>
                  {p.raisedHand && isCoach && (
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => {
                          onToggleControl?.(p.userId, 'white');
                          onLowerHand?.(p.userId);
                        }}
                        className="px-1.5 py-0.5 rounded text-[9px] font-black bg-amber-400 hover:bg-amber-300 text-slate-950 shadow-sm"
                        title="Grant White & lower hand"
                      >
                        ⚪ White
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleControl?.(p.userId, 'black');
                          onLowerHand?.(p.userId);
                        }}
                        className="px-1.5 py-0.5 rounded text-[9px] font-black bg-slate-200 hover:bg-white text-slate-950 shadow-sm"
                        title="Grant Black & lower hand"
                      >
                        ⚫ Black
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onToggleControl?.(p.userId, 'both');
                          onLowerHand?.(p.userId);
                        }}
                        className="px-1.5 py-0.5 rounded text-[9px] font-black bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm"
                        title="Grant Both & lower hand"
                      >
                        ⚔️ Both
                      </button>
                      <button
                        type="button"
                        onClick={() => onLowerHand?.(p.userId)}
                        className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-700 hover:bg-rose-900/80 text-slate-300 hover:text-rose-200 transition-colors"
                        title="Lower student hand"
                      >
                        ✕ Lower
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Board Control Options (for Coach to assign White, Black, Both, or Off) */}
              {!isParticipantCoach && isCoach && (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-slate-400 font-bold">Control:</span>
                    <button
                      type="button"
                      data-testid="student-control-toggle"
                      onClick={() => {
                        if (p.hasBoardControl) {
                          onToggleControl?.(p.userId, 'none');
                        } else {
                          onToggleControl?.(p.userId, 'both');
                        }
                      }}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-black tracking-wider transition-all shadow-sm ${
                        p.hasBoardControl
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/40'
                          : 'bg-slate-700 hover:bg-slate-600 text-slate-300'
                      }`}
                      title={p.hasBoardControl ? 'Click to revoke board control (Turn OFF)' : 'Click to enable board control (Both colors)'}
                    >
                      {p.hasBoardControl ? 'ON' : 'OFF'}
                    </button>
                  </div>

                  {/* Color Selector Pills: White | Black | Both */}
                  {p.hasBoardControl && (
                    <div className="flex items-center bg-slate-950/90 p-0.5 rounded-lg border border-slate-750 gap-0.5 animate-in fade-in">
                      <button
                        type="button"
                        data-testid={`control-color-white-${p.userId}`}
                        title="Allow student to play White only (cannot play Black)"
                        onClick={() => onToggleControl?.(p.userId, 'white')}
                        className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded transition-colors flex items-center gap-0.5 ${
                          p.colorPermission === 'white'
                            ? 'bg-amber-400 text-slate-950 font-black shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>⚪</span> White
                      </button>
                      <button
                        type="button"
                        data-testid={`control-color-black-${p.userId}`}
                        title="Allow student to play Black only (cannot play White)"
                        onClick={() => onToggleControl?.(p.userId, 'black')}
                        className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded transition-colors flex items-center gap-0.5 ${
                          p.colorPermission === 'black'
                            ? 'bg-slate-200 text-slate-950 font-black shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span>⚫</span> Black
                      </button>
                      <button
                        type="button"
                        data-testid={`control-color-both-${p.userId}`}
                        title="Allow student to play Both colors"
                        onClick={() => onToggleControl?.(p.userId, 'both')}
                        className={`px-1.5 py-0.5 text-[9px] font-extrabold rounded transition-colors flex items-center gap-0.5 ${
                          p.colorPermission === 'both' || !p.colorPermission
                            ? 'bg-emerald-600 text-white font-black shadow-sm'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Both
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Student View: show assigned color badge */}
              {!isParticipantCoach && !isCoach && (
                <div className="shrink-0">
                  {p.colorPermission === 'white' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-amber-400/20 text-amber-300 border border-amber-400/30 flex items-center gap-1">
                      <span>⚪</span> White only
                    </span>
                  )}
                  {p.colorPermission === 'black' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-slate-300/20 text-slate-200 border border-slate-400/30 flex items-center gap-1">
                      <span>⚫</span> Black only
                    </span>
                  )}
                  {p.colorPermission === 'both' && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                      <span>⚔️</span> Both colors
                    </span>
                  )}
                  {(!p.colorPermission || p.colorPermission === 'none') && (
                    <span className="text-[10px] text-slate-500 font-semibold px-1.5 py-0.5">
                      View only
                    </span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
