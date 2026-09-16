'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase/client';

interface ClassroomWaitingRoomProps {
  classId: string;
  className: string;
  coachName: string;
  scheduledStart: string;
  durationMinutes: number;
  meetingUrl?: string;
}

export default function ClassroomWaitingRoom({
  classId,
  className,
  coachName,
  scheduledStart,
  durationMinutes,
  meetingUrl,
}: ClassroomWaitingRoomProps) {
  const router = useRouter();
  const [isLive, setIsLive] = useState(false);
  const [effectiveMeetUrl, setEffectiveMeetUrl] = useState(meetingUrl || '');

  // Realtime listeners + fast 2.5s polling check so join options reveal immediately without refresh
  useEffect(() => {
    let isMounted = true;
    const supabase = createSupabaseClient();

    const handleSessionStarted = (url?: string) => {
      if (!isMounted) return;
      setIsLive(true);
      if (url) setEffectiveMeetUrl(url);
      try {
        const { playChessSound } = require('@/utils/chessAudio');
        playChessSound('fanfare');
      } catch {}
      // Automatically refresh Next.js App Router to load live board
      router.refresh();
    };

    const channel = supabase
      .channel(`waiting-room:${classId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'live_sessions', filter: `class_id=eq.${classId}` },
        () => handleSessionStarted()
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'live_sessions', filter: `class_id=eq.${classId}` },
        (payload: any) => {
          if (payload.new?.status === 'active') {
            handleSessionStarted();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'classes', filter: `id=eq.${classId}` },
        (payload: any) => {
          if (payload.new && (payload.new.status === 'LIVE' || payload.new.status === 'IN_PROGRESS')) {
            handleSessionStarted(payload.new.zoom_join_url);
          }
        }
      )
      .on('broadcast', { event: 'SESSION_STARTED' }, (payload: any) => {
        handleSessionStarted(payload?.payload?.meetingUrl);
      })
      .subscribe();

    // 2.5s resilient background check so student screen updates even if WebSocket dropped
    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch(`/api/class-status/${classId}`, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.isLive) {
            handleSessionStarted(data.meetingUrl);
          }
        }
      } catch {}
    }, 2500);

    return () => {
      isMounted = false;
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [classId, router]);

  const hasMeetUrl = Boolean(effectiveMeetUrl && effectiveMeetUrl.trim().length > 0);
  const isGoogleMeet = Boolean(effectiveMeetUrl && effectiveMeetUrl.includes('meet.google.com'));

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white flex items-center justify-center p-6 text-center select-none font-sans">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto text-3xl transition-all ${
          isLive ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 scale-110' : 'bg-amber-500/10 border border-amber-500/20 text-amber-400 animate-pulse'
        }`}>
          {isLive ? '🟢' : '⏳'}
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
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Session Status:</span>
            <span className={`font-bold ${isLive ? 'text-emerald-400 font-extrabold animate-bounce' : 'text-amber-400 animate-pulse'}`}>
              {isLive ? '🟢 Class Started! Coach is Ready' : '⏳ Waiting for Coach to start…'}
            </span>
          </div>
        </div>

        {/* REVEAL JOIN OPTIONS IN REAL TIME WHEN COACH STARTS — HIDDEN UNTIL COACH JOINS */}
        {isLive ? (
          <div className="p-4 bg-emerald-950/60 border border-emerald-500/60 rounded-2xl space-y-3 text-left animate-in fade-in zoom-in duration-300">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-300 uppercase tracking-wide flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                Coach Has Joined & Started the Class!
              </span>
            </div>
            <p className="text-xs text-slate-300 leading-snug">
              Click below to enter the live interactive chessboard and video call right now.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => router.refresh()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs sm:text-sm tracking-wide shadow-xl shadow-emerald-950/60 flex items-center justify-center gap-2 cursor-pointer transition-all transform hover:scale-[1.01]"
              >
                <span>♟️</span>
                <span>ENTER LIVE CLASSROOM NOW</span>
              </button>

              {hasMeetUrl && (
                <a
                  href={effectiveMeetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-850 hover:bg-slate-800 border border-emerald-500/40 text-emerald-300 hover:text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <span>🎥</span>
                  <span>{isGoogleMeet ? 'Join Google Meet Video Call' : 'Open Video Call'}</span>
                </a>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-slate-400 leading-relaxed">
            Please wait. As soon as your coach joins and starts the session, the join option will appear on this screen automatically without needing to refresh!
          </p>
        )}

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
