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
  onMuteAllRef?: React.MutableRefObject<(() => Promise<boolean>) | null>;
  className?: string;
}

export default function ClassroomZoom({
  classId,
  zoomMeetingId,
  zoomPasscode = 'chesshub',
  userName,
  role,
  isCoach,
  onMuteAllRef,
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
  const [networkQuality, setNetworkQuality] = useState<'good' | 'poor'>('good');
  const [isDegradedAudioOnly, setIsDegradedAudioOnly] = useState(false);
  const [isMutingAll, setIsMutingAll] = useState(false);
  const [muteAllSuccess, setMuteAllSuccess] = useState(false);

  const [layoutMode, setLayoutMode] = useState<'gallery' | 'speaker'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('classroom_zoom_layout');
      if (saved === 'speaker' || saved === 'gallery') return saved;
    }
    return 'gallery';
  });

  // Wire coach Mute All ref for ClassroomShell and ClassroomParticipants
  useEffect(() => {
    if (onMuteAllRef) {
      onMuteAllRef.current = async () => {
        if (!zoomRef.current) return false;
        const res = await zoomRef.current.muteAll();
        if (res) {
          setMuteAllSuccess(true);
          setTimeout(() => setMuteAllSuccess(false), 2500);
        }
        return res;
      };
    }
    return () => {
      if (onMuteAllRef) onMuteAllRef.current = null;
    };
  }, [onMuteAllRef]);

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

  const handleSelectLayout = async (mode: 'gallery' | 'speaker') => {
    setLayoutMode(mode);
    try {
      localStorage.setItem('classroom_zoom_layout', mode);
      await zoomRef.current?.changeViewType(mode);
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
      if (nowOn && isDegradedAudioOnly) {
        setIsDegradedAudioOnly(false);
      }
    } else {
      setIsVideoOn((prev) => !prev);
    }
  };

  const handleMuteAll = async () => {
    if (!isCoach || !zoomRef.current) return;
    setIsMutingAll(true);
    try {
      const success = await zoomRef.current.muteAll();
      if (success) {
        setMuteAllSuccess(true);
        setTimeout(() => setMuteAllSuccess(false), 2500);
      }
    } finally {
      setIsMutingAll(false);
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
              className="px-2.5 py-0.5 rounded text-[10px] font-extrabold bg-blue-600 hover:bg-blue-500 text-white transition-colors flex items-center gap-1 shadow-sm"
              title="Open directly in Native Zoom App or Browser"
            >
              <span>↗️</span>
              <span>Zoom App</span>
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
        className={`flex-1 relative w-full h-full ${isMinimized ? 'hidden' : 'min-h-[140px]'} bg-slate-950 flex items-center justify-center overflow-hidden ${
          layoutMode === 'gallery' ? 'zoom-layout-gallery' : 'zoom-layout-speaker'
        }`}
        style={{
          display: isMinimized ? 'none' : undefined,
        }}
      >
        <div
          className="w-full h-full transition-transform duration-200"
          style={{
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
            onNetworkQualityChange={setNetworkQuality}
            className="w-full h-full"
          />
        </div>

        {/* Low-bandwidth alert banner with instant Audio-Only fallback button (Requirement A4) */}
        {networkQuality === 'poor' && (
          <div className="absolute top-2 left-2 right-2 z-30 text-[10px] text-amber-200 bg-amber-950/95 border border-amber-500/50 rounded-xl px-2.5 py-1.5 flex items-center justify-between shadow-2xl backdrop-blur-md">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
              <span className="truncate font-semibold">Slow Network Detected • Board & Audio Prioritized</span>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isVideoOn) handleToggleVideo();
                setIsDegradedAudioOnly(true);
              }}
              className="px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-500 text-white font-extrabold text-[10px] transition-all shrink-0 ml-2 shadow-sm"
              title="Prioritize Audio and Board moves by turning off camera video"
            >
              Audio Only
            </button>
          </div>
        )}

        {/* Floating Quick Media Controls Bar — Always unmirrored & prominent */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 px-3 py-1.5 bg-slate-900/95 border border-slate-700/90 rounded-full shadow-2xl backdrop-blur-md select-none pointer-events-auto">
          <button
            type="button"
            onClick={handleToggleMute}
            className={`px-3 py-1 rounded-full transition-all text-xs font-bold flex items-center gap-1.5 shadow-md ${
              isMuted
                ? 'bg-rose-600 hover:bg-rose-500 text-white animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isMuted ? 'Click to Unmute Microphone' : 'Click to Mute Microphone'}
          >
            <span>{isMuted ? '🔇' : '🎙️'}</span>
            <span className="text-[11px] font-mono font-bold">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>
          <button
            type="button"
            onClick={handleToggleVideo}
            className={`px-3 py-1 rounded-full transition-all text-xs font-bold flex items-center gap-1.5 shadow-md ${
              !isVideoOn
                ? 'bg-rose-600 hover:bg-rose-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
            title={isVideoOn ? 'Click to Stop Camera' : 'Click to Start Camera'}
          >
            <span>{isVideoOn ? '📹' : '🚫'}</span>
            <span className="text-[11px] font-mono font-bold">{isVideoOn ? 'Stop Video' : 'Start Video'}</span>
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

            {/* Coach Moderation: Mute All Button (Requirement A5) */}
            <button
              type="button"
              onClick={handleMuteAll}
              disabled={isMutingAll}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 shadow-sm ${
                muteAllSuccess
                  ? 'bg-emerald-600 text-white shadow-emerald-900/40'
                  : 'bg-rose-950/60 border border-rose-700/50 hover:bg-rose-900/80 text-rose-300'
              }`}
              title="Mute all students in Zoom meeting"
            >
              <span>{muteAllSuccess ? '✓' : '🔇'}</span>
              <span className="text-[10px]">{muteAllSuccess ? 'All Muted' : 'Mute All'}</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-1 text-[10px] font-semibold">
          <span className={networkQuality === 'good' ? 'text-emerald-400' : 'text-amber-400'}>●</span>
          <span className="text-slate-400">{networkQuality === 'good' ? 'HD' : 'Auto-Degraded'}</span>
        </div>
      </div>
    </div>
  );
}
