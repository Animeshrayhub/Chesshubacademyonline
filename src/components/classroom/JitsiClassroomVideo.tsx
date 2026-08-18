'use client';

import React, { useState, useEffect, useRef } from 'react';
import { getJitsiRoomName } from '@/lib/video';

interface JitsiClassroomVideoProps {
  classId: string;
  userName: string;
  role: 'admin' | 'coach' | 'student';
  isAudioMuted?: boolean;
  isVideoMuted?: boolean;
}

/**
 * Embeds Jitsi Meet INSIDE the ChessHub Academy classroom page.
 *
 * Room name is deterministic: chesshub-class-{classId}
 * So Coach, Student A, Student B, Student C all join the SAME Jitsi room.
 *
 * Does NOT redirect to meet.jit.si — video stays inside this page.
 * Does NOT affect the chessboard — completely separate React subtree.
 */
export default function JitsiClassroomVideo({
  classId,
  userName,
  role,
  isAudioMuted = false,
  isVideoMuted = false,
}: JitsiClassroomVideoProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Deterministic room name derived using central getJitsiRoomName helper
  const roomName = getJitsiRoomName(classId);
  const jitsiServer = (process.env.NEXT_PUBLIC_JITSI_SERVER || 'https://meet.jit.si').replace(/\/$/, '');


  // Build Jitsi URL with config params embedded in the fragment (#config.xxx)
  const encodedName = encodeURIComponent(userName);
  const iframeSrc = `${jitsiServer}/${roomName}#userInfo.displayName=${encodedName}&config.startWithAudioMuted=${isAudioMuted}&config.startWithVideoMuted=${isVideoMuted}&config.prejoinPageEnabled=false&config.subject=${encodeURIComponent('ChessHub Academy Live Class')}`;

  useEffect(() => {
    setLoaded(false);
    setLoadError(false);
  }, [classId]);

  const handleLoad = () => {
    setLoaded(true);
    setLoadError(false);
  };

  const handleError = () => {
    setLoadError(true);
  };

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-[#0a0a1a] border border-red-500/30 rounded-xl p-4 text-center gap-3">
        <span className="text-2xl">📡</span>
        <p className="text-sm font-bold text-red-300">Video connection failed. Please retry.</p>
        <p className="text-xs text-slate-500">The chessboard continues to work normally.</p>
        <button
          type="button"
          onClick={() => { setLoadError(false); setLoaded(false); }}
          className="px-4 py-2 bg-[#c84b31] hover:bg-[#d55339] text-white text-xs font-bold rounded-xl transition-all"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full flex flex-col bg-[#0a0a1a]" style={{ minHeight: '220px', height: '100%' }}>
      {/* Loading indicator */}
      {!loaded && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0a1a] gap-2">
          <div className="w-8 h-8 border-2 border-amber-400/40 border-t-amber-400 rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Connecting to video room…</p>
          <p className="text-[10px] text-slate-600 font-mono">{roomName}</p>
        </div>
      )}

      {/* Jitsi IFrame — embedded inside ChessHub Academy, never redirects externally */}
      <iframe
        ref={iframeRef}
        src={iframeSrc}
        allow="camera; microphone; fullscreen; display-capture; autoplay"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '220px',
          border: 'none',
          borderRadius: '8px',
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
        onLoad={handleLoad}
        onError={handleError}
        title={`ChessHub Live Class — ${roomName}`}
      />

      {/* Room info badge */}
      {loaded && (
        <div className="absolute top-2 left-2 z-20 px-2 py-0.5 bg-black/60 backdrop-blur rounded-lg border border-amber-500/20 flex items-center gap-1.5 pointer-events-none">
          <span className="text-[9px]">♟️</span>
          <span className="text-[9px] font-bold text-amber-400 uppercase tracking-wider">Live Video</span>
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
        </div>
      )}
    </div>
  );
}
