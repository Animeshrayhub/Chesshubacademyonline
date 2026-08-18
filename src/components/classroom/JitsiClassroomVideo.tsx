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

declare global {
  interface Window {
    JitsiMeetExternalAPI?: any;
  }
}

/**
 * Embeds Jitsi Meet INSIDE the ChessHub Academy classroom page using JitsiMeetExternalAPI.
 *
 * Configured with:
 * - disableDeepLinking: true (prevents mobile 'Join in app' / jitsi:// handoffs)
 * - prejoinConfig: { enabled: false } & prejoinPageEnabled: false (bypasses prejoin landing screen)
 * - enableWelcomePage: false
 * - userInfo.displayName: userName (passes ChessHub display name)
 * - Room name: chesshub-class-{classId} (deterministic single room per class)
 */
export default function JitsiClassroomVideo({
  classId,
  userName,
  role,
  isAudioMuted = false,
  isVideoMuted = false,
}: JitsiClassroomVideoProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const jitsiApiRef = useRef<any>(null);
  const [loadError, setLoadError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  // Deterministic room name derived using central getJitsiRoomName helper
  const roomName = getJitsiRoomName(classId);
  const jitsiServer = (process.env.NEXT_PUBLIC_JITSI_SERVER || 'https://meet.jit.si').replace(/\/$/, '');
  const domain = jitsiServer.replace(/^https?:\/\//, '');

  useEffect(() => {
    let isMounted = true;
    setLoaded(false);
    setLoadError(false);

    const initJitsi = () => {
      if (!containerRef.current) return;

      // Dispose any existing instance
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (e) {
          console.warn('Error disposing previous Jitsi instance:', e);
        }
        jitsiApiRef.current = null;
      }
      containerRef.current.innerHTML = '';

      try {
        const options = {
          roomName: roomName,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          configOverwrite: {
            disableDeepLinking: true,
            prejoinConfig: { enabled: false },
            prejoinPageEnabled: false,
            enableWelcomePage: false,
            startWithAudioMuted: isAudioMuted,
            startWithVideoMuted: isVideoMuted,
            subject: 'ChessHub Academy Live Class',
          },
          interfaceConfigOverwrite: {
            MOBILE_APP_PROMO: false,
            HIDE_DEEP_LINKING_IMAGE: true,
            SHOW_JITSI_WATERMARK: false,
          },
          userInfo: {
            displayName: userName,
          },
        };

        const api = new window.JitsiMeetExternalAPI(domain, options);
        jitsiApiRef.current = api;

        api.addEventListener('videoConferenceJoined', () => {
          if (isMounted) setLoaded(true);
        });

        // Safety fallback timer to mark loaded if event is delayed
        setTimeout(() => {
          if (isMounted) setLoaded(true);
        }, 2000);

      } catch (err) {
        console.error('Failed to initialize JitsiMeetExternalAPI:', err);
        if (isMounted) setLoadError(true);
      }
    };

    if (typeof window !== 'undefined') {
      if (window.JitsiMeetExternalAPI) {
        initJitsi();
      } else {
        const scriptId = 'jitsi-external-api-script';
        let script = document.getElementById(scriptId) as HTMLScriptElement;

        if (!script) {
          script = document.createElement('script');
          script.id = scriptId;
          script.src = `${jitsiServer}/external_api.js`;
          script.async = true;
          document.body.appendChild(script);
        }

        const handleScriptLoad = () => {
          if (isMounted) initJitsi();
        };
        const handleScriptError = () => {
          if (isMounted) setLoadError(true);
        };

        script.addEventListener('load', handleScriptLoad);
        script.addEventListener('error', handleScriptError);

        if (window.JitsiMeetExternalAPI) {
          initJitsi();
        }
      }
    }

    return () => {
      isMounted = false;
      if (jitsiApiRef.current) {
        try {
          jitsiApiRef.current.dispose();
        } catch (e) {}
        jitsiApiRef.current = null;
      }
    };
  }, [classId, domain, isAudioMuted, isVideoMuted, jitsiServer, roomName, userName]);

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[200px] bg-[#0a0a1a] border border-red-500/30 rounded-xl p-4 text-center gap-3">
        <span className="text-2xl">📡</span>
        <p className="text-sm font-bold text-red-300">Unable to connect to the classroom video.</p>
        <p className="text-xs text-slate-500">The chessboard continues to work normally.</p>
        <button
          type="button"
          onClick={() => { setLoadError(false); setLoaded(false); }}
          className="px-4 py-2 bg-[#c84b31] hover:bg-[#d55339] text-white text-xs font-bold rounded-xl transition-all"
        >
          Retry
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

      {/* Jitsi IFrame API Container */}
      <div
        ref={containerRef}
        className="w-full h-full min-h-[220px] rounded-lg overflow-hidden"
        style={{
          opacity: loaded ? 1 : 0,
          transition: 'opacity 0.3s ease',
        }}
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

