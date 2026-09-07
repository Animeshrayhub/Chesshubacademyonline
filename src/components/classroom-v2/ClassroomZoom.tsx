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
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [permissionError, setPermissionError] = useState<string | null>(null);
  const [camAllowed, setCamAllowed] = useState(false);
  const [micAllowed, setMicAllowed] = useState(false);
  const [isMirrored, setIsMirrored] = useState(false);

  const [layoutMode, setLayoutMode] = useState<'gallery' | 'speaker'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('classroom_zoom_layout');
      if (saved === 'speaker' || saved === 'gallery') return saved;
    }
    return 'gallery';
  });

  // Request browser media permissions cleanly and non-blockingly on mount
  useEffect(() => {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: true, audio: true })
        .then((stream) => {
          stream.getTracks().forEach((track) => track.stop());
          setCamAllowed(true);
          setMicAllowed(true);
          setPermissionError(null);
        })
        .catch((err: any) => {
          console.warn('[Camera/Mic Permission Notice]', err?.message);
          setCamAllowed(false);
          setMicAllowed(false);
          setPermissionError(
            'Camera or Microphone was blocked by your browser. Click the lock icon in your address bar to enable, or continue in class.'
          );
        });
    }
  }, []);

  const handleMediaStatusChange = useCallback((status: { isVideoOn: boolean; isMuted: boolean }) => {
    setIsVideoOn(status.isVideoOn);
    setIsMuted(status.isMuted);
    setCamAllowed(status.isVideoOn);
    setMicAllowed(!status.isMuted);
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
            onClick={() => setIsMirrored((v) => !v)}
            className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
              isMirrored ? 'bg-indigo-600 text-white shadow-sm' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
            }`}
            title={isMirrored ? 'Disable Mirror (Show as-is)' : 'Flip Mirror Camera (Fix backward text/logos)'}
          >
            🪞 {isMirrored ? 'Mirrored' : 'Normal'}
          </button>

          {zoomMeetingId && (
            <a
              href={`https://zoom.us/j/${zoomMeetingId.replace(/[^0-9]/g, '')}?pwd=${zoomPasscode}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1 shadow-sm"
              title="Open in Native Zoom App or Browser"
            >
              <span>↗️</span>
              <span className="hidden sm:inline">Zoom App</span>
            </a>
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
        className={`flex-1 relative w-full h-full ${isMinimized ? 'hidden' : 'min-h-[140px]'} bg-slate-950 flex items-center justify-center overflow-hidden transition-transform duration-200 ${
          layoutMode === 'gallery' ? 'zoom-layout-gallery' : 'zoom-layout-speaker'
        }`}
        style={{
          display: isMinimized ? 'none' : undefined,
          transform: isMirrored ? 'scaleX(-1)' : 'scaleX(1)',
        }}
      >
        <ZoomClassroomVideo
          ref={zoomRef}
          classId={classId}
          meetingNumber={zoomMeetingId}
          passCode={zoomPasscode}
          userName={userName}
          role={isCoach ? 1 : 0}
          onMediaStatusChange={handleMediaStatusChange}
          className="w-full h-full"
        />

        {/* Floating Quick Media Controls Bar */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-2.5 py-1 bg-slate-900/90 border border-slate-700/80 rounded-full shadow-2xl backdrop-blur-md select-none pointer-events-auto">
          <button
            type="button"
            onClick={handleToggleMute}
            className={`px-2.5 py-1 rounded-full transition-all text-xs font-bold flex items-center gap-1 shadow-sm ${
              isMuted ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
          >
            <span>{isMuted ? '🔇' : '🎙️'}</span>
            <span className="text-[10px] font-mono">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button
            type="button"
            onClick={handleToggleVideo}
            className={`px-2.5 py-1 rounded-full transition-all text-xs font-bold flex items-center gap-1 shadow-sm ${
              !isVideoOn ? 'bg-rose-600 hover:bg-rose-500 text-white' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
            }`}
            title={isVideoOn ? 'Stop Camera' : 'Start Camera'}
          >
            <span>{isVideoOn ? '📹' : '🚫'}</span>
            <span className="text-[10px] font-mono">{isVideoOn ? 'Stop' : 'Start'}</span>
          </button>
        </div>

        {/* Non-blocking permission notification if blocked by browser */}
        {permissionError && (
          <div className="absolute top-2 left-2 right-2 z-30 text-[11px] text-amber-200 bg-amber-950/90 border border-amber-500/40 rounded-xl px-3 py-1.5 flex items-center justify-between shadow-xl backdrop-blur-sm">
            <span className="leading-snug">⚠️ {permissionError}</span>
            <button
              type="button"
              onClick={() => setPermissionError(null)}
              className="text-amber-400 hover:text-white ml-2 text-xs font-bold"
              aria-label="Dismiss"
            >
              ✕
            </button>
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
