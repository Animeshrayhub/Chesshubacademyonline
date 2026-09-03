'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import ZoomClassroomVideo, { type ZoomClassroomVideoHandle } from '@/components/classroom/ZoomClassroomVideo';

interface ClassroomZoomProps {
  classId: string;
  zoomMeetingId: string;
  zoomPasscode?: string;
  userName: string;
  role: 'admin' | 'coach' | 'student';
  isCoach: boolean;
  className?: string;
}

export default function ClassroomZoom({
  classId,
  zoomMeetingId,
  zoomPasscode = 'chesshub',
  userName,
  role,
  isCoach,
  className = '',
}: ClassroomZoomProps) {
  const zoomRef = useRef<ZoomClassroomVideoHandle>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Simplified Permission Flow for Students
  const [showPreJoin, setShowPreJoin] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [camAllowed, setCamAllowed] = useState(true);
  const [micAllowed, setMicAllowed] = useState(true);

  const [layoutMode, setLayoutMode] = useState<'gallery' | 'speaker'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('classroom_zoom_layout');
      if (saved === 'speaker' || saved === 'gallery') return saved;
    }
    return 'gallery';
  });

  // Persistent browser permission check: If already granted, join directly without prompt
  useEffect(() => {
    if (isCoach) {
      setShowPreJoin(false);
      return;
    }

    let isMounted = true;

    async function checkExistingPermissions() {
      try {
        if (typeof navigator === 'undefined' || !navigator.permissions) {
          setShowPreJoin(false);
          return;
        }

        let camState = 'prompt';
        let micState = 'prompt';

        try {
          const cam = await navigator.permissions.query({ name: 'camera' as PermissionName });
          camState = cam.state;
        } catch {}

        try {
          const mic = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          micState = mic.state;
        } catch {}

        if (!isMounted) return;

        // If both already granted, student automatically initializes without prompt
        if (camState === 'granted' && micState === 'granted') {
          setShowPreJoin(false);
          setCamAllowed(true);
          setMicAllowed(true);
        } else if (camState === 'denied' || micState === 'denied') {
          // Previously denied: show simple recovery option
          setCamAllowed(camState === 'granted');
          setMicAllowed(micState === 'granted');
          setShowPreJoin(true);
        } else {
          // First time or prompt: show simple "Ready for class?"
          setShowPreJoin(true);
        }
      } catch {
        if (isMounted) setShowPreJoin(false);
      }
    }

    checkExistingPermissions();

    return () => {
      isMounted = false;
    };
  }, [isCoach]);

  const handleAllowAndJoin = useCallback(async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        // Release immediate device lock so Zoom SDK can cleanly bind to devices
        stream.getTracks().forEach((track) => track.stop());
      }
      setShowPreJoin(false);
      setCamAllowed(true);
      setMicAllowed(true);
      setIsVideoOn(true);
      setIsMuted(false);
    } catch (err: any) {
      console.warn('[Camera/Mic Permission Notice]', err);
      // Non-blocking: student can still enter class
      setCamAllowed(false);
      setMicAllowed(false);
      setIsVideoOn(false);
      setIsMuted(true);
      setPermissionError('Camera or Microphone was not granted. You can still join and turn them on anytime.');
    }
  }, []);

  const handleSelectLayout = (mode: 'gallery' | 'speaker') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('classroom_zoom_layout', mode);
    } catch {}
  };

  const handleToggleMute = async () => {
    if (zoomRef.current) {
      const nowMuted = await zoomRef.current.toggleMute();
      setIsMuted(nowMuted);
    } else {
      setIsMuted((prev) => !prev);
    }
  };

  const handleToggleVideo = async () => {
    if (zoomRef.current) {
      const nowOn = await zoomRef.current.toggleVideo();
      setIsVideoOn(nowOn);
    } else {
      setIsVideoOn((prev) => !prev);
    }
  };

  return (
    <div
      className={`relative bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col shadow-2xl transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50 bg-slate-950' : 'w-full h-full'
      } ${className}`}
    >
      {/* Header bar */}
      <div className="h-8 bg-slate-950/80 backdrop-blur-md px-3 border-b border-slate-800/80 flex items-center justify-between text-xs select-none">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-extrabold text-[11px] text-slate-300 tracking-wide">
            Zoom Live Conference
          </span>
          <span className="text-[10px] text-slate-500 font-mono">#{zoomMeetingId || 'Live'}</span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Coach-only: Gallery / Speaker Layout Selector */}
          {isCoach && (
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => handleSelectLayout('gallery')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  layoutMode === 'gallery'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Gallery Grid View"
              >
                👥 Gallery
              </button>
              <button
                type="button"
                onClick={() => handleSelectLayout('speaker')}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  layoutMode === 'speaker'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
                title="Active Speaker View"
              >
                👤 Speaker
              </button>
            </div>
          )}

          <button
            type="button"
            data-testid="zoom-minimize-btn"
            onClick={() => setIsMinimized((v) => !v)}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isMinimized ? 'Expand video area' : 'Minimize video area'}
          >
            {isMinimized ? 'Expand' : 'Minimize'}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsExpanded((v) => !v);
              if (isMinimized) setIsMinimized(false);
            }}
            className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            title={isExpanded ? 'Collapse view' : 'Maximize video'}
          >
            {isExpanded ? 'Collapse' : 'Full'}
          </button>
        </div>
      </div>

      {/* Main Video Element — Hidden via CSS when minimized, NEVER remounted */}
      <div
        className={`flex-1 relative w-full h-full ${isMinimized ? 'hidden' : 'min-h-[140px]'} bg-slate-950 flex items-center justify-center overflow-hidden ${
          layoutMode === 'gallery' ? 'zoom-layout-gallery' : 'zoom-layout-speaker'
        }`}
        style={isMinimized ? { display: 'none' } : undefined}
      >
        <ZoomClassroomVideo
          ref={zoomRef}
          classId={classId}
          meetingNumber={zoomMeetingId}
          passCode={zoomPasscode}
          userName={userName}
          role={isCoach ? 1 : 0}
          className="w-full h-full"
        />

        {/* Student "Ready for class?" Permission Screen */}
        {showPreJoin && !isCoach && (
          <div className="absolute inset-0 z-30 bg-slate-950/95 backdrop-blur-md flex flex-col items-center justify-center p-4 text-center select-none">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2.5 text-2xl">
              ♟️
            </div>
            <h3 className="text-base font-bold text-white mb-1">Ready for class?</h3>
            <p className="text-xs text-slate-400 mb-4 max-w-xs leading-relaxed">
              Enable your camera and microphone so your coach can see and hear you!
            </p>

            <div className="w-full max-w-[240px] space-y-2 mb-4">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                <span className="flex items-center gap-2 text-slate-300 font-semibold">
                  <span>📹</span> Camera
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    camAllowed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {camAllowed ? 'ON' : 'OFF'}
                </span>
              </div>

              <div className="flex items-center justify-between px-3 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                <span className="flex items-center gap-2 text-slate-300 font-semibold">
                  <span>🎙️</span> Microphone
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                    micAllowed ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                  }`}
                >
                  {micAllowed ? 'ON' : 'OFF'}
                </span>
              </div>
            </div>

            {permissionError && (
              <div className="mb-3 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2 max-w-xs leading-relaxed">
                {permissionError}
              </div>
            )}

            <div className="flex flex-col gap-2 w-full max-w-[240px]">
              <button
                type="button"
                onClick={handleAllowAndJoin}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg flex items-center justify-center gap-1.5"
              >
                <span>Allow & Join</span>
              </button>

              <button
                type="button"
                onClick={() => setShowPreJoin(false)}
                className="w-full py-1.5 text-slate-400 hover:text-slate-200 text-[11px] font-medium transition-colors"
              >
                Join class anyway →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mini control toolbar */}
      <div className="h-9 bg-slate-950/90 backdrop-blur-sm border-t border-slate-800 px-3 flex items-center justify-between">
        {/* Student view: Extremely simple, high-visibility controls */}
        {!isCoach ? (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleToggleVideo}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm ${
                isVideoOn
                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                  : 'bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
              }`}
              title={isVideoOn ? 'Camera is ON (click to turn OFF)' : 'Camera is OFF (click to turn ON)'}
            >
              <span>{isVideoOn ? '📹' : '🚫'}</span>
              <span className="text-[11px]">{isVideoOn ? 'Camera ON' : 'Camera OFF'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleMute}
              className={`px-3 py-1 rounded-lg text-xs font-extrabold transition-all flex items-center gap-1.5 shadow-sm ${
                !isMuted
                  ? 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30'
                  : 'bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
              }`}
              title={!isMuted ? 'Mic is ON (click to mute)' : 'Mic is OFF (click to unmute)'}
            >
              <span>{!isMuted ? '🎙️' : '🔇'}</span>
              <span className="text-[11px]">{!isMuted ? 'Mic ON' : 'Mic OFF'}</span>
            </button>
          </div>
        ) : (
          /* Coach view: Full controls */
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleToggleMute}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                isMuted
                  ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <span>{isMuted ? '🔇' : '🎙️'}</span>
              <span className="text-[10px]">{isMuted ? 'Unmute' : 'Mute'}</span>
            </button>

            <button
              type="button"
              onClick={handleToggleVideo}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                !isVideoOn
                  ? 'bg-rose-500/20 border border-rose-500/30 text-rose-300 hover:bg-rose-500/30'
                  : 'bg-slate-800 border border-slate-700 text-slate-200 hover:bg-slate-700'
              }`}
            >
              <span>{isVideoOn ? '📹' : '🚫'}</span>
              <span className="text-[10px]">{isVideoOn ? 'Camera' : 'Start Video'}</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-semibold">
          <span className="text-emerald-400">●</span> HD
        </div>
      </div>
    </div>
  );
}
