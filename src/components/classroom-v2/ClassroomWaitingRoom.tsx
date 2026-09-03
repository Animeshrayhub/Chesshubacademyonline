'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

interface ClassroomWaitingRoomProps {
  classId: string;
  className: string;
  coachName: string;
  scheduledStart: string;
  durationMinutes: number;
}

export default function ClassroomWaitingRoom({
  classId,
  className,
  coachName,
  scheduledStart,
  durationMinutes,
}: ClassroomWaitingRoomProps) {
  const router = useRouter();

  // Listen in realtime for when the Coach starts the live session
  useEffect(() => {
    const supabase = createSupabaseClient();
    const channel = supabase
      .channel(`waiting-room:${classId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_sessions', filter: `class_id=eq.${classId}` },
        () => {
          router.refresh();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'classes', filter: `id=eq.${classId}` },
        (payload: any) => {
          if (payload.new && (payload.new.status === 'LIVE' || payload.new.status === 'IN_PROGRESS')) {
            router.refresh();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [classId, router]);

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-6 text-center select-none font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto text-3xl animate-pulse">
          ⏳
        </div>

        <div>
          <h2 className="text-xl font-bold font-heading mb-1">{className}</h2>
          <p className="text-xs text-slate-400">With {coachName}</p>
        </div>

        <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-2xl space-y-2 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Scheduled Time:</span>
            <span className="font-bold text-slate-200">
              {new Date(scheduledStart).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Duration:</span>
            <span className="font-bold text-slate-200">{durationMinutes} Minutes</span>
          </div>
          <div className="flex items-center justify-between text-slate-400">
            <span>Live Session Status:</span>
            <span className="font-bold text-amber-400 animate-pulse">Waiting for Coach…</span>
          </div>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Your coach has not yet started this live classroom. Please wait; you will enter automatically when the session goes live!
        </p>

        <a
          href="/dashboard/student/classes"
          className="inline-block py-2.5 px-6 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all shadow-md"
        >
          Return to My Classes
        </a>
      </div>
    </div>
  );
}
